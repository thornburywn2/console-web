/**
 * MCP Manager Service
 * Manages MCP server lifecycle, connections, health checks, and tool discovery
 * Supports stdio, SSE, and WebSocket transports
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class MCPManager extends EventEmitter {
  constructor(prisma, io) {
    super();
    this.prisma = prisma;
    this.io = io;
    this.servers = new Map(); // serverId -> { process, transport, status }
    this.healthCheckInterval = null;
    this.HEALTH_CHECK_INTERVAL = 60000; // 60 seconds
  }

  /**
   * Initialize MCP manager - load and start enabled servers
   */
  async initialize() {
    console.log('[MCPManager] Initializing...');

    // Load enabled servers from database
    const servers = await this.prisma.mCPServer.findMany({
      where: { enabled: true }
    });

    // Start each server
    for (const server of servers) {
      try {
        await this.startServer(server.id);
      } catch (error) {
        console.error(`[MCPManager] Failed to start server ${server.name}:`, error.message);
      }
    }

    // Start health check interval
    this.startHealthChecks();

    console.log(`[MCPManager] Initialized with ${servers.length} servers`);
  }

  /**
   * Start health check polling
   */
  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllServersHealth();
    }, this.HEALTH_CHECK_INTERVAL);

    // Initial check
    this.checkAllServersHealth();
  }

  /**
   * Check health of all running servers
   */
  async checkAllServersHealth() {
    const serverIds = Array.from(this.servers.keys());

    for (const serverId of serverIds) {
      try {
        await this.checkServerHealth(serverId);
      } catch (error) {
        console.error(`[MCPManager] Health check failed for ${serverId}:`, error.message);
      }
    }
  }

  /**
   * Check health of a specific server
   */
  async checkServerHealth(serverId) {
    const serverState = this.servers.get(serverId);
    if (!serverState) return;

    const { process: proc, transport } = serverState;
    let isHealthy = false;

    if (transport === 'STDIO' && proc) {
      isHealthy = !proc.killed && proc.exitCode === null;
    } else if (transport === 'SSE' || transport === 'WEBSOCKET') {
      // For HTTP-based transports, we'd ping the endpoint
      // For now, mark as healthy if we have a URL configured
      isHealthy = true;
    }

    // Update database
    const newStatus = isHealthy ? 'CONNECTED' : 'ERROR';
    await this.prisma.mCPServer.update({
      where: { id: serverId },
      data: {
        status: newStatus,
        lastChecked: new Date()
      }
    });

    // Emit status change
    if (serverState.lastStatus !== newStatus) {
      serverState.lastStatus = newStatus;
      this.io.emit('mcp-status-change', { serverId, status: newStatus });
    }
  }

  /**
   * Start an MCP server by ID
   */
  async startServer(serverId) {
    const server = await this.prisma.mCPServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Stop if already running
    if (this.servers.has(serverId)) {
      await this.stopServer(serverId);
    }

    console.log(`[MCPManager] Starting server: ${server.name} (${server.transport})`);

    let serverState = {
      transport: server.transport,
      status: 'CONNECTING',
      lastStatus: 'DISCONNECTED',
      process: null,
      buffer: ''
    };

    try {
      if (server.transport === 'STDIO') {
        // Spawn the MCP server process
        const proc = spawn(server.command, server.args || [], {
          env: { ...process.env, ...(server.env || {}) },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        serverState.process = proc;

        // Handle stdout (JSON-RPC messages)
        proc.stdout.on('data', (data) => {
          serverState.buffer += data.toString();
          this.processMessages(serverId, serverState);
        });

        // Handle stderr (logs)
        proc.stderr.on('data', (data) => {
          console.log(`[MCP:${server.name}] ${data.toString()}`);
        });

        // Handle process exit
        proc.on('exit', async (code, signal) => {
          console.log(`[MCPManager] Server ${server.name} exited with code ${code}`);

          await this.prisma.mCPServer.update({
            where: { id: serverId },
            data: { status: code === 0 ? 'DISCONNECTED' : 'ERROR' }
          });

          this.servers.delete(serverId);
          this.io.emit('mcp-status-change', { serverId, status: 'DISCONNECTED' });
        });

        proc.on('error', async (error) => {
          console.error(`[MCPManager] Server ${server.name} error:`, error);

          await this.prisma.mCPServer.update({
            where: { id: serverId },
            data: { status: 'ERROR' }
          });

          this.io.emit('mcp-status-change', { serverId, status: 'ERROR', error: error.message });
        });

        // Send initialize request
        await this.sendRequest(serverId, 'initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'command-portal',
            version: '2.3.1'
          }
        });

      } else if (server.transport === 'SSE' || server.transport === 'WEBSOCKET') {
        // For HTTP-based transports, just mark as ready to connect
        serverState.url = server.url;
        serverState.headers = server.headers || {};
      }

      this.servers.set(serverId, serverState);

      // Update database status
      await this.prisma.mCPServer.update({
        where: { id: serverId },
        data: {
          status: 'CONNECTED',
          lastConnected: new Date()
        }
      });

      // Discover tools
      await this.discoverTools(serverId);

      this.io.emit('mcp-status-change', { serverId, status: 'CONNECTED' });

      return true;
    } catch (error) {
      console.error(`[MCPManager] Failed to start server ${server.name}:`, error);

      await this.prisma.mCPServer.update({
        where: { id: serverId },
        data: { status: 'ERROR' }
      });

      this.io.emit('mcp-status-change', { serverId, status: 'ERROR', error: error.message });
      throw error;
    }
  }

  /**
   * Process incoming JSON-RPC messages from stdio
   */
  processMessages(serverId, serverState) {
    const lines = serverState.buffer.split('\n');
    serverState.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        this.handleMessage(serverId, message);
      } catch (e) {
        // Not valid JSON, might be partial message
      }
    }
  }

  /**
   * Handle incoming JSON-RPC message
   */
  handleMessage(serverId, message) {
    if (message.result !== undefined) {
      // Response to our request
      this.emit(`response:${serverId}:${message.id}`, message);
    } else if (message.method) {
      // Notification or request from server
      this.emit(`notification:${serverId}`, message);
    }
  }

  /**
   * Send JSON-RPC request to server
   */
  async sendRequest(serverId, method, params = {}) {
    const serverState = this.servers.get(serverId);
    if (!serverState) {
      throw new Error(`Server ${serverId} not running`);
    }

    const id = Date.now();
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeAllListeners(`response:${serverId}:${id}`);
        reject(new Error('Request timeout'));
      }, 30000);

      this.once(`response:${serverId}:${id}`, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error.message || 'Unknown error'));
        } else {
          resolve(response.result);
        }
      });

      if (serverState.transport === 'STDIO' && serverState.process) {
        serverState.process.stdin.write(JSON.stringify(request) + '\n');
      } else {
        // HTTP-based transports would use fetch here
        reject(new Error('HTTP transport not fully implemented'));
      }
    });
  }

  /**
   * Stop an MCP server
   */
  async stopServer(serverId) {
    const serverState = this.servers.get(serverId);
    if (!serverState) return;

    console.log(`[MCPManager] Stopping server: ${serverId}`);

    if (serverState.process) {
      serverState.process.kill('SIGTERM');
    }

    this.servers.delete(serverId);

    await this.prisma.mCPServer.update({
      where: { id: serverId },
      data: { status: 'DISCONNECTED' }
    });

    this.io.emit('mcp-status-change', { serverId, status: 'DISCONNECTED' });
  }

  /**
   * Restart an MCP server
   */
  async restartServer(serverId) {
    await this.stopServer(serverId);
    await this.startServer(serverId);
  }

  /**
   * Discover tools from an MCP server
   */
  async discoverTools(serverId) {
    const serverState = this.servers.get(serverId);
    if (!serverState) return [];

    try {
      const result = await this.sendRequest(serverId, 'tools/list', {});
      const tools = result.tools || [];

      // Clear existing tools
      await this.prisma.mCPTool.deleteMany({
        where: { serverId }
      });

      // Store discovered tools
      for (const tool of tools) {
        await this.prisma.mCPTool.create({
          data: {
            serverId,
            name: tool.name,
            description: tool.description || null,
            inputSchema: tool.inputSchema || {}
          }
        });
      }

      console.log(`[MCPManager] Discovered ${tools.length} tools for server ${serverId}`);
      this.io.emit('mcp-tools-updated', { serverId, count: tools.length });

      return tools;
    } catch (error) {
      console.error(`[MCPManager] Tool discovery failed for ${serverId}:`, error.message);
      return [];
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverId, toolName, args = {}) {
    const startTime = Date.now();
    let success = false;
    let result = null;
    let error = null;

    try {
      result = await this.sendRequest(serverId, 'tools/call', {
        name: toolName,
        arguments: args
      });
      success = true;
    } catch (err) {
      error = err.message;
    }

    const duration = Date.now() - startTime;

    // Log the tool call
    await this.prisma.mCPToolLog.create({
      data: {
        toolId: await this.getToolId(serverId, toolName),
        input: args,
        output: result,
        success,
        error,
        duration
      }
    });

    if (!success) {
      throw new Error(error);
    }

    return result;
  }

  /**
   * Get tool ID by server and name
   */
  async getToolId(serverId, toolName) {
    const tool = await this.prisma.mCPTool.findFirst({
      where: { serverId, name: toolName }
    });
    return tool?.id || null;
  }

  /**
   * Get status of all servers
   */
  getStatus() {
    const status = {};

    for (const [serverId, state] of this.servers.entries()) {
      status[serverId] = {
        transport: state.transport,
        status: state.lastStatus,
        running: state.process ? !state.process.killed : false
      };
    }

    return status;
  }

  /**
   * Get all servers with their current status
   */
  async getAllServers() {
    const servers = await this.prisma.mCPServer.findMany({
      include: {
        tools: true,
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { enabled: 'desc' },
        { name: 'asc' }
      ]
    });

    // Enrich with runtime status
    return servers.map(server => ({
      ...server,
      isRunning: this.servers.has(server.id)
    }));
  }

  /**
   * Reload a server's configuration
   */
  async reloadServer(serverId) {
    const server = await this.prisma.mCPServer.findUnique({
      where: { id: serverId }
    });

    if (!server) return;

    if (server.enabled) {
      await this.restartServer(serverId);
    } else {
      await this.stopServer(serverId);
    }
  }

  /**
   * Shutdown manager - stop all servers
   */
  async shutdown() {
    console.log('[MCPManager] Shutting down...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const serverIds = Array.from(this.servers.keys());
    for (const serverId of serverIds) {
      await this.stopServer(serverId);
    }

    console.log('[MCPManager] Shutdown complete');
  }
}

export default MCPManager;

/**
 * Agent Runner Service
 * Manages background agent processes using child_process.fork()
 *
 * Features:
 * - Spawn agents as isolated child processes
 * - Real-time output streaming via WebSocket
 * - Full terminal session access for agents
 * - Event-driven triggering (git, file, session, system events)
 * - Concurrent agent limit (5 max)
 */

import { fork, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'chokidar';
import { createLogger } from './logger.js';

const log = createLogger('agent-runner');
const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_CONCURRENT_AGENTS = 5;

export class AgentRunner extends EventEmitter {
  constructor(prisma, io, sessions) {
    super();
    this.prisma = prisma;
    this.io = io;
    this.sessions = sessions; // Map of terminal sessions from main server
    this.runningAgents = new Map(); // agentId -> { process, executionId, startedAt }
    this.fileWatchers = new Map(); // projectPath -> chokidar watcher
    this.eventSubscriptions = new Map(); // eventType -> Set of agentIds
  }

  /**
   * Initialize agent runner and set up event listeners
   */
  async initialize() {
    log.info('initializing agent runner service');

    // Load all enabled agents and set up their triggers
    const agents = await this.prisma.agent.findMany({
      where: { enabled: true },
      include: { project: true }
    });

    for (const agent of agents) {
      await this.setupAgentTriggers(agent);
    }

    log.info({ agentCount: agents.length }, 'agent runner initialized');
  }

  /**
   * Set up event triggers for an agent
   */
  async setupAgentTriggers(agent) {
    const { id, triggerType, triggerConfig, projectId } = agent;

    // Subscribe to event type
    if (!this.eventSubscriptions.has(triggerType)) {
      this.eventSubscriptions.set(triggerType, new Set());
    }
    this.eventSubscriptions.get(triggerType).add(id);

    // Set up file watcher if needed
    if (triggerType === 'FILE_CHANGE' && projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (project?.path) {
        this.setupFileWatcher(project.path, id, triggerConfig);
      }
    }
  }

  /**
   * Set up file watcher for FILE_CHANGE triggers
   */
  setupFileWatcher(projectPath, agentId, config) {
    const globPattern = config?.pattern || '**/*';
    const watchPath = join(projectPath, globPattern);

    // Reuse existing watcher or create new one
    if (!this.fileWatchers.has(projectPath)) {
      const watcher = watch(projectPath, {
        ignored: /(^|[/\\])\..|(node_modules|\.git)/,
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('all', (event, path) => {
        this.handleFileEvent(projectPath, event, path);
      });

      this.fileWatchers.set(projectPath, { watcher, agents: new Set() });
    }

    this.fileWatchers.get(projectPath).agents.add(agentId);
  }

  /**
   * Handle file change events
   */
  async handleFileEvent(projectPath, event, filePath) {
    const watcherData = this.fileWatchers.get(projectPath);
    if (!watcherData) return;

    for (const agentId of watcherData.agents) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
        include: { project: true }
      });

      if (!agent?.enabled) continue;

      // Check if file matches pattern
      const config = agent.triggerConfig || {};
      const pattern = config.pattern || '**/*';

      // Simple glob matching (could be enhanced with minimatch)
      if (this.matchesGlob(filePath, pattern, projectPath)) {
        await this.triggerAgent(agent, {
          event: 'FILE_CHANGE',
          fileEvent: event,
          filePath,
          projectPath
        });
      }
    }
  }

  /**
   * Simple glob pattern matching
   */
  matchesGlob(filePath, pattern, basePath) {
    // Normalize paths
    const relativePath = filePath.replace(basePath, '').replace(/^\//, '');

    // Handle common patterns
    if (pattern === '**/*') return true;
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      return relativePath.endsWith(ext);
    }
    if (pattern.includes('**')) {
      const parts = pattern.split('**');
      return parts.every(part => !part || relativePath.includes(part.replace(/\*/g, '')));
    }

    return relativePath.includes(pattern.replace(/\*/g, ''));
  }

  /**
   * Emit an event that agents can respond to
   */
  async emitAgentEvent(eventType, payload = {}) {
    const subscribedAgents = this.eventSubscriptions.get(eventType);
    if (!subscribedAgents?.size) return;

    for (const agentId of subscribedAgents) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
        include: { project: true }
      });

      if (agent?.enabled) {
        await this.triggerAgent(agent, { event: eventType, ...payload });
      }
    }
  }

  /**
   * Trigger an agent to run
   */
  async triggerAgent(agent, context = {}) {
    // Check concurrent limit
    if (this.runningAgents.size >= MAX_CONCURRENT_AGENTS) {
      log.info({ agentName: agent.name, maxConcurrent: MAX_CONCURRENT_AGENTS }, 'agent skipped: max concurrent agents reached');
      return null;
    }

    // Check if agent is already running
    if (this.runningAgents.has(agent.id)) {
      log.info({ agentName: agent.name }, 'agent already running');
      return null;
    }

    log.info({ agentName: agent.name, agentId: agent.id }, 'triggering agent');

    // Create execution record
    const execution = await this.prisma.agentExecution.create({
      data: {
        agentId: agent.id,
        status: 'RUNNING'
      }
    });

    // Emit status update
    this.io.emit('agent:status', {
      agentId: agent.id,
      executionId: execution.id,
      status: 'RUNNING',
      startedAt: execution.startedAt
    });

    // Execute agent actions
    try {
      const output = await this.executeAgentActions(agent, context, execution.id);

      // Update execution record
      await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          output,
          endedAt: new Date()
        }
      });

      // Emit completion
      this.io.emit('agent:status', {
        agentId: agent.id,
        executionId: execution.id,
        status: 'COMPLETED',
        endedAt: new Date()
      });

      return execution;
    } catch (error) {
      // Update execution with error
      await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: error.message,
          endedAt: new Date()
        }
      });

      // Emit failure
      this.io.emit('agent:status', {
        agentId: agent.id,
        executionId: execution.id,
        status: 'FAILED',
        error: error.message,
        endedAt: new Date()
      });

      log.error({ error: error.message, agentName: agent.name, agentId: agent.id }, 'agent execution failed');
      return null;
    } finally {
      this.runningAgents.delete(agent.id);
    }
  }

  /**
   * Execute agent actions sequentially with granular event streaming
   */
  async executeAgentActions(agent, context, executionId) {
    const actions = agent.actions || [];
    const outputs = [];
    const actionResults = [];
    const projectPath = agent.project?.path || process.cwd();

    // Mark agent as running
    this.runningAgents.set(agent.id, {
      executionId,
      startedAt: new Date(),
      currentActionIndex: 0,
      totalActions: actions.length
    });

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const actionId = `${executionId}-action-${i}`;
      const actionStartedAt = new Date();

      // Update current action index
      this.runningAgents.get(agent.id).currentActionIndex = i;

      // Emit action start event
      this.io.emit('agent:action-start', {
        agentId: agent.id,
        executionId,
        actionId,
        actionIndex: i,
        actionType: action.type,
        actionConfig: this.sanitizeActionConfig(action.config),
        totalActions: actions.length,
        startedAt: actionStartedAt.toISOString()
      });

      try {
        const actionOutput = await this.executeAction(action, projectPath, context, executionId, (chunk) => {
          // Stream output chunks in real-time
          this.io.emit('agent:action-output', {
            agentId: agent.id,
            executionId,
            actionId,
            actionIndex: i,
            chunk,
            timestamp: new Date().toISOString()
          });
        });

        outputs.push(actionOutput);
        const actionEndedAt = new Date();
        const duration = actionEndedAt - actionStartedAt;

        // Record action result
        const actionResult = {
          actionId,
          actionIndex: i,
          actionType: action.type,
          status: 'COMPLETED',
          output: actionOutput,
          startedAt: actionStartedAt.toISOString(),
          endedAt: actionEndedAt.toISOString(),
          duration
        };
        actionResults.push(actionResult);

        // Emit action complete event
        this.io.emit('agent:action-complete', {
          agentId: agent.id,
          executionId,
          actionId,
          actionIndex: i,
          actionType: action.type,
          status: 'COMPLETED',
          output: actionOutput,
          duration,
          endedAt: actionEndedAt.toISOString()
        });

        // Legacy event for backward compatibility
        this.io.emit('agent:output', {
          agentId: agent.id,
          executionId,
          actionIndex: i,
          output: actionOutput
        });

      } catch (actionError) {
        const actionEndedAt = new Date();
        const duration = actionEndedAt - actionStartedAt;

        // Record failed action
        const actionResult = {
          actionId,
          actionIndex: i,
          actionType: action.type,
          status: 'FAILED',
          error: actionError.message,
          startedAt: actionStartedAt.toISOString(),
          endedAt: actionEndedAt.toISOString(),
          duration
        };
        actionResults.push(actionResult);

        // Emit action error event
        this.io.emit('agent:action-error', {
          agentId: agent.id,
          executionId,
          actionId,
          actionIndex: i,
          actionType: action.type,
          status: 'FAILED',
          error: actionError.message,
          duration,
          endedAt: actionEndedAt.toISOString()
        });

        // Continue to next action (log and continue as per original spec)
        outputs.push(`Error in action ${i}: ${actionError.message}`);
        log.error({ error: actionError.message, actionIndex: i, agentId: agent.id }, 'action execution failed');
      }
    }

    // Store action results in execution metadata
    await this.prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        triggerContext: {
          ...(context || {}),
          actionResults
        }
      }
    });

    return outputs.join('\n\n');
  }

  /**
   * Sanitize action config for client display (remove sensitive data)
   */
  sanitizeActionConfig(config) {
    if (!config) return {};
    const sanitized = { ...config };
    // Remove sensitive fields
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'api_key', 'auth'];
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '***';
      }
    }
    return sanitized;
  }

  /**
   * Execute a single action
   * @param {Object} action - Action configuration
   * @param {string} projectPath - Working directory
   * @param {Object} context - Trigger context
   * @param {string} executionId - Execution ID
   * @param {Function} onChunk - Callback for streaming output chunks
   */
  async executeAction(action, projectPath, context, executionId, onChunk) {
    const { type, config } = action;

    switch (type) {
      case 'shell':
        return this.executeShellAction(config, projectPath, onChunk);
      case 'api':
        return this.executeApiAction(config, onChunk);
      case 'mcp':
        return this.executeMcpAction(config, onChunk);
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Execute a shell command action with streaming output
   */
  async executeShellAction(config, projectPath, onChunk) {
    const { command } = config;

    return new Promise((resolve) => {
      const outputChunks = [];

      // Use shell to support complex commands
      const proc = spawn('sh', ['-c', command], {
        cwd: projectPath,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Set timeout
      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        const timeoutMsg = '\n[Process killed: timeout after 5 minutes]';
        outputChunks.push(timeoutMsg);
        if (onChunk) onChunk(timeoutMsg);
      }, 300000);

      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputChunks.push(chunk);
        if (onChunk) onChunk(chunk);
      });

      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        outputChunks.push(chunk);
        if (onChunk) onChunk(chunk);
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        const output = outputChunks.join('');
        if (code !== 0) {
          log.warn({ code, command }, 'shell command exited with non-zero code');
        }
        resolve(output || `(Process exited with code ${code})`);
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        log.error({ error: error.message, command }, 'shell command failed');
        resolve(`Error: ${error.message}`);
      });
    });
  }

  /**
   * Execute an API call action with streaming support
   */
  async executeApiAction(config, onChunk) {
    const { url, method = 'GET', headers = {}, body } = config;

    try {
      const fetchOptions = {
        method,
        headers: { ...headers }
      };

      if (body && method !== 'GET') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        if (!headers['Content-Type']) {
          fetchOptions.headers['Content-Type'] = 'application/json';
        }
      }

      if (onChunk) onChunk(`Calling ${method} ${url}...\n`);

      const response = await fetch(url, fetchOptions);
      const text = await response.text();
      const output = `${response.status} ${response.statusText}\n${text}`;

      if (onChunk) onChunk(output);
      return output;
    } catch (error) {
      log.error({ error: error.message, url: config.url }, 'API call failed');
      const errorMsg = `Error: ${error.message}`;
      if (onChunk) onChunk(errorMsg);
      return errorMsg;
    }
  }

  /**
   * Execute an MCP tool action with streaming support
   */
  async executeMcpAction(config, onChunk) {
    const { serverId, toolName, args } = config;

    if (onChunk) onChunk(`Invoking MCP tool: ${toolName}\n`);

    // This will be implemented when MCP manager is ready
    // For now, return a placeholder
    const output = `MCP Tool: ${toolName} on server ${serverId} (not yet implemented)`;
    if (onChunk) onChunk(output);
    return output;
  }

  /**
   * Manually trigger an agent by ID
   */
  async runAgent(agentId) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    return this.triggerAgent(agent, { event: 'MANUAL' });
  }

  /**
   * Stop a running agent
   */
  async stopAgent(agentId) {
    const running = this.runningAgents.get(agentId);
    if (!running) {
      return false;
    }

    // Update execution record
    await this.prisma.agentExecution.update({
      where: { id: running.executionId },
      data: {
        status: 'CANCELLED',
        endedAt: new Date()
      }
    });

    this.runningAgents.delete(agentId);

    // Emit cancellation
    this.io.emit('agent:status', {
      agentId,
      executionId: running.executionId,
      status: 'CANCELLED',
      endedAt: new Date()
    });

    return true;
  }

  /**
   * Get status of all agents
   */
  getStatus() {
    return {
      running: Array.from(this.runningAgents.entries()).map(([agentId, data]) => ({
        agentId,
        ...data
      })),
      maxConcurrent: MAX_CONCURRENT_AGENTS,
      available: MAX_CONCURRENT_AGENTS - this.runningAgents.size
    };
  }

  /**
   * Reload an agent's triggers (after update)
   */
  async reloadAgent(agentId) {
    // Remove old subscriptions
    for (const [eventType, agents] of this.eventSubscriptions) {
      agents.delete(agentId);
    }

    // Remove from file watchers
    for (const [path, data] of this.fileWatchers) {
      data.agents.delete(agentId);
    }

    // Load fresh agent data
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true }
    });

    if (agent?.enabled) {
      await this.setupAgentTriggers(agent);
    }
  }

  /**
   * Clean up resources
   */
  async shutdown() {
    // Stop all file watchers
    for (const [path, data] of this.fileWatchers) {
      await data.watcher.close();
    }
    this.fileWatchers.clear();

    // Clear subscriptions
    this.eventSubscriptions.clear();

    // Cancel running agents
    for (const [agentId] of this.runningAgents) {
      await this.stopAgent(agentId);
    }

    log.info('agent runner shutdown complete');
  }
}

export default AgentRunner;

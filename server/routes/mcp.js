/**
 * MCP Server API Routes
 * CRUD operations and management for MCP servers
 * Tool discovery, invocation, and logging
 * Server catalog with pre-configured templates
 */

import { Router } from 'express';
import MCP_CATALOG, {
  getServersByCategory,
  getServerById,
  searchServers,
  getCategoriesWithCounts
} from '../data/mcpCatalog.js';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('mcp');

export function createMCPRouter(prisma, mcpManager) {
  const router = Router();

  // =============================================================================
  // SERVER CRUD
  // =============================================================================

  /**
   * Get all MCP servers with tools and status
   */
  router.get('/', async (req, res) => {
    try {
      const { transport, enabled, projectId, isGlobal } = req.query;

      const where = {};

      if (transport) {
        where.transport = transport.toUpperCase();
      }

      if (enabled !== undefined) {
        where.enabled = enabled === 'true';
      }

      if (projectId) {
        where.projectId = projectId;
      }

      if (isGlobal !== undefined) {
        where.isGlobal = isGlobal === 'true';
      }

      const servers = await prisma.mCPServer.findMany({
        where,
        include: {
          tools: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          project: {
            select: { id: true, name: true, path: true }
          }
        },
        orderBy: [
          { enabled: 'desc' },
          { name: 'asc' }
        ]
      });

      // Add runtime status
      const runtimeStatus = mcpManager.getStatus();
      const serversWithStatus = servers.map(server => ({
        ...server,
        isRunning: runtimeStatus[server.id]?.running || false,
        runtimeStatus: runtimeStatus[server.id]?.status || server.status
      }));

      res.json(serversWithStatus);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch MCP servers',
        operation: 'fetch MCP servers',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // CATALOG - Pre-configured MCP Server Templates
  // These routes MUST come before /:id routes to avoid matching conflicts
  // =============================================================================

  /**
   * Get full catalog with categories and servers
   */
  router.get('/catalog', (req, res) => {
    const categoriesWithCounts = getCategoriesWithCounts();
    res.json({
      categories: categoriesWithCounts,
      servers: MCP_CATALOG.servers,
      totalServers: MCP_CATALOG.servers.length
    });
  });

  /**
   * Get catalog categories with server counts
   */
  router.get('/catalog/categories', (req, res) => {
    res.json(getCategoriesWithCounts());
  });

  /**
   * Get servers by category
   */
  router.get('/catalog/category/:categoryId', (req, res) => {
    const { categoryId } = req.params;
    const category = MCP_CATALOG.categories.find(c => c.id === categoryId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const servers = getServersByCategory(categoryId);
    res.json({
      category,
      servers
    });
  });

  /**
   * Search catalog servers
   */
  router.get('/catalog/search', (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = searchServers(q.trim());
    res.json(results);
  });

  /**
   * Get a specific catalog server template
   */
  router.get('/catalog/server/:serverId', (req, res) => {
    const { serverId } = req.params;
    const server = getServerById(serverId);

    if (!server) {
      return res.status(404).json({ error: 'Catalog server not found' });
    }

    const category = MCP_CATALOG.categories.find(c => c.id === server.category);

    res.json({
      ...server,
      categoryInfo: category
    });
  });

  /**
   * Check which catalog servers are installed
   */
  router.get('/catalog/installed', async (req, res) => {
    try {
      const installed = await prisma.mCPServer.findMany({
        where: {
          catalogId: { not: null }
        },
        select: {
          id: true,
          catalogId: true,
          name: true,
          status: true,
          enabled: true
        }
      });

      const installedMap = {};
      installed.forEach(s => {
        installedMap[s.catalogId] = {
          installed: true,
          serverId: s.id,
          status: s.status,
          enabled: s.enabled
        };
      });

      res.json(installedMap);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to check installed servers',
        operation: 'check installed MCP servers',
        requestId: req.id,
      });
    }
  });

  /**
   * Install a server from the catalog
   */
  router.post('/catalog/install/:catalogId', async (req, res) => {
    try {
      const { catalogId } = req.params;
      const { config = {}, projectId, isGlobal = true, autoStart = true } = req.body;

      const template = getServerById(catalogId);
      if (!template) {
        return res.status(404).json({ error: 'Catalog server not found' });
      }

      const existing = await prisma.mCPServer.findFirst({
        where: { catalogId }
      });
      if (existing) {
        return res.status(409).json({
          error: 'Server already installed',
          existingId: existing.id
        });
      }

      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(400).json({ error: 'Project not found' });
        }
      }

      let args = [...(template.args || [])];

      if (config.directories && Array.isArray(config.directories)) {
        args = [...args, ...config.directories];
      }
      if (config.db_path) {
        args = [...args, config.db_path];
      }
      if (config.repository) {
        args = [...args, '--repository', config.repository];
      }
      if (config.vault_path) {
        args = [...args, config.vault_path];
      }

      const env = {
        ...(template.env || {}),
        ...(config.env || {})
      };

      Object.keys(env).forEach(key => {
        if (!env[key]) delete env[key];
      });

      const server = await prisma.mCPServer.create({
        data: {
          name: template.name,
          description: template.description,
          transport: template.transport,
          command: template.command,
          args,
          env: Object.keys(env).length > 0 ? env : null,
          url: null,
          enabled: true,
          isGlobal,
          projectId: projectId || null,
          status: 'DISCONNECTED',
          catalogId: template.id,
          catalogMeta: {
            author: template.author,
            repository: template.repository,
            package: template.package,
            tools: template.tools,
            tags: template.tags
          }
        },
        include: {
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      if (autoStart) {
        try {
          await mcpManager.startServer(server.id);
        } catch (err) {
          log.error({ error: err.message, serverId: server.id }, 'failed to auto-start installed MCP server');
          return res.status(201).json({
            ...server,
            startError: err.message
          });
        }
      }

      res.status(201).json(server);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to install server from catalog',
        operation: 'install catalog server',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // TOOL LOGS
  // NOTE: These routes MUST be defined BEFORE /:id routes
  // otherwise "logs" gets matched as an :id parameter
  // =============================================================================

  /**
   * Get tool call logs
   */
  router.get('/logs', async (req, res) => {
    try {
      const { serverId, toolId, success, limit = 100, offset = 0 } = req.query;

      const where = {};

      if (serverId) {
        where.tool = { serverId };
      }

      if (toolId) {
        where.toolId = toolId;
      }

      if (success !== undefined) {
        where.success = success === 'true';
      }

      const [logs, total] = await Promise.all([
        prisma.mCPToolLog.findMany({
          where,
          include: {
            tool: {
              select: {
                name: true,
                server: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.mCPToolLog.count({ where })
      ]);

      res.json({
        logs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch tool logs',
        operation: 'fetch MCP tool logs',
        requestId: req.id,
      });
    }
  });

  /**
   * Clear old tool logs
   */
  router.delete('/logs/cleanup', async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(days));

      const result = await prisma.mCPToolLog.deleteMany({
        where: {
          createdAt: { lt: cutoff }
        }
      });

      res.json({
        success: true,
        deleted: result.count,
        cutoffDate: cutoff
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to clean up logs',
        operation: 'clean up MCP logs',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // SERVER CRUD (continued) - Must come after /catalog and /logs routes
  // =============================================================================

  /**
   * Get a single MCP server with full details
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const server = await prisma.mCPServer.findUnique({
        where: { id },
        include: {
          tools: true,
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      if (!server) {
        return res.status(404).json({ error: 'MCP server not found' });
      }

      // Add runtime status
      const runtimeStatus = mcpManager.getStatus();
      const isRunning = runtimeStatus[id]?.running || false;

      res.json({
        ...server,
        isRunning,
        runtimeStatus: runtimeStatus[id]?.status || server.status
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch MCP server',
        operation: 'fetch MCP server',
        requestId: req.id,
      });
    }
  });

  /**
   * Create a new MCP server
   */
  router.post('/', async (req, res) => {
    try {
      const {
        name,
        transport,
        command,
        args,
        env,
        url,
        headers,
        enabled,
        isGlobal,
        projectId
      } = req.body;

      // Validation
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Server name is required' });
      }

      if (!transport || !['STDIO', 'SSE', 'WEBSOCKET'].includes(transport)) {
        return res.status(400).json({ error: 'Valid transport type is required' });
      }

      if (transport === 'STDIO' && !command?.trim()) {
        return res.status(400).json({ error: 'Command is required for STDIO transport' });
      }

      if ((transport === 'SSE' || transport === 'WEBSOCKET') && !url?.trim()) {
        return res.status(400).json({ error: 'URL is required for SSE/WebSocket transport' });
      }

      // Verify project exists if specified
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(400).json({ error: 'Project not found' });
        }
      }

      const server = await prisma.mCPServer.create({
        data: {
          name: name.trim(),
          transport,
          command: command?.trim() || null,
          args: args || [],
          env: env || null,
          url: url?.trim() || null,
          headers: headers || null,
          enabled: enabled !== false,
          isGlobal: isGlobal !== false,
          projectId: projectId || null,
          status: 'DISCONNECTED'
        },
        include: {
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      // Start server if enabled
      if (server.enabled) {
        try {
          await mcpManager.startServer(server.id);
        } catch (err) {
          log.error({ error: err.message, serverId: server.id }, 'failed to start MCP server after creation');
        }
      }

      res.status(201).json(server);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create MCP server',
        operation: 'create MCP server',
        requestId: req.id,
      });
    }
  });

  /**
   * Update an MCP server
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        transport,
        command,
        args,
        env,
        url,
        headers,
        enabled,
        isGlobal,
        projectId
      } = req.body;

      // Check server exists
      const existing = await prisma.mCPServer.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'MCP server not found' });
      }

      // Validation
      if (name !== undefined && !name?.trim()) {
        return res.status(400).json({ error: 'Server name cannot be empty' });
      }

      if (transport && !['STDIO', 'SSE', 'WEBSOCKET'].includes(transport)) {
        return res.status(400).json({ error: 'Invalid transport type' });
      }

      // Verify project exists if specified
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(400).json({ error: 'Project not found' });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (transport !== undefined) updateData.transport = transport;
      if (command !== undefined) updateData.command = command?.trim() || null;
      if (args !== undefined) updateData.args = args;
      if (env !== undefined) updateData.env = env;
      if (url !== undefined) updateData.url = url?.trim() || null;
      if (headers !== undefined) updateData.headers = headers;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (isGlobal !== undefined) updateData.isGlobal = isGlobal;
      if (projectId !== undefined) updateData.projectId = projectId || null;

      const server = await prisma.mCPServer.update({
        where: { id },
        data: updateData,
        include: {
          tools: true,
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      // Reload server if configuration changed
      await mcpManager.reloadServer(id);

      res.json(server);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update MCP server',
        operation: 'update MCP server',
        requestId: req.id,
      });
    }
  });

  /**
   * Delete an MCP server
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check server exists
      const existing = await prisma.mCPServer.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'MCP server not found' });
      }

      // Stop server if running
      await mcpManager.stopServer(id);

      // Delete server (cascades to tools and logs)
      await prisma.mCPServer.delete({ where: { id } });

      res.json({ success: true, id });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete MCP server',
        operation: 'delete MCP server',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // SERVER LIFECYCLE
  // =============================================================================

  /**
   * Start an MCP server
   */
  router.post('/:id/start', async (req, res) => {
    try {
      const { id } = req.params;

      const server = await prisma.mCPServer.findUnique({ where: { id } });
      if (!server) {
        return res.status(404).json({ error: 'MCP server not found' });
      }

      await mcpManager.startServer(id);

      res.json({ success: true, status: 'CONNECTED' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to start MCP server',
        operation: 'start MCP server',
        requestId: req.id,
      });
    }
  });

  /**
   * Stop an MCP server
   */
  router.post('/:id/stop', async (req, res) => {
    try {
      const { id } = req.params;

      await mcpManager.stopServer(id);

      res.json({ success: true, status: 'DISCONNECTED' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to stop MCP server',
        operation: 'stop MCP server',
        requestId: req.id,
      });
    }
  });

  /**
   * Restart an MCP server
   */
  router.post('/:id/restart', async (req, res) => {
    try {
      const { id } = req.params;

      const server = await prisma.mCPServer.findUnique({ where: { id } });
      if (!server) {
        return res.status(404).json({ error: 'MCP server not found' });
      }

      await mcpManager.restartServer(id);

      res.json({ success: true, status: 'CONNECTED' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to restart MCP server',
        operation: 'restart MCP server',
        requestId: req.id,
      });
    }
  });

  /**
   * Toggle server enabled status
   */
  router.post('/:id/toggle', async (req, res) => {
    try {
      const { id } = req.params;

      const server = await prisma.mCPServer.findUnique({ where: { id } });
      if (!server) {
        return res.status(404).json({ error: 'MCP server not found' });
      }

      const updated = await prisma.mCPServer.update({
        where: { id },
        data: { enabled: !server.enabled },
        include: {
          tools: true,
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      // Start or stop based on new state
      if (updated.enabled) {
        await mcpManager.startServer(id);
      } else {
        await mcpManager.stopServer(id);
      }

      res.json(updated);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to toggle MCP server',
        operation: 'toggle MCP server',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // TOOLS
  // =============================================================================

  /**
   * Discover/refresh tools from a server
   */
  router.post('/:id/discover', async (req, res) => {
    try {
      const { id } = req.params;

      const tools = await mcpManager.discoverTools(id);

      res.json({ success: true, tools });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to discover tools',
        operation: 'discover MCP tools',
        requestId: req.id,
      });
    }
  });

  /**
   * Get all tools across all servers
   */
  router.get('/tools/all', async (req, res) => {
    try {
      const tools = await prisma.mCPTool.findMany({
        include: {
          server: {
            select: {
              id: true,
              name: true,
              status: true,
              enabled: true
            }
          }
        },
        orderBy: [
          { server: { name: 'asc' } },
          { name: 'asc' }
        ]
      });

      res.json(tools);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch tools',
        operation: 'fetch MCP tools',
        requestId: req.id,
      });
    }
  });

  /**
   * Get tools for a specific server
   */
  router.get('/:id/tools', async (req, res) => {
    try {
      const { id } = req.params;

      const tools = await prisma.mCPTool.findMany({
        where: { serverId: id },
        orderBy: { name: 'asc' }
      });

      res.json(tools);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch server tools',
        operation: 'fetch server tools',
        requestId: req.id,
      });
    }
  });

  /**
   * Call a tool
   */
  router.post('/:id/tools/:toolName/call', async (req, res) => {
    try {
      const { id, toolName } = req.params;
      const { args } = req.body;

      const result = await mcpManager.callTool(id, toolName, args || {});

      res.json({ success: true, result });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to call tool',
        operation: 'call MCP tool',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // STATUS & METADATA
  // =============================================================================

  /**
   * Get MCP manager status
   */
  router.get('/status/manager', async (req, res) => {
    try {
      const status = mcpManager.getStatus();
      res.json(status);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch manager status',
        operation: 'fetch MCP manager status',
        requestId: req.id,
      });
    }
  });

  /**
   * Get available transport types
   */
  router.get('/meta/transports', (req, res) => {
    res.json({
      transports: [
        {
          value: 'STDIO',
          label: 'Standard I/O',
          description: 'Spawn a local process and communicate via stdin/stdout',
          fields: [
            { name: 'command', type: 'text', label: 'Command', required: true },
            { name: 'args', type: 'array', label: 'Arguments' },
            { name: 'env', type: 'json', label: 'Environment Variables' }
          ]
        },
        {
          value: 'SSE',
          label: 'Server-Sent Events',
          description: 'Connect to an HTTP server using SSE',
          fields: [
            { name: 'url', type: 'url', label: 'URL', required: true },
            { name: 'headers', type: 'json', label: 'Headers' }
          ]
        },
        {
          value: 'WEBSOCKET',
          label: 'WebSocket',
          description: 'Connect via WebSocket',
          fields: [
            { name: 'url', type: 'url', label: 'URL', required: true },
            { name: 'headers', type: 'json', label: 'Headers' }
          ]
        }
      ]
    });
  });

  return router;
}

export default createMCPRouter;

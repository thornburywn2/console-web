/**
 * Code Puppy API Routes - Full Feature Parity
 *
 * Manages Code Puppy AI coding assistant:
 * - Installation status and setup
 * - Session lifecycle management
 * - Agent management (built-in and custom)
 * - MCP server configuration
 * - Model configuration and browsing
 * - Configuration system (puppy.cfg)
 * - Custom slash commands
 * - Provider availability
 * - Claude Code integration (hybrid mode)
 */

import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { codePuppyManager } from '../services/codePuppyManager.js';
import { getInitializer } from '../services/codePuppyInitializer.js';
import { createLogger } from '../services/logger.js';

const log = createLogger('code-puppy');

/**
 * Create Code Puppy router
 */
export function createCodePuppyRouter(io, prisma) {
  const router = express.Router();

  // Auto-initialization middleware
  // Runs on first access to ensure Code Puppy is set up
  let autoInitAttempted = false;

  router.use(async (req, res, next) => {
    // Skip for init status endpoint to avoid infinite loop
    if (req.path === '/init/status') {
      return next();
    }

    // Only attempt auto-init once per server session
    if (autoInitAttempted) {
      return next();
    }

    try {
      const initializer = getInitializer();
      const isInitialized = await initializer.isInitialized();

      if (!isInitialized) {
        log.info('auto-initializing Code Puppy on first access');
        const result = await initializer.initialize({
          preferredAISolution: 'hybrid',
          codePuppyProvider: 'anthropic',
          codePuppyModel: 'claude-sonnet-4-20250514',
          hybridMode: 'code-puppy-with-claude-tools'
        });

        if (result.success) {
          log.info('Code Puppy auto-initialization successful');
        } else {
          log.error({ error: result.error }, 'Code Puppy auto-initialization failed');
        }
      }

      autoInitAttempted = true;
    } catch (error) {
      log.error({ error: error.message }, 'error during Code Puppy auto-initialization');
      autoInitAttempted = true; // Don't keep trying if it fails
    }

    next();
  });

  // ============================================
  // Initialization
  // ============================================

  /**
   * GET /api/code-puppy/init/status
   * Check initialization status and get recommendations
   */
  router.get('/init/status', async (req, res) => {
    try {
      const initializer = getInitializer();
      const status = await initializer.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/init
   * Run full initialization process
   */
  router.post('/init', async (req, res) => {
    try {
      const initializer = getInitializer();
      const options = req.body || {};
      const result = await initializer.initialize(options);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/init/directories
   * Create Code Puppy directories only
   */
  router.post('/init/directories', (req, res) => {
    try {
      const initializer = getInitializer();
      const result = initializer.initializeDirectories();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/init/config
   * Create default configuration only
   */
  router.post('/init/config', (req, res) => {
    try {
      const initializer = getInitializer();
      const result = initializer.createDefaultConfig();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/init/sync-mcp
   * Sync MCP servers from Claude Code only
   */
  router.post('/init/sync-mcp', (req, res) => {
    try {
      const initializer = getInitializer();
      const result = initializer.syncMcpServers();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/init/settings
   * Update UserSettings with Code Puppy preferences only
   */
  router.post('/init/settings', async (req, res) => {
    try {
      const initializer = getInitializer();
      const result = await initializer.updateUserSettings(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // Installation & Status
  // ============================================

  /**
   * GET /api/code-puppy/status
   * Check Code Puppy installation status and overall state
   */
  router.get('/status', async (req, res) => {
    try {
      const installation = await codePuppyManager.checkInstallation();
      const providers = codePuppyManager.checkProviderAvailability();
      const sessions = codePuppyManager.listSessions();
      const agents = codePuppyManager.listAgents();
      const config = codePuppyManager.getConfig();
      const mcpServers = codePuppyManager.getMcpServers();

      res.json({
        ...installation,
        providers,
        activeSessions: sessions.filter(s => s.status === 'running').length,
        totalSessions: sessions.length,
        agentCount: agents.length,
        mcpServerCount: Object.keys(mcpServers).length,
        config: {
          defaultModel: config.model,
          defaultAgent: config.default_agent,
          dbosEnabled: config.enable_dbos,
          yoloMode: config.yolo_mode
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/install
   * Install UV package manager (Code Puppy runs via uvx)
   */
  router.post('/install', async (req, res) => {
    try {
      const result = await codePuppyManager.installUv();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // Configuration
  // ============================================

  /**
   * GET /api/code-puppy/config
   * Get full configuration
   */
  router.get('/config', (req, res) => {
    try {
      const config = codePuppyManager.getConfig();
      res.json({ config });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/code-puppy/config
   * Update configuration
   */
  router.put('/config', (req, res) => {
    try {
      codePuppyManager.updateConfig(req.body);
      const config = codePuppyManager.getConfig();
      res.json({ success: true, config });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/code-puppy/config/:key
   * Update single config value
   */
  router.put('/config/:key', (req, res) => {
    try {
      const { value } = req.body;
      codePuppyManager.setConfigValue(req.params.key, value);
      res.json({ success: true, key: req.params.key, value });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // Providers & Models
  // ============================================

  /**
   * GET /api/code-puppy/providers
   * Get available providers and their models
   */
  router.get('/providers', (req, res) => {
    try {
      const providers = codePuppyManager.getProviders();
      const availability = codePuppyManager.checkProviderAvailability();

      res.json({ providers, availability });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/code-puppy/models/extra
   * Get custom model configurations
   */
  router.get('/models/extra', (req, res) => {
    try {
      const models = codePuppyManager.getExtraModels();
      res.json({ models });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/models/extra
   * Add custom model configuration
   */
  router.post('/models/extra', (req, res) => {
    try {
      const { name, type, endpoint } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Model name is required' });
      }

      const result = codePuppyManager.addExtraModel({ name, type, endpoint });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/code-puppy/models/extra/:name
   * Remove custom model
   */
  router.delete('/models/extra/:name', (req, res) => {
    try {
      const result = codePuppyManager.removeExtraModel(req.params.name);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // Agents
  // ============================================

  /**
   * GET /api/code-puppy/agents
   * List all available agents (built-in and custom)
   */
  router.get('/agents', (req, res) => {
    try {
      const agents = codePuppyManager.listAgents();
      res.json({ agents });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/code-puppy/agents/:name
   * Get agent details
   */
  router.get('/agents/:name', (req, res) => {
    try {
      const agent = codePuppyManager.getAgent(req.params.name);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // For custom agents, get full file content
      if (!agent.builtin) {
        const fullAgent = codePuppyManager.getAgentFile(req.params.name);
        if (fullAgent) {
          return res.json({ agent: { ...agent, ...fullAgent } });
        }
      }

      res.json({ agent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/agents
   * Create a custom agent
   */
  router.post('/agents', (req, res) => {
    try {
      const result = codePuppyManager.createAgent(req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * PUT /api/code-puppy/agents/:name
   * Update a custom agent
   */
  router.put('/agents/:name', (req, res) => {
    try {
      const result = codePuppyManager.updateAgent(req.params.name, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/code-puppy/agents/:name
   * Delete a custom agent
   */
  router.delete('/agents/:name', (req, res) => {
    try {
      const result = codePuppyManager.deleteAgent(req.params.name);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * GET /api/code-puppy/tools
   * Get available tools for agents
   */
  router.get('/tools', (req, res) => {
    try {
      const tools = codePuppyManager.getAvailableTools();
      res.json({ tools });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // Slash Commands
  // ============================================

  /**
   * GET /api/code-puppy/commands
   * Get available slash commands
   */
  router.get('/commands', (req, res) => {
    try {
      const builtinCommands = codePuppyManager.getSlashCommands();
      const customCommands = codePuppyManager.getCustomCommands(req.query.projectPath);

      res.json({
        builtin: builtinCommands,
        custom: customCommands
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // MCP Servers
  // ============================================

  /**
   * GET /api/code-puppy/mcp
   * Get MCP server configurations
   */
  router.get('/mcp', (req, res) => {
    try {
      const servers = codePuppyManager.getMcpServers();
      res.json({ servers });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/mcp
   * Add an MCP server
   */
  router.post('/mcp', (req, res) => {
    try {
      const { name, command, args, env } = req.body;
      if (!name || !command) {
        return res.status(400).json({ error: 'Name and command are required' });
      }

      const result = codePuppyManager.addMcpServer({ name, command, args, env });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/code-puppy/mcp/:name
   * Remove an MCP server
   */
  router.delete('/mcp/:name', (req, res) => {
    try {
      const result = codePuppyManager.removeMcpServer(req.params.name);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/mcp/sync-claude
   * Sync MCP servers from Claude Code configuration
   * Enables hybrid mode by importing Claude's MCP servers into Code Puppy
   */
  router.post('/mcp/sync-claude', (req, res) => {
    try {
      // Claude Code MCP config locations
      const claudeConfigPaths = [
        join(os.homedir(), '.claude', 'claude_desktop_config.json'),
        join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
      ];

      let claudeConfig = null;
      let configPath = null;

      // Find Claude config
      for (const path of claudeConfigPaths) {
        if (existsSync(path)) {
          try {
            claudeConfig = JSON.parse(readFileSync(path, 'utf-8'));
            configPath = path;
            break;
          } catch {
            continue;
          }
        }
      }

      if (!claudeConfig || !claudeConfig.mcpServers) {
        return res.status(404).json({
          error: 'Claude Code MCP configuration not found',
          searchedPaths: claudeConfigPaths,
          hint: 'Make sure Claude Code is installed and has MCP servers configured'
        });
      }

      const { mode = 'merge' } = req.body; // 'merge' or 'replace'
      const results = { added: [], updated: [], skipped: [], errors: [] };

      // Get current Code Puppy MCP servers
      const currentServers = codePuppyManager.getMcpServers();

      // Process Claude MCP servers
      for (const [name, config] of Object.entries(claudeConfig.mcpServers)) {
        try {
          // Skip if disabled in Claude
          if (config.disabled) {
            results.skipped.push({ name, reason: 'disabled in Claude' });
            continue;
          }

          // Check if server already exists
          const exists = currentServers[name];

          if (exists && mode === 'merge') {
            results.skipped.push({ name, reason: 'already exists (merge mode)' });
            continue;
          }

          // Convert Claude format to Code Puppy format
          const puppyConfig = {
            name,
            command: config.command,
            args: config.args || [],
            env: config.env || {}
          };

          // Add or update the server
          if (exists) {
            codePuppyManager.removeMcpServer(name);
            codePuppyManager.addMcpServer(puppyConfig);
            results.updated.push(name);
          } else {
            codePuppyManager.addMcpServer(puppyConfig);
            results.added.push(name);
          }
        } catch (err) {
          results.errors.push({ name, error: err.message });
        }
      }

      res.json({
        success: true,
        sourceConfig: configPath,
        claudeServerCount: Object.keys(claudeConfig.mcpServers).length,
        results,
        currentServers: codePuppyManager.getMcpServers()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/code-puppy/mcp/claude-config
   * Get Claude Code's MCP configuration for preview before sync
   */
  router.get('/mcp/claude-config', (req, res) => {
    try {
      const claudeConfigPaths = [
        join(os.homedir(), '.claude', 'claude_desktop_config.json'),
        join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
      ];

      for (const path of claudeConfigPaths) {
        if (existsSync(path)) {
          try {
            const config = JSON.parse(readFileSync(path, 'utf-8'));
            return res.json({
              found: true,
              path,
              mcpServers: config.mcpServers || {},
              serverCount: Object.keys(config.mcpServers || {}).length
            });
          } catch {
            continue;
          }
        }
      }

      res.json({
        found: false,
        searchedPaths: claudeConfigPaths
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // Sessions
  // ============================================

  /**
   * GET /api/code-puppy/sessions
   * List all sessions
   */
  router.get('/sessions', (req, res) => {
    try {
      const sessions = codePuppyManager.listSessions();
      res.json({ sessions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/code-puppy/sessions/:id
   * Get session details
   */
  router.get('/sessions/:id', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const historyLimit = parseInt(req.query.historyLimit) || 100;
      res.json({
        session: session.getInfo(),
        history: session.history.slice(-historyLimit)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions
   * Create and start a new session
   */
  router.post('/sessions', async (req, res) => {
    try {
      const { projectPath, model, agent, enableDbos } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'Project path is required' });
      }

      const session = await codePuppyManager.createSession(projectPath, {
        model,
        default_agent: agent,
        enable_dbos: enableDbos
      });

      // Set up Socket.IO events for real-time output
      if (io) {
        session.on('output', (data) => {
          io.to(`puppy-${session.id}`).emit('puppy-output', { sessionId: session.id, data });
        });

        session.on('error', (data) => {
          io.to(`puppy-${session.id}`).emit('puppy-error', { sessionId: session.id, data });
        });

        session.on('status', (status) => {
          io.to(`puppy-${session.id}`).emit('puppy-status', { sessionId: session.id, status });
        });

        session.on('agent-changed', (agent) => {
          io.to(`puppy-${session.id}`).emit('puppy-agent-changed', { sessionId: session.id, agent });
        });

        session.on('model-changed', (model) => {
          io.to(`puppy-${session.id}`).emit('puppy-model-changed', { sessionId: session.id, model });
        });
      }

      // Start the session
      await session.start();

      res.json({
        success: true,
        session: session.getInfo()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/input
   * Send input to a session
   */
  router.post('/sessions/:id/input', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { input } = req.body;
      if (!input) {
        return res.status(400).json({ error: 'Input is required' });
      }

      session.send(input);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/command
   * Execute a slash command in a session
   */
  router.post('/sessions/:id/command', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { command, args = [] } = req.body;
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      session.executeCommand(command, ...args);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/agent
   * Switch agent in a session
   */
  router.post('/sessions/:id/agent', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { agent } = req.body;
      if (!agent) {
        return res.status(400).json({ error: 'Agent name is required' });
      }

      session.switchAgent(agent);
      res.json({ success: true, agent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/model
   * Switch model in a session
   */
  router.post('/sessions/:id/model', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { model } = req.body;
      if (!model) {
        return res.status(400).json({ error: 'Model is required' });
      }

      session.switchModel(model);
      res.json({ success: true, model });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/truncate
   * Truncate session history
   */
  router.post('/sessions/:id/truncate', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { keepCount = 10 } = req.body;
      session.truncateHistory(keepCount);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/clear
   * Clear session conversation
   */
  router.post('/sessions/:id/clear', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.clearConversation();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/dbos
   * Enable/disable DBOS for session
   */
  router.post('/sessions/:id/dbos', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { enabled } = req.body;
      session.setDbos(enabled);
      res.json({ success: true, dbosEnabled: enabled });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/config
   * Set session config option
   */
  router.post('/sessions/:id/config', (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'Config key is required' });
      }

      session.setConfig(key, value);
      res.json({ success: true, key, value });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/:id/stop
   * Stop a session
   */
  router.post('/sessions/:id/stop', async (req, res) => {
    try {
      const session = codePuppyManager.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await session.stop();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/code-puppy/sessions/:id
   * Remove a session
   */
  router.delete('/sessions/:id', async (req, res) => {
    try {
      await codePuppyManager.removeSession(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/code-puppy/sessions/stop-all
   * Stop all sessions
   */
  router.post('/sessions/stop-all', async (req, res) => {
    try {
      await codePuppyManager.stopAll();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // Autosaves
  // ============================================

  /**
   * GET /api/code-puppy/autosaves
   * List autosaved sessions
   */
  router.get('/autosaves', (req, res) => {
    try {
      const autosaves = codePuppyManager.listAutosaves();
      res.json({ autosaves });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/code-puppy/autosaves/:filename
   * Delete an autosave
   */
  router.delete('/autosaves/:filename', (req, res) => {
    try {
      const result = codePuppyManager.deleteAutosave(req.params.filename);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============================================
  // Socket.IO Handlers
  // ============================================

  if (io) {
    io.on('connection', (socket) => {
      // Join session room for real-time updates
      socket.on('puppy-join', (sessionId) => {
        socket.join(`puppy-${sessionId}`);
      });

      // Leave session room
      socket.on('puppy-leave', (sessionId) => {
        socket.leave(`puppy-${sessionId}`);
      });

      // Send input via socket
      socket.on('puppy-input', ({ sessionId, input }) => {
        const session = codePuppyManager.getSession(sessionId);
        if (session) {
          session.send(input);
        }
      });

      // Execute command via socket
      socket.on('puppy-command', ({ sessionId, command, args }) => {
        const session = codePuppyManager.getSession(sessionId);
        if (session) {
          session.executeCommand(command, ...(args || []));
        }
      });
    });
  }

  return router;
}

export default createCodePuppyRouter;

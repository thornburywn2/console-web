/**
 * Claude Flow API Routes
 * P3 Phase 1: Claude Flow Multi-Agent
 *
 * Handles Claude Flow installation, swarm management, and agent coordination.
 */

import express from 'express';
import os from 'os';
import { claudeFlowManager } from '../services/claudeFlowManager.js';
import { createLogger } from '../services/logger.js';

const log = createLogger('claude-flow');

const PROJECTS_DIR = process.env.PROJECTS_DIR || `${os.homedir()}/Projects`;

export function createClaudeFlowRouter(prisma, io) {
  const router = express.Router();

  // ============================================
  // Installation & Status
  // ============================================

  /**
   * GET /api/claude-flow/status
   * Check Claude Flow installation and service status
   */
  router.get('/status', async (req, res) => {
    try {
      const installation = await claudeFlowManager.checkInstallation();
      const swarms = claudeFlowManager.listSwarms();
      const roles = claudeFlowManager.getAgentRoles();
      const templates = claudeFlowManager.getSwarmTemplates();

      res.json({
        installation,
        swarms: swarms.filter(s => s.status === 'running').length,
        totalSwarms: swarms.length,
        availableRoles: Object.keys(roles),
        templates: Object.keys(templates)
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get Claude Flow status');
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  /**
   * POST /api/claude-flow/install
   * Install Claude Flow
   */
  router.post('/install', async (req, res) => {
    try {
      const { global = true } = req.body;
      const result = await claudeFlowManager.install(global);
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to install Claude Flow');
      res.status(500).json({ error: error.message || 'Failed to install' });
    }
  });

  /**
   * POST /api/claude-flow/init/:project
   * Initialize Claude Flow in a project
   */
  router.post('/init/:project', async (req, res) => {
    try {
      const { project } = req.params;
      const projectPath = `${PROJECTS_DIR}/${project}`;

      const result = await claudeFlowManager.initProject(projectPath);
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, project: req.params.project, requestId: req.id }, 'failed to initialize Claude Flow');
      res.status(500).json({ error: error.message || 'Failed to initialize' });
    }
  });

  // ============================================
  // Agent Roles & Templates
  // ============================================

  /**
   * GET /api/claude-flow/roles
   * Get available agent roles
   */
  router.get('/roles', (req, res) => {
    try {
      const roles = claudeFlowManager.getAgentRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get roles' });
    }
  });

  /**
   * GET /api/claude-flow/templates
   * Get swarm templates
   */
  router.get('/templates', (req, res) => {
    try {
      const templates = claudeFlowManager.getSwarmTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get templates' });
    }
  });

  // ============================================
  // Swarm Management
  // ============================================

  /**
   * GET /api/claude-flow/swarms
   * List all swarms
   */
  router.get('/swarms', (req, res) => {
    try {
      const swarms = claudeFlowManager.listSwarms();
      res.json(swarms);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list swarms' });
    }
  });

  /**
   * POST /api/claude-flow/swarms
   * Create and start a new swarm
   */
  router.post('/swarms', async (req, res) => {
    try {
      const { projectPath, task, agents, model, template } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'Project path required' });
      }

      let options = { agents, model, task };

      // Apply template if specified
      if (template) {
        const templates = claudeFlowManager.getSwarmTemplates();
        if (templates[template]) {
          options = { ...templates[template], ...options };
        }
      }

      const swarm = await claudeFlowManager.createSwarm(projectPath, options);

      // Set up Socket.IO event forwarding
      if (io) {
        swarm.on('output', (data) => {
          io.emit(`claude-flow:${swarm.id}:output`, data);
        });

        swarm.on('error', (data) => {
          io.emit(`claude-flow:${swarm.id}:error`, data);
        });

        swarm.on('status', (status) => {
          io.emit(`claude-flow:${swarm.id}:status`, status);
        });

        swarm.on('agent-activity', (activity) => {
          io.emit(`claude-flow:${swarm.id}:agent`, activity);
        });

        swarm.on('task-complete', (result) => {
          io.emit(`claude-flow:${swarm.id}:task-complete`, result);
        });
      }

      // Start the swarm
      await swarm.start();

      // Store in database if available
      if (prisma) {
        try {
          await prisma.claudeFlowSwarm.create({
            data: {
              swarmId: swarm.id,
              projectPath,
              task: task || '',
              agents: agents || [],
              status: 'running'
            }
          });
        } catch (dbError) {
          log.error({ error: dbError.message, swarmId: swarm.id }, 'failed to store swarm in database');
        }
      }

      res.json({
        success: true,
        swarm: swarm.getInfo()
      });
    } catch (error) {
      log.error({ error: error.message, projectPath: req.body.projectPath, requestId: req.id }, 'failed to create swarm');
      res.status(500).json({ error: error.message || 'Failed to create swarm' });
    }
  });

  /**
   * GET /api/claude-flow/swarms/:id
   * Get swarm details
   */
  router.get('/swarms/:id', (req, res) => {
    try {
      const swarm = claudeFlowManager.getSwarm(req.params.id);

      if (!swarm) {
        return res.status(404).json({ error: 'Swarm not found' });
      }

      res.json(swarm.getInfo());
    } catch (error) {
      res.status(500).json({ error: 'Failed to get swarm' });
    }
  });

  /**
   * DELETE /api/claude-flow/swarms/:id
   * Stop and remove a swarm
   */
  router.delete('/swarms/:id', async (req, res) => {
    try {
      const swarm = claudeFlowManager.getSwarm(req.params.id);

      if (!swarm) {
        return res.status(404).json({ error: 'Swarm not found' });
      }

      await claudeFlowManager.removeSwarm(req.params.id);

      // Update database
      if (prisma) {
        try {
          await prisma.claudeFlowSwarm.updateMany({
            where: { swarmId: req.params.id },
            data: { status: 'stopped' }
          });
        } catch (dbError) {
          log.error({ error: dbError.message, swarmId: req.params.id }, 'failed to update swarm status in database');
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove swarm' });
    }
  });

  /**
   * POST /api/claude-flow/swarms/:id/input
   * Send input to a swarm
   */
  router.post('/swarms/:id/input', (req, res) => {
    try {
      const swarm = claudeFlowManager.getSwarm(req.params.id);

      if (!swarm) {
        return res.status(404).json({ error: 'Swarm not found' });
      }

      const { input } = req.body;

      if (!input) {
        return res.status(400).json({ error: 'Input required' });
      }

      swarm.send(input);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to send input' });
    }
  });

  /**
   * POST /api/claude-flow/swarms/:id/task
   * Add a task to a swarm
   */
  router.post('/swarms/:id/task', (req, res) => {
    try {
      const swarm = claudeFlowManager.getSwarm(req.params.id);

      if (!swarm) {
        return res.status(404).json({ error: 'Swarm not found' });
      }

      const { task } = req.body;

      if (!task) {
        return res.status(400).json({ error: 'Task required' });
      }

      swarm.addTask(task);
      res.json({
        success: true,
        tasks: swarm.tasks
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to add task' });
    }
  });

  /**
   * GET /api/claude-flow/swarms/:id/output
   * Get swarm output history
   */
  router.get('/swarms/:id/output', (req, res) => {
    try {
      const swarm = claudeFlowManager.getSwarm(req.params.id);

      if (!swarm) {
        return res.status(404).json({ error: 'Swarm not found' });
      }

      const { limit = 100, offset = 0 } = req.query;

      const output = swarm.output.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      res.json({
        output,
        total: swarm.output.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get output' });
    }
  });

  // ============================================
  // Quick Tasks
  // ============================================

  /**
   * POST /api/claude-flow/run
   * Run a quick single-agent task
   */
  router.post('/run', async (req, res) => {
    try {
      const { projectPath, task, role = 'coder' } = req.body;

      if (!projectPath || !task) {
        return res.status(400).json({ error: 'Project path and task required' });
      }

      const result = await claudeFlowManager.runQuickTask(projectPath, task, role);
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, projectPath: req.body.projectPath, requestId: req.id }, 'failed to run quick task');
      res.status(500).json({ error: error.message || 'Failed to run task' });
    }
  });

  // ============================================
  // Configuration
  // ============================================

  /**
   * GET /api/claude-flow/config/:project
   * Get project Claude Flow configuration
   */
  router.get('/config/:project', (req, res) => {
    try {
      const { project } = req.params;
      const projectPath = `${PROJECTS_DIR}/${project}`;
      const config = claudeFlowManager.loadProjectConfig(projectPath);

      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load configuration' });
    }
  });

  return router;
}

export default createClaudeFlowRouter;

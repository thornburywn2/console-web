/**
 * Tabby API Routes
 * P2 Phase 1: Tabby Docker Deployment
 *
 * Handles Tabby container management, configuration, and monitoring.
 */

import express from 'express';
import { tabbyManager } from '../services/tabbyManager.js';
import { createLogger } from '../services/logger.js';

const log = createLogger('tabby');

export function createTabbyRouter(prisma, io) {
  const router = express.Router();

  // ============================================
  // Status & Health
  // ============================================

  /**
   * GET /api/tabby/status
   * Get Tabby service status
   */
  router.get('/status', async (req, res) => {
    try {
      const status = await tabbyManager.getStatus();
      const docker = await tabbyManager.checkDocker();
      const gpu = await tabbyManager.checkGpu();
      const image = await tabbyManager.checkImage();

      res.json({
        ...status,
        docker,
        gpu,
        image
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get Tabby status');
      res.status(500).json({ error: 'Failed to get Tabby status' });
    }
  });

  /**
   * GET /api/tabby/models
   * Get available models
   */
  router.get('/models', (req, res) => {
    try {
      const models = tabbyManager.getModels();
      res.json(models);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get Tabby models');
      res.status(500).json({ error: 'Failed to get models' });
    }
  });

  // ============================================
  // Container Management
  // ============================================

  /**
   * POST /api/tabby/start
   * Start Tabby container
   */
  router.post('/start', async (req, res) => {
    try {
      const { model, useGpu, port, dataDir } = req.body;

      // Set up event forwarding
      if (io) {
        tabbyManager.on('status', (status) => {
          io.emit('tabby:status', status);
        });

        tabbyManager.on('health', (health) => {
          io.emit('tabby:health', health);
        });

        tabbyManager.on('error', (error) => {
          io.emit('tabby:error', error);
        });
      }

      const result = await tabbyManager.start({ model, useGpu, port, dataDir });

      // Store config in database if available
      if (prisma) {
        try {
          await prisma.tabbyConfig.upsert({
            where: { id: 'default' },
            update: {
              model: model || 'StarCoder-1B',
              useGpu: useGpu || false,
              port: port || 8080,
              status: 'running',
              lastStarted: new Date()
            },
            create: {
              id: 'default',
              model: model || 'StarCoder-1B',
              useGpu: useGpu || false,
              port: port || 8080,
              status: 'running',
              lastStarted: new Date()
            }
          });
        } catch (dbError) {
          log.error({ error: dbError.message }, 'failed to store Tabby config');
        }
      }

      res.json(result);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to start Tabby');
      res.status(500).json({ error: error.message || 'Failed to start Tabby' });
    }
  });

  /**
   * POST /api/tabby/stop
   * Stop Tabby container
   */
  router.post('/stop', async (req, res) => {
    try {
      const result = await tabbyManager.stop();

      // Update database status
      if (prisma) {
        try {
          await prisma.tabbyConfig.update({
            where: { id: 'default' },
            data: { status: 'stopped' }
          });
        } catch (dbError) {
          log.error({ error: dbError.message }, 'failed to update Tabby config');
        }
      }

      res.json(result);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to stop Tabby');
      res.status(500).json({ error: error.message || 'Failed to stop Tabby' });
    }
  });

  /**
   * POST /api/tabby/restart
   * Restart Tabby container
   */
  router.post('/restart', async (req, res) => {
    try {
      const result = await tabbyManager.restart();
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to restart Tabby');
      res.status(500).json({ error: error.message || 'Failed to restart Tabby' });
    }
  });

  // ============================================
  // Image Management
  // ============================================

  /**
   * POST /api/tabby/pull
   * Pull Tabby Docker image
   */
  router.post('/pull', async (req, res) => {
    try {
      const { useGpu } = req.body;

      // Set up progress streaming
      if (io) {
        tabbyManager.on('pull-progress', (event) => {
          io.emit('tabby:pull-progress', event);
        });
      }

      const result = await tabbyManager.pullImage(useGpu, (event) => {
        // Also emit via SSE if available
        if (res.sse) {
          res.sse.send(event);
        }
      });

      res.json(result);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to pull Tabby image');
      res.status(500).json({ error: error.message || 'Failed to pull Tabby image' });
    }
  });

  // ============================================
  // Logs & Monitoring
  // ============================================

  /**
   * GET /api/tabby/logs
   * Get container logs
   */
  router.get('/logs', async (req, res) => {
    try {
      const { tail = 100 } = req.query;
      const logs = await tabbyManager.getLogs(parseInt(tail));
      res.json({ logs });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get Tabby logs');
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });

  // ============================================
  // Model Management
  // ============================================

  /**
   * PUT /api/tabby/model
   * Update model (requires restart)
   */
  router.put('/model', async (req, res) => {
    try {
      const { model } = req.body;

      if (!model) {
        return res.status(400).json({ error: 'Model required' });
      }

      const result = await tabbyManager.updateModel(model);

      // Update database
      if (prisma) {
        try {
          await prisma.tabbyConfig.update({
            where: { id: 'default' },
            data: { model }
          });
        } catch (dbError) {
          log.error({ error: dbError.message, model: req.body.model }, 'failed to update Tabby model');
        }
      }

      res.json(result);
    } catch (error) {
      log.error({ error: error.message, model: req.body.model, requestId: req.id }, 'failed to update Tabby model');
      res.status(500).json({ error: error.message || 'Failed to update model' });
    }
  });

  // ============================================
  // Testing
  // ============================================

  /**
   * POST /api/tabby/test
   * Test code completion
   */
  router.post('/test', async (req, res) => {
    try {
      const { code } = req.body;
      const result = await tabbyManager.testCompletion(code);
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to test Tabby');
      res.status(500).json({ error: error.message || 'Failed to test completion' });
    }
  });

  // ============================================
  // Configuration
  // ============================================

  /**
   * GET /api/tabby/config
   * Get stored configuration
   */
  router.get('/config', async (req, res) => {
    try {
      if (!prisma) {
        return res.json(tabbyManager.config);
      }

      let config = await prisma.tabbyConfig.findUnique({
        where: { id: 'default' }
      });

      if (!config) {
        config = await prisma.tabbyConfig.create({
          data: {
            id: 'default',
            model: 'StarCoder-1B',
            useGpu: false,
            port: 8080,
            status: 'stopped'
          }
        });
      }

      res.json(config);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get Tabby config');
      res.status(500).json({ error: 'Failed to get config' });
    }
  });

  /**
   * PUT /api/tabby/config
   * Update configuration
   */
  router.put('/config', async (req, res) => {
    try {
      const { model, useGpu, port, dataDir, autoStart } = req.body;

      if (!prisma) {
        // Update in-memory config
        if (model) tabbyManager.config.model = model;
        if (useGpu !== undefined) tabbyManager.config.useGpu = useGpu;
        if (port) tabbyManager.config.port = port;
        if (dataDir) tabbyManager.config.dataDir = dataDir;
        return res.json(tabbyManager.config);
      }

      const config = await prisma.tabbyConfig.upsert({
        where: { id: 'default' },
        update: {
          ...(model && { model }),
          ...(useGpu !== undefined && { useGpu }),
          ...(port && { port }),
          ...(autoStart !== undefined && { autoStart })
        },
        create: {
          id: 'default',
          model: model || 'StarCoder-1B',
          useGpu: useGpu || false,
          port: port || 8080,
          status: 'stopped',
          autoStart: autoStart || false
        }
      });

      res.json(config);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to update Tabby config');
      res.status(500).json({ error: 'Failed to update config' });
    }
  });

  // ============================================
  // IDE Integration
  // ============================================

  /**
   * GET /api/tabby/ide-config
   * Get IDE configuration snippets
   */
  router.get('/ide-config', async (req, res) => {
    try {
      const status = await tabbyManager.getStatus();
      const url = `http://localhost:${status.config.port}`;

      res.json({
        vscode: {
          extension: 'TabbyML.vscode-tabby',
          settings: {
            'tabby.endpoint': url
          }
        },
        neovim: {
          plugin: 'TabbyML/vim-tabby',
          config: `let g:tabby_server_url = '${url}'`
        },
        jetbrains: {
          plugin: 'Tabby',
          settings: {
            serverUrl: url
          }
        },
        emacs: {
          package: 'emacs-tabby',
          config: `(setq tabby-server-url "${url}")`
        }
      });
    } catch (error) {
      log.error({ error: error.message, ide: req.params.ide, requestId: req.id }, 'failed to generate IDE config');
      res.status(500).json({ error: 'Failed to generate IDE config' });
    }
  });

  return router;
}

export default createTabbyRouter;

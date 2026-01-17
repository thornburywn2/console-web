/**
 * Aider API Routes
 * P1 Phase 1: Aider Integration
 *
 * Handles Aider session management, configuration, and voice control.
 */

import express from 'express';
import { aiderManager } from '../services/aiderManager.js';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('aider');

export function createAiderRouter(prisma, io) {
  const router = express.Router();

  // ============================================
  // Installation & Status
  // ============================================

  /**
   * GET /api/aider/status
   * Check Aider installation and service status
   */
  router.get('/status', async (req, res) => {
    try {
      const installation = await aiderManager.checkInstallation();
      const providers = aiderManager.checkProviderAvailability();
      const sessions = aiderManager.listSessions();

      res.json({
        installation,
        providers,
        activeSessions: sessions.filter(s => s.status === 'running').length,
        totalSessions: sessions.length
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get Aider status',
        operation: 'get Aider status',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/aider/models
   * Get available AI models by provider
   */
  router.get('/models', (req, res) => {
    try {
      const providers = aiderManager.getProviders();
      const availability = aiderManager.checkProviderAvailability();

      const result = {};
      for (const [key, provider] of Object.entries(providers)) {
        result[key] = {
          name: provider.name,
          available: availability[key].available,
          reason: availability[key].reason,
          models: provider.models
        };
      }

      res.json(result);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get models',
        operation: 'get Aider models',
        requestId: req.id,
      });
    }
  });

  // ============================================
  // Session Management
  // ============================================

  /**
   * GET /api/aider/sessions
   * List all Aider sessions
   */
  router.get('/sessions', (req, res) => {
    try {
      const sessions = aiderManager.listSessions();
      res.json(sessions);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to list sessions',
        operation: 'list Aider sessions',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/aider/sessions
   * Create a new Aider session
   */
  router.post('/sessions', async (req, res) => {
    try {
      const { projectPath, model, provider, options } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'Project path required' });
      }

      const session = await aiderManager.createSession(projectPath, {
        model,
        provider,
        ...options
      });

      // Start the session
      await session.start();

      // Set up Socket.IO event forwarding
      if (io) {
        session.on('output', (data) => {
          io.emit(`aider:${session.id}:output`, data);
        });

        session.on('error', (data) => {
          io.emit(`aider:${session.id}:error`, data);
        });

        session.on('status', (status) => {
          io.emit(`aider:${session.id}:status`, status);
        });

        session.on('voice', (status) => {
          io.emit(`aider:${session.id}:voice`, status);
        });
      }

      // Store in database if prisma available
      if (prisma) {
        try {
          await prisma.aiderSession.create({
            data: {
              sessionId: session.id,
              model: session.options.model,
              provider: session.options.provider,
              voiceEnabled: session.options.voiceEnabled,
              filesAdded: session.filesAdded
            }
          });
        } catch (dbError) {
          log.error({ error: dbError.message }, 'failed to store Aider session');
        }
      }

      res.json({
        success: true,
        session: session.getInfo()
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create session',
        operation: 'create Aider session',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/aider/sessions/:id
   * Get a specific session
   */
  router.get('/sessions/:id', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(session.getInfo());
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get session',
        operation: 'get Aider session',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * DELETE /api/aider/sessions/:id
   * Stop and remove a session
   */
  router.delete('/sessions/:id', async (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await aiderManager.removeSession(req.params.id);

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to remove session',
        operation: 'remove Aider session',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * POST /api/aider/sessions/:id/input
   * Send input to an Aider session
   */
  router.post('/sessions/:id/input', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { input } = req.body;

      if (!input) {
        return res.status(400).json({ error: 'Input required' });
      }

      session.send(input);

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to send input',
        operation: 'send input to Aider',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * POST /api/aider/sessions/:id/files
   * Add files to an Aider session
   */
  router.post('/sessions/:id/files', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { files } = req.body;

      if (!files || !files.length) {
        return res.status(400).json({ error: 'Files required' });
      }

      session.addFiles(files);

      res.json({
        success: true,
        filesAdded: session.filesAdded
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to add files',
        operation: 'add files to Aider',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * DELETE /api/aider/sessions/:id/files
   * Remove files from an Aider session
   */
  router.delete('/sessions/:id/files', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { files } = req.body;

      if (!files || !files.length) {
        return res.status(400).json({ error: 'Files required' });
      }

      session.removeFiles(files);

      res.json({
        success: true,
        filesAdded: session.filesAdded
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to remove files',
        operation: 'remove files from Aider',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  // ============================================
  // Voice Control
  // ============================================

  /**
   * POST /api/aider/sessions/:id/voice/start
   * Start voice mode for an Aider session
   */
  router.post('/sessions/:id/voice/start', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.startVoice();

      res.json({
        success: true,
        status: 'starting'
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to start voice',
        operation: 'start Aider voice',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * POST /api/aider/sessions/:id/voice/stop
   * Stop voice mode for an Aider session
   */
  router.post('/sessions/:id/voice/stop', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.stopVoice();

      res.json({
        success: true,
        status: 'stopped'
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to stop voice',
        operation: 'stop Aider voice',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  // ============================================
  // Configuration
  // ============================================

  /**
   * GET /api/aider/config
   * Get user's Aider configuration
   */
  router.get('/config', async (req, res) => {
    try {
      const userId = req.user?.id || 'default';

      if (!prisma) {
        return res.json({
          defaultModel: 'claude-3-5-sonnet-20241022',
          defaultProvider: 'anthropic',
          autoAddFiles: true,
          darkMode: true,
          streamOutput: true
        });
      }

      let config = await prisma.aiderConfig.findUnique({
        where: { userId }
      });

      if (!config) {
        config = await prisma.aiderConfig.create({
          data: {
            userId,
            defaultModel: 'claude-3-5-sonnet-20241022',
            defaultProvider: 'anthropic',
            autoAddFiles: true,
            darkMode: true,
            streamOutput: true
          }
        });
      }

      res.json(config);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get config',
        operation: 'get Aider config',
        requestId: req.id,
      });
    }
  });

  /**
   * PUT /api/aider/config
   * Update user's Aider configuration
   */
  router.put('/config', async (req, res) => {
    try {
      const userId = req.user?.id || 'default';
      const updates = req.body;

      if (!prisma) {
        aiderManager.setDefaultConfig(updates);
        return res.json({ success: true, ...updates });
      }

      const allowedFields = [
        'defaultModel', 'defaultProvider', 'autoAddFiles',
        'darkMode', 'streamOutput'
      ];

      const filteredUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      const config = await prisma.aiderConfig.upsert({
        where: { userId },
        update: filteredUpdates,
        create: { userId, ...filteredUpdates }
      });

      // Update manager defaults
      aiderManager.setDefaultConfig(filteredUpdates);

      res.json(config);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update config',
        operation: 'update Aider config',
        requestId: req.id,
      });
    }
  });

  // ============================================
  // History
  // ============================================

  /**
   * GET /api/aider/sessions/:id/history
   * Get session history
   */
  router.get('/sessions/:id/history', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { limit = 100, offset = 0 } = req.query;

      const history = session.history.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      res.json({
        history,
        total: session.history.length
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get history',
        operation: 'get Aider history',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * DELETE /api/aider/sessions/:id/history
   * Clear session history
   */
  router.delete('/sessions/:id/history', (req, res) => {
    try {
      const session = aiderManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.clearHistory();

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to clear history',
        operation: 'clear Aider history',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  return router;
}

export default createAiderRouter;

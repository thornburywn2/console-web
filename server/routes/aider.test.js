/**
 * Tests for Aider Routes
 * Tests Aider session management, voice control, and configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAiderRouter } from './aider.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock error response
vi.mock('../utils/errorResponse.js', () => ({
  sendSafeError: vi.fn((res, error, options) => {
    res.status(500).json({ error: options.userMessage });
  }),
}));

// Mock session object
function createMockSession(id = 'session-1') {
  return {
    id,
    options: { model: 'claude-sonnet', provider: 'anthropic', voiceEnabled: false },
    filesAdded: ['src/app.js'],
    history: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ],
    getInfo: vi.fn().mockReturnValue({
      id,
      status: 'running',
      model: 'claude-sonnet',
      provider: 'anthropic',
      filesAdded: ['src/app.js'],
    }),
    start: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
    addFiles: vi.fn(),
    removeFiles: vi.fn(),
    startVoice: vi.fn(),
    stopVoice: vi.fn(),
    clearHistory: vi.fn(),
    on: vi.fn(),
  };
}

// Mock aiderManager
const mockSession = createMockSession();
vi.mock('../services/aiderManager.js', () => ({
  aiderManager: {
    checkInstallation: vi.fn().mockResolvedValue({ installed: true, version: '0.50.0' }),
    checkProviderAvailability: vi.fn().mockReturnValue({
      anthropic: { available: true },
      openai: { available: false, reason: 'No API key' },
    }),
    listSessions: vi.fn().mockReturnValue([
      { id: 'session-1', status: 'running' },
      { id: 'session-2', status: 'stopped' },
    ]),
    getSession: vi.fn(),
    createSession: vi.fn(),
    removeSession: vi.fn(),
    getProviders: vi.fn().mockReturnValue({
      anthropic: { name: 'Anthropic', models: ['claude-sonnet', 'claude-opus'] },
      openai: { name: 'OpenAI', models: ['gpt-4', 'gpt-4o'] },
    }),
    setDefaultConfig: vi.fn(),
  },
}));

import { aiderManager } from '../services/aiderManager.js';

// Create mock prisma
function createMockPrisma() {
  return {
    aiderSession: {
      create: vi.fn(),
    },
    aiderConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

// Create app with router
function createApp(prisma, io = null, user = { id: 'user-1' }) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/aider', createAiderRouter(prisma, io));
  return app;
}

describe('Aider Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
    aiderManager.getSession.mockReturnValue(createMockSession());
  });

  // ==========================================================================
  // INSTALLATION & STATUS
  // ==========================================================================
  describe('GET /api/aider/status', () => {
    it('should return Aider status', async () => {
      const res = await request(app).get('/api/aider/status');

      expect(res.status).toBe(200);
      expect(res.body.installation.installed).toBe(true);
      expect(res.body.providers.anthropic.available).toBe(true);
      expect(res.body.activeSessions).toBe(1);
      expect(res.body.totalSessions).toBe(2);
    });

    it('should handle errors', async () => {
      aiderManager.checkInstallation.mockRejectedValue(new Error('Check failed'));

      const res = await request(app).get('/api/aider/status');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/aider/models', () => {
    it('should return available models by provider', async () => {
      const res = await request(app).get('/api/aider/models');

      expect(res.status).toBe(200);
      expect(res.body.anthropic.name).toBe('Anthropic');
      expect(res.body.anthropic.models).toContain('claude-sonnet');
      expect(res.body.openai.available).toBe(false);
    });
  });

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================
  describe('GET /api/aider/sessions', () => {
    it('should list all sessions', async () => {
      const res = await request(app).get('/api/aider/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/aider/sessions', () => {
    it('should create a new session', async () => {
      const newSession = createMockSession('new-session');
      aiderManager.createSession.mockResolvedValue(newSession);

      const res = await request(app)
        .post('/api/aider/sessions')
        .send({ projectPath: '/home/user/project', model: 'claude-sonnet' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(newSession.start).toHaveBeenCalled();
    });

    it('should reject missing projectPath', async () => {
      const res = await request(app)
        .post('/api/aider/sessions')
        .send({ model: 'claude-sonnet' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project path required');
    });

    it('should store session in database', async () => {
      const newSession = createMockSession('new-session');
      aiderManager.createSession.mockResolvedValue(newSession);
      mockPrisma.aiderSession.create.mockResolvedValue({});

      await request(app)
        .post('/api/aider/sessions')
        .send({ projectPath: '/home/user/project' });

      expect(mockPrisma.aiderSession.create).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      aiderManager.createSession.mockRejectedValue(new Error('Failed to create'));

      const res = await request(app)
        .post('/api/aider/sessions')
        .send({ projectPath: '/home/user/project' });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/aider/sessions/:id', () => {
    it('should return session info', async () => {
      const res = await request(app).get('/api/aider/sessions/session-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('session-1');
      expect(res.body.status).toBe('running');
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app).get('/api/aider/sessions/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/aider/sessions/:id', () => {
    it('should remove session', async () => {
      aiderManager.removeSession.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/aider/sessions/session-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(aiderManager.removeSession).toHaveBeenCalledWith('session-1');
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app).delete('/api/aider/sessions/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/aider/sessions/:id/input', () => {
    it('should send input to session', async () => {
      const mockSess = createMockSession();
      aiderManager.getSession.mockReturnValue(mockSess);

      const res = await request(app)
        .post('/api/aider/sessions/session-1/input')
        .send({ input: 'Hello Aider' });

      expect(res.status).toBe(200);
      expect(mockSess.send).toHaveBeenCalledWith('Hello Aider');
    });

    it('should reject missing input', async () => {
      const res = await request(app)
        .post('/api/aider/sessions/session-1/input')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Input required');
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app)
        .post('/api/aider/sessions/nonexistent/input')
        .send({ input: 'Hello' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/aider/sessions/:id/files', () => {
    it('should add files to session', async () => {
      const mockSess = createMockSession();
      aiderManager.getSession.mockReturnValue(mockSess);

      const res = await request(app)
        .post('/api/aider/sessions/session-1/files')
        .send({ files: ['src/utils.js', 'src/index.js'] });

      expect(res.status).toBe(200);
      expect(mockSess.addFiles).toHaveBeenCalledWith(['src/utils.js', 'src/index.js']);
    });

    it('should reject empty files', async () => {
      const res = await request(app)
        .post('/api/aider/sessions/session-1/files')
        .send({ files: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Files required');
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app)
        .post('/api/aider/sessions/nonexistent/files')
        .send({ files: ['file.js'] });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/aider/sessions/:id/files', () => {
    it('should remove files from session', async () => {
      const mockSess = createMockSession();
      aiderManager.getSession.mockReturnValue(mockSess);

      const res = await request(app)
        .delete('/api/aider/sessions/session-1/files')
        .send({ files: ['src/old.js'] });

      expect(res.status).toBe(200);
      expect(mockSess.removeFiles).toHaveBeenCalledWith(['src/old.js']);
    });

    it('should reject empty files', async () => {
      const res = await request(app)
        .delete('/api/aider/sessions/session-1/files')
        .send({ files: [] });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app)
        .delete('/api/aider/sessions/nonexistent/files')
        .send({ files: ['file.js'] });

      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // VOICE CONTROL
  // ==========================================================================
  describe('POST /api/aider/sessions/:id/voice/start', () => {
    it('should start voice mode', async () => {
      const mockSess = createMockSession();
      aiderManager.getSession.mockReturnValue(mockSess);

      const res = await request(app).post('/api/aider/sessions/session-1/voice/start');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('starting');
      expect(mockSess.startVoice).toHaveBeenCalled();
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app).post('/api/aider/sessions/nonexistent/voice/start');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/aider/sessions/:id/voice/stop', () => {
    it('should stop voice mode', async () => {
      const mockSess = createMockSession();
      aiderManager.getSession.mockReturnValue(mockSess);

      const res = await request(app).post('/api/aider/sessions/session-1/voice/stop');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('stopped');
      expect(mockSess.stopVoice).toHaveBeenCalled();
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app).post('/api/aider/sessions/nonexistent/voice/stop');

      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  describe('GET /api/aider/config', () => {
    it('should return user config', async () => {
      mockPrisma.aiderConfig.findUnique.mockResolvedValue({
        userId: 'user-1',
        defaultModel: 'claude-sonnet',
        defaultProvider: 'anthropic',
        autoAddFiles: true,
      });

      const res = await request(app).get('/api/aider/config');

      expect(res.status).toBe(200);
      expect(res.body.defaultModel).toBe('claude-sonnet');
    });

    it('should create default config if not exists', async () => {
      mockPrisma.aiderConfig.findUnique.mockResolvedValue(null);
      mockPrisma.aiderConfig.create.mockResolvedValue({
        userId: 'user-1',
        defaultModel: 'claude-3-5-sonnet-20241022',
        defaultProvider: 'anthropic',
      });

      const res = await request(app).get('/api/aider/config');

      expect(res.status).toBe(200);
      expect(mockPrisma.aiderConfig.create).toHaveBeenCalled();
    });

    it('should return defaults when no prisma', async () => {
      const appNoPrisma = createApp(null);

      const res = await request(appNoPrisma).get('/api/aider/config');

      expect(res.status).toBe(200);
      expect(res.body.defaultModel).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('PUT /api/aider/config', () => {
    it('should update user config', async () => {
      mockPrisma.aiderConfig.upsert.mockResolvedValue({
        userId: 'user-1',
        defaultModel: 'claude-opus',
        darkMode: false,
      });

      const res = await request(app)
        .put('/api/aider/config')
        .send({ defaultModel: 'claude-opus', darkMode: false });

      expect(res.status).toBe(200);
      expect(aiderManager.setDefaultConfig).toHaveBeenCalled();
    });

    it('should filter allowed fields only', async () => {
      mockPrisma.aiderConfig.upsert.mockResolvedValue({});

      await request(app)
        .put('/api/aider/config')
        .send({ defaultModel: 'claude-opus', invalidField: 'ignored' });

      const call = mockPrisma.aiderConfig.upsert.mock.calls[0][0];
      expect(call.update).not.toHaveProperty('invalidField');
    });

    it('should work without prisma', async () => {
      const appNoPrisma = createApp(null);

      const res = await request(appNoPrisma)
        .put('/api/aider/config')
        .send({ defaultModel: 'gpt-4' });

      expect(res.status).toBe(200);
      expect(aiderManager.setDefaultConfig).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // HISTORY
  // ==========================================================================
  describe('GET /api/aider/sessions/:id/history', () => {
    it('should return session history', async () => {
      const res = await request(app).get('/api/aider/sessions/session-1/history');

      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should support pagination', async () => {
      const res = await request(app).get('/api/aider/sessions/session-1/history?limit=1&offset=1');

      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(1);
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app).get('/api/aider/sessions/nonexistent/history');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/aider/sessions/:id/history', () => {
    it('should clear session history', async () => {
      const mockSess = createMockSession();
      aiderManager.getSession.mockReturnValue(mockSess);

      const res = await request(app).delete('/api/aider/sessions/session-1/history');

      expect(res.status).toBe(200);
      expect(mockSess.clearHistory).toHaveBeenCalled();
    });

    it('should return 404 for non-existent session', async () => {
      aiderManager.getSession.mockReturnValue(null);

      const res = await request(app).delete('/api/aider/sessions/nonexistent/history');

      expect(res.status).toBe(404);
    });
  });
});

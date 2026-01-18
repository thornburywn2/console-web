/**
 * Tests for Tabby Routes
 * Tests Tabby Docker container management and configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTabbyRouter } from './tabby.js';

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

// Mock tabbyManager
vi.mock('../services/tabbyManager.js', () => ({
  tabbyManager: {
    getStatus: vi.fn().mockResolvedValue({
      running: true,
      containerId: 'tabby-123',
      config: { port: 8080, model: 'StarCoder-1B' },
    }),
    checkDocker: vi.fn().mockResolvedValue({ installed: true, running: true }),
    checkGpu: vi.fn().mockResolvedValue({ available: true, name: 'NVIDIA RTX 3080' }),
    checkImage: vi.fn().mockResolvedValue({ exists: true, tag: 'latest' }),
    getModels: vi.fn().mockReturnValue([
      { id: 'StarCoder-1B', size: '1B' },
      { id: 'StarCoder-3B', size: '3B' },
    ]),
    start: vi.fn().mockResolvedValue({ success: true, containerId: 'tabby-123' }),
    stop: vi.fn().mockResolvedValue({ success: true }),
    restart: vi.fn().mockResolvedValue({ success: true }),
    pullImage: vi.fn().mockResolvedValue({ success: true }),
    getLogs: vi.fn().mockResolvedValue('Tabby server started\nListening on port 8080'),
    updateModel: vi.fn().mockResolvedValue({ success: true, restarted: true }),
    testCompletion: vi.fn().mockResolvedValue({ completion: 'function foo() {' }),
    on: vi.fn(),
    config: { model: 'StarCoder-1B', port: 8080 },
  },
}));

// Create mock prisma
function createMockPrisma() {
  return {
    tabbyConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

// Create mock io
function createMockIO() {
  return {
    emit: vi.fn(),
  };
}

// Create app with router
function createApp(prisma, io = null) {
  const app = express();
  app.use(express.json());
  app.use('/api/tabby', createTabbyRouter(prisma, io));
  return app;
}

describe('Tabby Routes', () => {
  let mockPrisma;
  let mockIO;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockIO = createMockIO();
    app = createApp(mockPrisma, mockIO);
  });

  // ==========================================================================
  // STATUS & HEALTH
  // ==========================================================================
  describe('GET /api/tabby/status', () => {
    it('should return comprehensive status', async () => {
      const res = await request(app).get('/api/tabby/status');

      expect(res.status).toBe(200);
      expect(res.body.running).toBe(true);
      expect(res.body.docker.installed).toBe(true);
      expect(res.body.gpu.available).toBe(true);
      expect(res.body.image.exists).toBe(true);
    });
  });

  describe('GET /api/tabby/models', () => {
    it('should return available models', async () => {
      const res = await request(app).get('/api/tabby/models');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe('StarCoder-1B');
    });
  });

  // ==========================================================================
  // CONTAINER MANAGEMENT
  // ==========================================================================
  describe('POST /api/tabby/start', () => {
    it('should start Tabby container', async () => {
      const res = await request(app)
        .post('/api/tabby/start')
        .send({ model: 'StarCoder-1B', useGpu: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should store config in database', async () => {
      await request(app)
        .post('/api/tabby/start')
        .send({ model: 'StarCoder-3B', useGpu: false, port: 8080 });

      expect(mockPrisma.tabbyConfig.upsert).toHaveBeenCalled();
    });

    it('should set up event forwarding when io is provided', async () => {
      const { tabbyManager } = await import('../services/tabbyManager.js');

      await request(app)
        .post('/api/tabby/start')
        .send({});

      expect(tabbyManager.on).toHaveBeenCalled();
    });
  });

  describe('POST /api/tabby/stop', () => {
    it('should stop Tabby container', async () => {
      const res = await request(app).post('/api/tabby/stop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update database status', async () => {
      await request(app).post('/api/tabby/stop');

      expect(mockPrisma.tabbyConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'stopped' },
        })
      );
    });
  });

  describe('POST /api/tabby/restart', () => {
    it('should restart Tabby container', async () => {
      const res = await request(app).post('/api/tabby/restart');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // IMAGE MANAGEMENT
  // ==========================================================================
  describe('POST /api/tabby/pull', () => {
    it('should pull Tabby image', async () => {
      const res = await request(app)
        .post('/api/tabby/pull')
        .send({ useGpu: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // LOGS & MONITORING
  // ==========================================================================
  describe('GET /api/tabby/logs', () => {
    it('should return container logs', async () => {
      const res = await request(app).get('/api/tabby/logs');

      expect(res.status).toBe(200);
      expect(res.body.logs).toContain('Tabby server started');
    });

    it('should respect tail parameter', async () => {
      const { tabbyManager } = await import('../services/tabbyManager.js');

      await request(app).get('/api/tabby/logs?tail=50');

      expect(tabbyManager.getLogs).toHaveBeenCalledWith(50);
    });
  });

  // ==========================================================================
  // MODEL MANAGEMENT
  // ==========================================================================
  describe('PUT /api/tabby/model', () => {
    it('should update model', async () => {
      const res = await request(app)
        .put('/api/tabby/model')
        .send({ model: 'StarCoder-3B' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject missing model', async () => {
      const res = await request(app)
        .put('/api/tabby/model')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Model required');
    });

    it('should update database', async () => {
      await request(app)
        .put('/api/tabby/model')
        .send({ model: 'StarCoder-3B' });

      expect(mockPrisma.tabbyConfig.update).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // TESTING
  // ==========================================================================
  describe('POST /api/tabby/test', () => {
    it('should test code completion', async () => {
      const res = await request(app)
        .post('/api/tabby/test')
        .send({ code: 'function hello' });

      expect(res.status).toBe(200);
      expect(res.body.completion).toBeDefined();
    });
  });

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  describe('GET /api/tabby/config', () => {
    it('should return stored config from database', async () => {
      mockPrisma.tabbyConfig.findUnique.mockResolvedValue({
        id: 'default',
        model: 'StarCoder-1B',
        useGpu: true,
        port: 8080,
        status: 'running',
      });

      const res = await request(app).get('/api/tabby/config');

      expect(res.status).toBe(200);
      expect(res.body.model).toBe('StarCoder-1B');
    });

    it('should create default config if none exists', async () => {
      mockPrisma.tabbyConfig.findUnique.mockResolvedValue(null);
      mockPrisma.tabbyConfig.create.mockResolvedValue({
        id: 'default',
        model: 'StarCoder-1B',
        useGpu: false,
        port: 8080,
        status: 'stopped',
      });

      const res = await request(app).get('/api/tabby/config');

      expect(res.status).toBe(200);
      expect(mockPrisma.tabbyConfig.create).toHaveBeenCalled();
    });

    it('should return in-memory config when no prisma', async () => {
      const appNoPrisma = createApp(null, mockIO);

      const res = await request(appNoPrisma).get('/api/tabby/config');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/tabby/config', () => {
    it('should update config', async () => {
      mockPrisma.tabbyConfig.upsert.mockResolvedValue({
        id: 'default',
        model: 'StarCoder-3B',
        useGpu: true,
        port: 9090,
      });

      const res = await request(app)
        .put('/api/tabby/config')
        .send({
          model: 'StarCoder-3B',
          useGpu: true,
          port: 9090,
        });

      expect(res.status).toBe(200);
      expect(mockPrisma.tabbyConfig.upsert).toHaveBeenCalled();
    });

    it('should update in-memory config when no prisma', async () => {
      const appNoPrisma = createApp(null, mockIO);

      const res = await request(appNoPrisma)
        .put('/api/tabby/config')
        .send({ model: 'StarCoder-3B' });

      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // IDE INTEGRATION
  // ==========================================================================
  describe('GET /api/tabby/ide-config', () => {
    it('should return IDE configuration snippets', async () => {
      const res = await request(app).get('/api/tabby/ide-config');

      expect(res.status).toBe(200);
      expect(res.body.vscode).toBeDefined();
      expect(res.body.vscode.extension).toBe('TabbyML.vscode-tabby');
      expect(res.body.neovim).toBeDefined();
      expect(res.body.jetbrains).toBeDefined();
      expect(res.body.emacs).toBeDefined();
    });
  });
});

/**
 * Tests for Claude Flow Routes
 * Tests Claude Flow installation, swarm management, and agent coordination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createClaudeFlowRouter } from './claudeFlow.js';

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

// Mock claudeFlowManager - mockSwarm must be created inside factory to avoid hoisting issues
vi.mock('../services/claudeFlowManager.js', () => {
  const mockSwarm = {
    id: 'swarm-1',
    on: vi.fn(),
    start: vi.fn(),
    send: vi.fn(),
    addTask: vi.fn(),
    tasks: ['task-1'],
    output: ['output line 1', 'output line 2'],
    getInfo: vi.fn().mockReturnValue({
      id: 'swarm-1',
      status: 'running',
      agents: ['coder', 'reviewer'],
    }),
  };

  return {
    claudeFlowManager: {
      checkInstallation: vi.fn().mockResolvedValue({
        installed: true,
        version: '1.0.0',
      }),
      listSwarms: vi.fn().mockReturnValue([
        { id: 'swarm-1', status: 'running' },
        { id: 'swarm-2', status: 'stopped' },
      ]),
      getAgentRoles: vi.fn().mockReturnValue({
        coder: { description: 'Writes code' },
        reviewer: { description: 'Reviews code' },
      }),
      getSwarmTemplates: vi.fn().mockReturnValue({
        development: { agents: ['coder', 'reviewer'] },
        testing: { agents: ['tester'] },
      }),
      install: vi.fn().mockResolvedValue({ success: true }),
      initProject: vi.fn().mockResolvedValue({ success: true, initialized: true }),
      createSwarm: vi.fn().mockResolvedValue(mockSwarm),
      getSwarm: vi.fn(),
      removeSwarm: vi.fn().mockResolvedValue(true),
      runQuickTask: vi.fn().mockResolvedValue({ success: true, output: 'task completed' }),
      loadProjectConfig: vi.fn(),
      _mockSwarm: mockSwarm, // Export for test access
    },
  };
});

// Create mock prisma
function createMockPrisma() {
  return {
    claudeFlowSwarm: {
      create: vi.fn(),
      updateMany: vi.fn(),
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
  app.use('/api/claude-flow', createClaudeFlowRouter(prisma, io));
  return app;
}

describe('Claude Flow Routes', () => {
  let mockPrisma;
  let mockIO;
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockIO = createMockIO();
    app = createApp(mockPrisma, mockIO);

    // Reset claudeFlowManager mocks
    const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
    claudeFlowManager.getSwarm.mockReset();
    claudeFlowManager.loadProjectConfig.mockReset();
  });

  // ==========================================================================
  // INSTALLATION & STATUS
  // ==========================================================================
  describe('GET /api/claude-flow/status', () => {
    it('should return status with installation info', async () => {
      const res = await request(app).get('/api/claude-flow/status');

      expect(res.status).toBe(200);
      expect(res.body.installation.installed).toBe(true);
      expect(res.body.swarms).toBe(1); // Only running swarms
      expect(res.body.totalSwarms).toBe(2);
      expect(res.body.availableRoles).toContain('coder');
      expect(res.body.templates).toContain('development');
    });
  });

  describe('POST /api/claude-flow/install', () => {
    it('should install Claude Flow', async () => {
      const res = await request(app)
        .post('/api/claude-flow/install')
        .send({ global: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should install locally when global is false', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');

      await request(app)
        .post('/api/claude-flow/install')
        .send({ global: false });

      expect(claudeFlowManager.install).toHaveBeenCalledWith(false);
    });
  });

  describe('POST /api/claude-flow/init/:project', () => {
    it('should initialize project', async () => {
      const res = await request(app).post('/api/claude-flow/init/my-project');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // AGENT ROLES & TEMPLATES
  // ==========================================================================
  describe('GET /api/claude-flow/roles', () => {
    it('should return agent roles', async () => {
      const res = await request(app).get('/api/claude-flow/roles');

      expect(res.status).toBe(200);
      expect(res.body.coder).toBeDefined();
      expect(res.body.reviewer).toBeDefined();
    });
  });

  describe('GET /api/claude-flow/templates', () => {
    it('should return swarm templates', async () => {
      const res = await request(app).get('/api/claude-flow/templates');

      expect(res.status).toBe(200);
      expect(res.body.development).toBeDefined();
      expect(res.body.testing).toBeDefined();
    });
  });

  // ==========================================================================
  // SWARM MANAGEMENT
  // ==========================================================================
  describe('GET /api/claude-flow/swarms', () => {
    it('should list all swarms', async () => {
      const res = await request(app).get('/api/claude-flow/swarms');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/claude-flow/swarms', () => {
    it('should create a new swarm', async () => {
      const res = await request(app)
        .post('/api/claude-flow/swarms')
        .send({
          projectPath: '/home/user/project',
          task: 'Implement feature X',
          agents: ['coder', 'reviewer'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.swarm.id).toBe('swarm-1');
    });

    it('should reject missing projectPath', async () => {
      const res = await request(app)
        .post('/api/claude-flow/swarms')
        .send({ task: 'Some task' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Project path required');
    });

    it('should apply template if specified', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');

      await request(app)
        .post('/api/claude-flow/swarms')
        .send({
          projectPath: '/home/user/project',
          template: 'development',
        });

      expect(claudeFlowManager.getSwarmTemplates).toHaveBeenCalled();
    });

    it('should store swarm in database if prisma available', async () => {
      await request(app)
        .post('/api/claude-flow/swarms')
        .send({ projectPath: '/home/user/project' });

      expect(mockPrisma.claudeFlowSwarm.create).toHaveBeenCalled();
    });
  });

  describe('GET /api/claude-flow/swarms/:id', () => {
    it('should return swarm details', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app).get('/api/claude-flow/swarms/swarm-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('swarm-1');
    });

    it('should return 404 for non-existent swarm', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(null);

      const res = await request(app).get('/api/claude-flow/swarms/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/claude-flow/swarms/:id', () => {
    it('should remove swarm', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app).delete('/api/claude-flow/swarms/swarm-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent swarm', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(null);

      const res = await request(app).delete('/api/claude-flow/swarms/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should update database status', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      await request(app).delete('/api/claude-flow/swarms/swarm-1');

      expect(mockPrisma.claudeFlowSwarm.updateMany).toHaveBeenCalled();
    });
  });

  describe('POST /api/claude-flow/swarms/:id/input', () => {
    it('should send input to swarm', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app)
        .post('/api/claude-flow/swarms/swarm-1/input')
        .send({ input: 'Additional instructions' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(claudeFlowManager._mockSwarm.send).toHaveBeenCalledWith('Additional instructions');
    });

    it('should reject missing input', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app)
        .post('/api/claude-flow/swarms/swarm-1/input')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent swarm', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(null);

      const res = await request(app)
        .post('/api/claude-flow/swarms/nonexistent/input')
        .send({ input: 'test' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/claude-flow/swarms/:id/task', () => {
    it('should add task to swarm', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app)
        .post('/api/claude-flow/swarms/swarm-1/task')
        .send({ task: 'New task to add' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(claudeFlowManager._mockSwarm.addTask).toHaveBeenCalledWith('New task to add');
    });

    it('should reject missing task', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app)
        .post('/api/claude-flow/swarms/swarm-1/task')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/claude-flow/swarms/:id/output', () => {
    it('should return swarm output', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app).get('/api/claude-flow/swarms/swarm-1/output');

      expect(res.status).toBe(200);
      expect(res.body.output).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should support pagination', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.getSwarm.mockReturnValue(claudeFlowManager._mockSwarm);

      const res = await request(app)
        .get('/api/claude-flow/swarms/swarm-1/output?offset=1&limit=1');

      expect(res.status).toBe(200);
      expect(res.body.output).toHaveLength(1);
    });
  });

  // ==========================================================================
  // QUICK TASKS
  // ==========================================================================
  describe('POST /api/claude-flow/run', () => {
    it('should run quick task', async () => {
      const res = await request(app)
        .post('/api/claude-flow/run')
        .send({
          projectPath: '/home/user/project',
          task: 'Fix bug in function',
          role: 'coder',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject missing projectPath', async () => {
      const res = await request(app)
        .post('/api/claude-flow/run')
        .send({ task: 'Some task' });

      expect(res.status).toBe(400);
    });

    it('should reject missing task', async () => {
      const res = await request(app)
        .post('/api/claude-flow/run')
        .send({ projectPath: '/home/user/project' });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  describe('GET /api/claude-flow/config/:project', () => {
    it('should return project config', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.loadProjectConfig.mockReturnValue({
        swarmTemplate: 'development',
        agents: ['coder'],
      });

      const res = await request(app).get('/api/claude-flow/config/my-project');

      expect(res.status).toBe(200);
      expect(res.body.swarmTemplate).toBe('development');
    });

    it('should return 404 when config not found', async () => {
      const { claudeFlowManager } = await import('../services/claudeFlowManager.js');
      claudeFlowManager.loadProjectConfig.mockReturnValue(null);

      const res = await request(app).get('/api/claude-flow/config/no-config-project');

      expect(res.status).toBe(404);
    });
  });
});

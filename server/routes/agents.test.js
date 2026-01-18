/**
 * Agents Routes Tests
 * Phase 5.3: Test Coverage for Background Agents API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAgentsRouter } from './agents.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock validation middleware
vi.mock('../middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => {
    req.validatedBody = req.body;
    next();
  },
}));

// Mock error response
vi.mock('../utils/errorResponse.js', () => ({
  sendSafeError: (res, error, options) => {
    return res.status(500).json({
      error: options.userMessage || 'Internal error',
      message: error.message,
    });
  },
}));

// Mock RBAC middleware
vi.mock('../middleware/rbac.js', () => ({
  buildOwnershipFilter: vi.fn().mockReturnValue({}),
  getOwnerIdForCreate: vi.fn().mockReturnValue('test-user-id'),
  auditLog: () => (req, res, next) => next(),
}));

// Mock quota middleware
vi.mock('../middleware/quotas.js', () => ({
  enforceQuota: () => (req, res, next) => next(),
}));

describe('Agents Routes', () => {
  let app;
  let mockPrisma;
  let mockAgentRunner;

  // Test data
  const gitAgent = {
    id: 'agent-git',
    name: 'Pre-commit Linter',
    description: 'Run lint before every commit',
    triggerType: 'GIT_PRE_COMMIT',
    triggerConfig: null,
    actions: [{ type: 'shell', command: 'npm run lint' }],
    enabled: true,
    projectId: 'proj-1',
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: { id: 'proj-1', name: 'Test Project', path: '/test' },
    executions: [],
  };

  const fileAgent = {
    id: 'agent-file',
    name: 'File Watcher',
    description: 'Watch for file changes',
    triggerType: 'FILE_CHANGE',
    triggerConfig: { patterns: ['**/*.ts'] },
    actions: [{ type: 'shell', command: 'npm run build' }],
    enabled: false,
    projectId: null,
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null,
    executions: [],
  };

  const testExecution = {
    id: 'exec-1',
    agentId: 'agent-git',
    status: 'SUCCESS',
    startedAt: new Date('2026-01-15T10:00:00Z'),
    endedAt: new Date('2026-01-15T10:00:05Z'),
    result: { output: 'Lint passed' },
    error: null,
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      agent: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      agentExecution: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        deleteMany: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
      },
    };

    mockAgentRunner = {
      getStatus: vi.fn().mockReturnValue({
        running: [],
        queued: [],
        maxConcurrent: 5,
      }),
      setupAgentTriggers: vi.fn().mockResolvedValue(undefined),
      reloadAgent: vi.fn().mockResolvedValue(undefined),
      runAgent: vi.fn(),
      stopAgent: vi.fn(),
      runningAgents: new Map(),
    };

    // Create app with router
    app = express();
    app.use(express.json());

    // Middleware to set test context
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      req.user = { id: 'test-user-id' };
      next();
    });

    app.use('/api/agents', createAgentsRouter(mockPrisma, mockAgentRunner));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST AGENTS
  // ============================================

  describe('GET /api/agents', () => {
    it('should return all agents with running status', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([gitAgent, fileAgent]);

      const res = await request(app).get('/api/agents');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('isRunning');
    });

    it('should filter by trigger type', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([gitAgent]);

      await request(app).get('/api/agents?trigger=git_pre_commit');

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ triggerType: 'GIT_PRE_COMMIT' }),
        })
      );
    });

    it('should filter by enabled status', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([gitAgent]);

      await request(app).get('/api/agents?enabled=true');

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ enabled: true }),
        })
      );
    });

    it('should filter by project id', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([gitAgent]);

      await request(app).get('/api/agents?projectId=proj-1');

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'proj-1' }),
        })
      );
    });

    it('should include recent executions', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([gitAgent]);

      await request(app).get('/api/agents');

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            executions: expect.objectContaining({
              take: 5,
              orderBy: { startedAt: 'desc' },
            }),
          }),
        })
      );
    });

    it('should mark running agents correctly', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([gitAgent, fileAgent]);
      mockAgentRunner.getStatus.mockReturnValue({
        running: [{ agentId: 'agent-git' }],
        queued: [],
        maxConcurrent: 5,
      });

      const res = await request(app).get('/api/agents');

      expect(res.body[0].isRunning).toBe(true);
      expect(res.body[1].isRunning).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/agents');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch agents');
    });
  });

  // ============================================
  // GET SINGLE AGENT
  // ============================================

  describe('GET /api/agents/:id', () => {
    it('should return agent with paginated executions', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agentExecution.findMany.mockResolvedValue([testExecution]);
      mockPrisma.agentExecution.count.mockResolvedValue(1);

      const res = await request(app).get('/api/agents/agent-git');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Pre-commit Linter');
      expect(res.body.executions).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('should support pagination params', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agentExecution.findMany.mockResolvedValue([]);
      mockPrisma.agentExecution.count.mockResolvedValue(100);

      const res = await request(app).get('/api/agents/agent-git?page=2&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.total).toBe(100);
      expect(res.body.pagination.pages).toBe(10);
    });

    it('should include isRunning status', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agentExecution.findMany.mockResolvedValue([]);
      mockPrisma.agentExecution.count.mockResolvedValue(0);
      mockAgentRunner.getStatus.mockReturnValue({
        running: [{ agentId: 'agent-git' }],
        queued: [],
        maxConcurrent: 5,
      });

      const res = await request(app).get('/api/agents/agent-git');

      expect(res.body.isRunning).toBe(true);
    });

    it('should return 404 for non-existent agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/agents/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/agents/agent-git');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch agent');
    });
  });

  // ============================================
  // CREATE AGENT
  // ============================================

  describe('POST /api/agents', () => {
    it('should create a new agent', async () => {
      mockPrisma.agent.create.mockResolvedValue(gitAgent);

      const res = await request(app).post('/api/agents').send({
        name: 'Pre-commit Linter',
        description: 'Run lint before every commit',
        triggerType: 'GIT_PRE_COMMIT',
        actions: [{ type: 'shell', command: 'npm run lint' }],
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Pre-commit Linter');
    });

    it('should trim name and description', async () => {
      mockPrisma.agent.create.mockResolvedValue(gitAgent);

      await request(app).post('/api/agents').send({
        name: '  Test Agent  ',
        description: '  Description  ',
        triggerType: 'MANUAL',
        actions: [],
      });

      expect(mockPrisma.agent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Agent',
            description: 'Description',
          }),
        })
      );
    });

    it('should validate project exists when projectId provided', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/agents').send({
        name: 'Test',
        triggerType: 'MANUAL',
        actions: [],
        projectId: 'nonexistent',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project not found');
    });

    it('should set up triggers when agent is enabled', async () => {
      mockPrisma.agent.create.mockResolvedValue({ ...gitAgent, enabled: true });

      await request(app).post('/api/agents').send({
        name: 'Test',
        triggerType: 'GIT_PRE_COMMIT',
        actions: [],
        enabled: true,
      });

      expect(mockAgentRunner.setupAgentTriggers).toHaveBeenCalled();
    });

    it('should not set up triggers when agent is disabled', async () => {
      mockPrisma.agent.create.mockResolvedValue({ ...gitAgent, enabled: false });

      await request(app).post('/api/agents').send({
        name: 'Test',
        triggerType: 'GIT_PRE_COMMIT',
        actions: [],
        enabled: false,
      });

      expect(mockAgentRunner.setupAgentTriggers).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/agents').send({
        name: 'Test',
        triggerType: 'MANUAL',
        actions: [],
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create agent');
    });
  });

  // ============================================
  // UPDATE AGENT
  // ============================================

  describe('PUT /api/agents/:id', () => {
    it('should update an agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.update.mockResolvedValue({ ...gitAgent, name: 'Updated' });

      const res = await request(app)
        .put('/api/agents/agent-git')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/agents/nonexistent')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });

    it('should validate project when updating projectId', async () => {
      mockPrisma.agent.findUnique.mockResolvedValueOnce(gitAgent);
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/agents/agent-git')
        .send({ projectId: 'nonexistent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project not found');
    });

    it('should reload agent triggers after update', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.update.mockResolvedValue(gitAgent);

      await request(app)
        .put('/api/agents/agent-git')
        .send({ enabled: false });

      expect(mockAgentRunner.reloadAgent).toHaveBeenCalledWith('agent-git');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/agents/agent-git')
        .send({ name: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update agent');
    });
  });

  // ============================================
  // DELETE AGENT
  // ============================================

  describe('DELETE /api/agents/:id', () => {
    it('should delete an agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.delete.mockResolvedValue(gitAgent);

      const res = await request(app).delete('/api/agents/agent-git');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe('agent-git');
    });

    it('should stop agent if running before delete', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.delete.mockResolvedValue(gitAgent);

      await request(app).delete('/api/agents/agent-git');

      expect(mockAgentRunner.stopAgent).toHaveBeenCalledWith('agent-git');
    });

    it('should clean up triggers after delete', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.delete.mockResolvedValue(gitAgent);

      await request(app).delete('/api/agents/agent-git');

      expect(mockAgentRunner.reloadAgent).toHaveBeenCalledWith('agent-git');
    });

    it('should return 404 for non-existent agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/agents/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/agents/agent-git');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete agent');
    });
  });

  // ============================================
  // RUN AGENT
  // ============================================

  describe('POST /api/agents/:id/run', () => {
    it('should start an agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockAgentRunner.runAgent.mockResolvedValue(testExecution);

      const res = await request(app).post('/api/agents/agent-git/run');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.executionId).toBe('exec-1');
      expect(res.body.status).toBe('RUNNING');
    });

    it('should return 404 for non-existent agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/agents/nonexistent/run');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });

    it('should return 409 when agent already running', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockAgentRunner.runAgent.mockResolvedValue(null);
      mockAgentRunner.runningAgents.set('agent-git', {});

      const res = await request(app).post('/api/agents/agent-git/run');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Agent could not be started');
      expect(res.body.reason).toBe('Agent is already running');
    });

    it('should return 409 when max concurrent reached', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockAgentRunner.runAgent.mockResolvedValue(null);

      const res = await request(app).post('/api/agents/agent-git/run');

      expect(res.status).toBe(409);
      expect(res.body.reason).toBe('Maximum concurrent agents reached');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/agents/agent-git/run');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to run agent');
    });
  });

  // ============================================
  // STOP AGENT
  // ============================================

  describe('POST /api/agents/:id/stop', () => {
    it('should stop a running agent', async () => {
      mockAgentRunner.stopAgent.mockResolvedValue(true);

      const res = await request(app).post('/api/agents/agent-git/stop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('should return 404 when agent is not running', async () => {
      mockAgentRunner.stopAgent.mockResolvedValue(false);

      const res = await request(app).post('/api/agents/agent-git/stop');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent is not running');
    });

    it('should handle errors gracefully', async () => {
      mockAgentRunner.stopAgent.mockRejectedValue(new Error('Stop failed'));

      const res = await request(app).post('/api/agents/agent-git/stop');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to stop agent');
    });
  });

  // ============================================
  // TOGGLE AGENT
  // ============================================

  describe('POST /api/agents/:id/toggle', () => {
    it('should toggle agent enabled status', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue({ ...gitAgent, enabled: true });
      mockPrisma.agent.update.mockResolvedValue({ ...gitAgent, enabled: false });

      const res = await request(app).post('/api/agents/agent-git/toggle');

      expect(res.status).toBe(200);
      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-git' },
        data: { enabled: false },
        include: expect.any(Object),
      });
    });

    it('should reload triggers after toggle', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.update.mockResolvedValue({ ...gitAgent, enabled: false });

      await request(app).post('/api/agents/agent-git/toggle');

      expect(mockAgentRunner.reloadAgent).toHaveBeenCalledWith('agent-git');
    });

    it('should return 404 for non-existent agent', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/agents/nonexistent/toggle');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(gitAgent);
      mockPrisma.agent.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/agents/agent-git/toggle');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to toggle agent');
    });
  });

  // ============================================
  // GET EXECUTION
  // ============================================

  describe('GET /api/agents/executions/:executionId', () => {
    it('should return execution details', async () => {
      mockPrisma.agentExecution.findUnique.mockResolvedValue({
        ...testExecution,
        agent: { id: 'agent-git', name: 'Pre-commit Linter' },
      });

      const res = await request(app).get('/api/agents/executions/exec-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('exec-1');
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.agent).toBeDefined();
    });

    it('should return 404 for non-existent execution', async () => {
      mockPrisma.agentExecution.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/agents/executions/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Execution not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agentExecution.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/agents/executions/exec-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch execution');
    });
  });

  // ============================================
  // CLEANUP EXECUTIONS
  // ============================================

  describe('DELETE /api/agents/executions/cleanup', () => {
    it('should delete old executions with default 7 days', async () => {
      mockPrisma.agentExecution.deleteMany.mockResolvedValue({ count: 50 });

      const res = await request(app).delete('/api/agents/executions/cleanup');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deleted).toBe(50);
      expect(res.body.cutoffDate).toBeDefined();
    });

    it('should support custom days parameter', async () => {
      mockPrisma.agentExecution.deleteMany.mockResolvedValue({ count: 100 });

      const res = await request(app).delete('/api/agents/executions/cleanup?days=30');

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(100);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agentExecution.deleteMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/agents/executions/cleanup');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to clean up executions');
    });
  });

  // ============================================
  // RUNNER STATUS
  // ============================================

  describe('GET /api/agents/status/runner', () => {
    it('should return runner status', async () => {
      mockAgentRunner.getStatus.mockReturnValue({
        running: [{ agentId: 'agent-1', startedAt: new Date() }],
        queued: [],
        maxConcurrent: 5,
      });

      const res = await request(app).get('/api/agents/status/runner');

      expect(res.status).toBe(200);
      expect(res.body.running).toHaveLength(1);
      expect(res.body.maxConcurrent).toBe(5);
    });

    it('should handle errors gracefully', async () => {
      mockAgentRunner.getStatus.mockImplementation(() => {
        throw new Error('Status error');
      });

      const res = await request(app).get('/api/agents/status/runner');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch runner status');
    });
  });

  // ============================================
  // META: TRIGGER TYPES
  // ============================================

  describe('GET /api/agents/meta/triggers', () => {
    it('should return available trigger types', async () => {
      const res = await request(app).get('/api/agents/meta/triggers');

      expect(res.status).toBe(200);
      expect(res.body.triggers).toBeInstanceOf(Array);
      expect(res.body.triggers.length).toBeGreaterThan(0);
    });

    it('should include git, file, session, system, and manual categories', async () => {
      const res = await request(app).get('/api/agents/meta/triggers');

      const categories = [...new Set(res.body.triggers.map((t) => t.category))];
      expect(categories).toContain('git');
      expect(categories).toContain('file');
      expect(categories).toContain('session');
      expect(categories).toContain('system');
      expect(categories).toContain('manual');
    });

    it('should include required fields in each trigger', async () => {
      const res = await request(app).get('/api/agents/meta/triggers');

      res.body.triggers.forEach((trigger) => {
        expect(trigger).toHaveProperty('value');
        expect(trigger).toHaveProperty('label');
        expect(trigger).toHaveProperty('category');
      });
    });
  });

  // ============================================
  // META: ACTION TYPES
  // ============================================

  describe('GET /api/agents/meta/actions', () => {
    it('should return available action types', async () => {
      const res = await request(app).get('/api/agents/meta/actions');

      expect(res.status).toBe(200);
      expect(res.body.actions).toBeInstanceOf(Array);
      expect(res.body.actions.length).toBeGreaterThan(0);
    });

    it('should include shell, api, and mcp actions', async () => {
      const res = await request(app).get('/api/agents/meta/actions');

      const values = res.body.actions.map((a) => a.value);
      expect(values).toContain('shell');
      expect(values).toContain('api');
      expect(values).toContain('mcp');
    });

    it('should include required fields in each action', async () => {
      const res = await request(app).get('/api/agents/meta/actions');

      res.body.actions.forEach((action) => {
        expect(action).toHaveProperty('value');
        expect(action).toHaveProperty('label');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('fields');
      });
    });
  });
});

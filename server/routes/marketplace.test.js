/**
 * Marketplace Routes Tests
 * Phase 5.3: Test Coverage for Agent Marketplace API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createMarketplaceRouter } from './marketplace.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
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

// Mock agent catalog
vi.mock('../data/agentCatalog.js', () => ({
  AGENT_CATALOG: {
    agents: [
      {
        id: 'test-agent-1',
        name: 'Test Agent',
        description: 'A test agent',
        category: 'testing',
        supportedTriggers: ['MANUAL', 'GIT_PRE_COMMIT'],
        tags: ['test', 'automation'],
        author: 'Test Author',
        version: '1.0.0',
        icon: '🧪',
        command: 'npm test {{path}}',
        defaultTrigger: 'MANUAL',
        actionType: 'shell',
        configFields: [{ name: 'path', default: '.' }],
      },
      {
        id: 'test-agent-2',
        name: 'Lint Agent',
        description: 'A linting agent',
        category: 'quality',
        supportedTriggers: ['GIT_PRE_COMMIT'],
        tags: ['lint', 'code-quality'],
        author: 'Test Author',
        version: '1.0.0',
        icon: '✨',
        command: 'npm run lint',
        defaultTrigger: 'GIT_PRE_COMMIT',
        actionType: 'shell',
        configFields: [],
      },
    ],
    categories: [
      { id: 'testing', name: 'Testing', description: 'Testing agents' },
      { id: 'quality', name: 'Quality', description: 'Quality agents' },
    ],
  },
  getAgentById: vi.fn((id) => {
    if (id === 'test-agent-1') {
      return {
        id: 'test-agent-1',
        name: 'Test Agent',
        description: 'A test agent',
        category: 'testing',
        supportedTriggers: ['MANUAL', 'GIT_PRE_COMMIT'],
        tags: ['test'],
        author: 'Test Author',
        version: '1.0.0',
        icon: '🧪',
        command: 'npm test {{path}}',
        defaultTrigger: 'MANUAL',
        actionType: 'shell',
        configFields: [{ name: 'path', default: '.' }],
      };
    }
    return null;
  }),
  getAgentsByCategory: vi.fn(() => []),
  searchAgents: vi.fn(() => []),
  getCategoriesWithCounts: vi.fn(() => [
    { id: 'testing', name: 'Testing', count: 1 },
    { id: 'quality', name: 'Quality', count: 1 },
  ]),
  getAgentsByTrigger: vi.fn(() => []),
}));

describe('Marketplace Routes', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      agent: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      agentExecution: {
        count: vi.fn().mockResolvedValue(0),
      },
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/marketplace', createMarketplaceRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // CATEGORIES
  // ============================================

  describe('GET /api/marketplace/categories', () => {
    it('should return all categories with counts', async () => {
      const res = await request(app).get('/api/marketplace/categories');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
    });
  });

  // ============================================
  // LIST AGENTS
  // ============================================

  describe('GET /api/marketplace/agents', () => {
    it('should return all catalog agents', async () => {
      const res = await request(app).get('/api/marketplace/agents');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/marketplace/agents?category=testing');

      expect(res.status).toBe(200);
      expect(res.body.every((a) => a.category === 'testing')).toBe(true);
    });

    it('should filter by trigger type', async () => {
      const res = await request(app).get(
        '/api/marketplace/agents?trigger=GIT_PRE_COMMIT'
      );

      expect(res.status).toBe(200);
      res.body.forEach((agent) => {
        expect(agent.supportedTriggers).toContain('GIT_PRE_COMMIT');
      });
    });

    it('should filter by search query', async () => {
      const res = await request(app).get('/api/marketplace/agents?search=lint');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Lint Agent');
    });

    it('should include isInstalled status', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([{ catalogId: 'test-agent-1' }]);

      const res = await request(app).get('/api/marketplace/agents');

      const agent1 = res.body.find((a) => a.id === 'test-agent-1');
      const agent2 = res.body.find((a) => a.id === 'test-agent-2');
      expect(agent1.isInstalled).toBe(true);
      expect(agent2.isInstalled).toBe(false);
    });

    it('should filter by installed status', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([{ catalogId: 'test-agent-1' }]);

      const res = await request(app).get('/api/marketplace/agents?installed=true');

      expect(res.body.length).toBe(1);
      expect(res.body[0].isInstalled).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/marketplace/agents');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch agents');
    });
  });

  // ============================================
  // GET SINGLE AGENT
  // ============================================

  describe('GET /api/marketplace/agents/:id', () => {
    it('should return agent details', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/marketplace/agents/test-agent-1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Agent');
      expect(res.body.isInstalled).toBe(false);
    });

    it('should include installedAgentId when installed', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue({ id: 'installed-id' });

      const res = await request(app).get('/api/marketplace/agents/test-agent-1');

      expect(res.body.isInstalled).toBe(true);
      expect(res.body.installedAgentId).toBe('installed-id');
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await request(app).get('/api/marketplace/agents/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found in catalog');
    });
  });

  // ============================================
  // INSTALL AGENT
  // ============================================

  describe('POST /api/marketplace/agents/:id/install', () => {
    it('should install an agent', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);
      mockPrisma.agent.create.mockResolvedValue({
        id: 'new-agent-id',
        name: 'Test Agent',
        catalogId: 'test-agent-1',
      });

      const res = await request(app)
        .post('/api/marketplace/agents/test-agent-1/install')
        .send({ config: { path: '/custom/path' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.agent).toBeDefined();
    });

    it('should return 404 for non-existent catalog agent', async () => {
      const res = await request(app)
        .post('/api/marketplace/agents/nonexistent/install')
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found in catalog');
    });

    it('should return 400 when already installed', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue({ id: 'existing-id' });

      const res = await request(app)
        .post('/api/marketplace/agents/test-agent-1/install')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Agent already installed');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);
      mockPrisma.agent.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/marketplace/agents/test-agent-1/install')
        .send({});

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to install agent');
    });
  });

  // ============================================
  // UNINSTALL AGENT
  // ============================================

  describe('DELETE /api/marketplace/agents/:id/uninstall', () => {
    it('should uninstall an agent', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue({ id: 'installed-id' });
      mockPrisma.agent.delete.mockResolvedValue({});

      const res = await request(app).delete(
        '/api/marketplace/agents/test-agent-1/uninstall'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when not installed', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);

      const res = await request(app).delete(
        '/api/marketplace/agents/test-agent-1/uninstall'
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not installed');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue({ id: 'installed-id' });
      mockPrisma.agent.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete(
        '/api/marketplace/agents/test-agent-1/uninstall'
      );

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to uninstall agent');
    });
  });

  // ============================================
  // INSTALLED AGENTS
  // ============================================

  describe('GET /api/marketplace/installed', () => {
    it('should return list of installed agents', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        {
          id: 'installed-1',
          name: 'Test Agent',
          catalogId: 'test-agent-1',
          project: { name: 'Test', path: '/test' },
          executions: [],
        },
      ]);

      const res = await request(app).get('/api/marketplace/installed');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should enrich with catalog info', async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: 'installed-1', catalogId: 'test-agent-1', executions: [] },
      ]);

      const res = await request(app).get('/api/marketplace/installed');

      expect(res.body[0].catalog).toBeDefined();
      expect(res.body[0].catalog.name).toBe('Test Agent');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/marketplace/installed');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch installed agents');
    });
  });

  // ============================================
  // UPDATE AGENT CONFIG
  // ============================================

  describe('PUT /api/marketplace/agents/:id/update', () => {
    it('should update agent configuration', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue({
        id: 'installed-id',
        triggerConfig: { path: '.' },
      });
      mockPrisma.agent.update.mockResolvedValue({ id: 'installed-id' });

      const res = await request(app)
        .put('/api/marketplace/agents/test-agent-1/update')
        .send({ config: { path: '/new/path' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update enabled status', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue({ id: 'installed-id' });
      mockPrisma.agent.update.mockResolvedValue({ id: 'installed-id', enabled: false });

      const res = await request(app)
        .put('/api/marketplace/agents/test-agent-1/update')
        .send({ enabled: false });

      expect(res.status).toBe(200);
    });

    it('should return 404 when not installed', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/marketplace/agents/test-agent-1/update')
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not installed');
    });
  });

  // ============================================
  // STATS
  // ============================================

  describe('GET /api/marketplace/stats', () => {
    it('should return marketplace statistics', async () => {
      mockPrisma.agent.count.mockResolvedValue(5);
      mockPrisma.agentExecution.count.mockResolvedValue(100);
      mockPrisma.agent.findMany.mockResolvedValue([
        { catalogMeta: { category: 'testing' } },
        { catalogMeta: { category: 'testing' } },
        { catalogMeta: { category: 'quality' } },
      ]);

      const res = await request(app).get('/api/marketplace/stats');

      expect(res.status).toBe(200);
      expect(res.body.totalAgents).toBe(2);
      expect(res.body.totalCategories).toBe(2);
      expect(res.body.installedCount).toBe(5);
      expect(res.body.executionCount).toBe(100);
      expect(res.body.popularCategories).toBeInstanceOf(Array);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.agent.count.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/marketplace/stats');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch stats');
    });
  });
});

/**
 * Tests for Memory Routes
 * Tests memory banks with layered context persistence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createMemoryRouter } from './memory.js';

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

// Create mock prisma
function createMockPrisma() {
  return {
    memoryBank: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  };
}

// Create app with router
function createApp(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api/memory', createMemoryRouter(prisma));
  return app;
}

describe('Memory Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // MEMORY CRUD
  // ==========================================================================
  describe('GET /api/memory', () => {
    it('should return all memories with pagination', async () => {
      const memories = [
        { id: 'm1', title: 'Memory 1', scope: 'PROJECT' },
        { id: 'm2', title: 'Memory 2', scope: 'GLOBAL' },
      ];
      mockPrisma.memoryBank.findMany.mockResolvedValue(memories);
      mockPrisma.memoryBank.count.mockResolvedValue(2);

      const res = await request(app).get('/api/memory');

      expect(res.status).toBe(200);
      expect(res.body.memories).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by scope', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(0);

      await request(app).get('/api/memory?scope=project');

      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scope: 'PROJECT' }),
        })
      );
    });

    it('should filter by projectId', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(0);

      await request(app).get('/api/memory?projectId=proj-1');

      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'proj-1' }),
        })
      );
    });

    it('should filter by type', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(0);

      await request(app).get('/api/memory?type=fact');

      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'FACT' }),
        })
      );
    });

    it('should filter by pinned status', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(0);

      await request(app).get('/api/memory?pinned=true');

      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pinned: true }),
        })
      );
    });

    it('should exclude archived by default', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(0);

      await request(app).get('/api/memory');

      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ archived: false }),
        })
      );
    });

    it('should include archived when requested', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(0);

      await request(app).get('/api/memory?archived=true');

      const call = mockPrisma.memoryBank.findMany.mock.calls[0][0];
      expect(call.where.archived).toBeUndefined();
    });

    it('should support text search', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(0);

      await request(app).get('/api/memory?search=test');

      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([]);
      mockPrisma.memoryBank.count.mockResolvedValue(100);

      const res = await request(app).get('/api/memory?limit=20&offset=40');

      expect(res.status).toBe(200);
      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/memory');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/memory/context', () => {
    it('should return memories for all scopes', async () => {
      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce([{ id: 's1', scope: 'SESSION' }])
        .mockResolvedValueOnce([{ id: 'p1', scope: 'PROJECT' }])
        .mockResolvedValueOnce([{ id: 'g1', scope: 'GLOBAL' }]);

      const res = await request(app).get('/api/memory/context?projectId=proj-1&sessionId=sess-1');

      expect(res.status).toBe(200);
      expect(res.body.session).toHaveLength(1);
      expect(res.body.project).toHaveLength(1);
      expect(res.body.global).toHaveLength(1);
      expect(res.body.merged).toBeDefined();
    });

    it('should return only global when no context provided', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([{ id: 'g1', scope: 'GLOBAL' }]);

      const res = await request(app).get('/api/memory/context');

      expect(res.status).toBe(200);
      expect(res.body.session).toEqual([]);
      expect(res.body.project).toEqual([]);
    });

    it('should merge and sort by importance', async () => {
      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce([{ id: 's1', importance: 5, pinned: false }])
        .mockResolvedValueOnce([{ id: 'g1', importance: 8, pinned: true }]);

      const res = await request(app).get('/api/memory/context?sessionId=sess-1');

      expect(res.status).toBe(200);
      expect(res.body.merged[0].pinned).toBe(true);
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/memory/context?projectId=proj-1');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/memory/:id', () => {
    it('should return memory and increment usage', async () => {
      const memory = { id: 'm1', title: 'Test Memory', usageCount: 5 };
      mockPrisma.memoryBank.findUnique.mockResolvedValue(memory);
      mockPrisma.memoryBank.update.mockResolvedValue({ ...memory, usageCount: 6 });

      const res = await request(app).get('/api/memory/m1');

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Test Memory');
      expect(mockPrisma.memoryBank.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: expect.any(Date),
          },
        })
      );
    });

    it('should return 404 for non-existent memory', async () => {
      mockPrisma.memoryBank.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/memory/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Memory not found');
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.findUnique.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/memory/m1');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/memory', () => {
    it('should create memory', async () => {
      const memory = {
        id: 'new-m',
        title: 'New Memory',
        content: 'Content here',
        scope: 'PROJECT',
      };
      mockPrisma.memoryBank.create.mockResolvedValue(memory);

      const res = await request(app)
        .post('/api/memory')
        .send({
          title: 'New Memory',
          content: 'Content here',
          projectId: 'proj-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Memory');
    });

    it('should reject missing title', async () => {
      const res = await request(app)
        .post('/api/memory')
        .send({ content: 'Content' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('should reject missing content', async () => {
      const res = await request(app)
        .post('/api/memory')
        .send({ title: 'Title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content is required');
    });

    it('should require projectId for PROJECT scope', async () => {
      const res = await request(app)
        .post('/api/memory')
        .send({
          title: 'Title',
          content: 'Content',
          scope: 'PROJECT',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('projectId required');
    });

    it('should require sessionId for SESSION scope', async () => {
      const res = await request(app)
        .post('/api/memory')
        .send({
          title: 'Title',
          content: 'Content',
          scope: 'SESSION',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sessionId required');
    });

    it('should clamp importance to valid range', async () => {
      mockPrisma.memoryBank.create.mockResolvedValue({ id: 'm1' });

      await request(app)
        .post('/api/memory')
        .send({
          title: 'Title',
          content: 'Content',
          scope: 'GLOBAL',
          importance: 15,
        });

      expect(mockPrisma.memoryBank.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ importance: 10 }),
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/memory')
        .send({
          title: 'Title',
          content: 'Content',
          scope: 'GLOBAL',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/memory/:id', () => {
    it('should update memory', async () => {
      mockPrisma.memoryBank.findUnique.mockResolvedValue({ id: 'm1' });
      mockPrisma.memoryBank.update.mockResolvedValue({
        id: 'm1',
        title: 'Updated Title',
      });

      const res = await request(app)
        .put('/api/memory/m1')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });

    it('should return 404 for non-existent memory', async () => {
      mockPrisma.memoryBank.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/memory/nonexistent')
        .send({ title: 'Update' });

      expect(res.status).toBe(404);
    });

    it('should update multiple fields', async () => {
      mockPrisma.memoryBank.findUnique.mockResolvedValue({ id: 'm1' });
      mockPrisma.memoryBank.update.mockResolvedValue({ id: 'm1' });

      await request(app)
        .put('/api/memory/m1')
        .send({
          title: 'New Title',
          content: 'New Content',
          pinned: true,
          importance: 8,
          tags: ['tag1', 'tag2'],
        });

      expect(mockPrisma.memoryBank.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Title',
            content: 'New Content',
            pinned: true,
            importance: 8,
            tags: ['tag1', 'tag2'],
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.findUnique.mockResolvedValue({ id: 'm1' });
      mockPrisma.memoryBank.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put('/api/memory/m1')
        .send({ title: 'Update' });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/memory/:id', () => {
    it('should delete memory', async () => {
      mockPrisma.memoryBank.delete.mockResolvedValue({ id: 'm1' });

      const res = await request(app).delete('/api/memory/m1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe('m1');
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.delete.mockRejectedValue(new Error('Not found'));

      const res = await request(app).delete('/api/memory/nonexistent');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================
  describe('POST /api/memory/bulk', () => {
    it('should bulk create memories', async () => {
      mockPrisma.memoryBank.createMany.mockResolvedValue({ count: 3 });

      const res = await request(app)
        .post('/api/memory/bulk')
        .send({
          memories: [
            { title: 'Mem 1', content: 'Content 1' },
            { title: 'Mem 2', content: 'Content 2' },
            { title: 'Mem 3', content: 'Content 3' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(3);
    });

    it('should reject empty array', async () => {
      const res = await request(app)
        .post('/api/memory/bulk')
        .send({ memories: [] });

      expect(res.status).toBe(400);
    });

    it('should reject missing memories', async () => {
      const res = await request(app)
        .post('/api/memory/bulk')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('memories array is required');
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.createMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/memory/bulk')
        .send({ memories: [{ title: 'Test', content: 'Test' }] });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/memory/cleanup', () => {
    it('should cleanup expired memories', async () => {
      mockPrisma.memoryBank.deleteMany
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce({ count: 0 });

      const res = await request(app).post('/api/memory/cleanup');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deleted.expired).toBe(5);
    });

    it('should cleanup session memories when sessionId provided', async () => {
      mockPrisma.memoryBank.deleteMany
        .mockResolvedValueOnce({ count: 2 })
        .mockResolvedValueOnce({ count: 10 });

      const res = await request(app)
        .post('/api/memory/cleanup')
        .send({ sessionId: 'sess-1' });

      expect(res.status).toBe(200);
      expect(res.body.deleted.session).toBe(10);
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.deleteMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/api/memory/cleanup');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  describe('GET /api/memory/stats/overview', () => {
    it('should return memory statistics', async () => {
      mockPrisma.memoryBank.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(25);
      mockPrisma.memoryBank.groupBy
        .mockResolvedValueOnce([
          { scope: 'PROJECT', _count: { id: 60 } },
          { scope: 'GLOBAL', _count: { id: 40 } },
        ])
        .mockResolvedValueOnce([
          { type: 'FACT', _count: { id: 30 } },
          { type: 'CONTEXT', _count: { id: 70 } },
        ]);

      const res = await request(app).get('/api/memory/stats/overview');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(100);
      expect(res.body.byScope.PROJECT).toBe(60);
      expect(res.body.byType.FACT).toBe(30);
      expect(res.body.pinned).toBe(10);
    });

    it('should filter by projectId', async () => {
      mockPrisma.memoryBank.count.mockResolvedValue(50);
      mockPrisma.memoryBank.groupBy.mockResolvedValue([]);

      await request(app).get('/api/memory/stats/overview?projectId=proj-1');

      expect(mockPrisma.memoryBank.count).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.count.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/memory/stats/overview');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/memory/meta/categories', () => {
    it('should return unique categories', async () => {
      mockPrisma.memoryBank.findMany.mockResolvedValue([
        { category: 'Architecture' },
        { category: 'Security' },
        { category: 'Performance' },
      ]);

      const res = await request(app).get('/api/memory/meta/categories');

      expect(res.status).toBe(200);
      expect(res.body).toContain('Architecture');
      expect(res.body).toContain('Security');
    });

    it('should handle database errors', async () => {
      mockPrisma.memoryBank.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/memory/meta/categories');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/memory/meta/types', () => {
    it('should return available memory types', async () => {
      const res = await request(app).get('/api/memory/meta/types');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 'FACT' }),
          expect.objectContaining({ value: 'INSTRUCTION' }),
          expect.objectContaining({ value: 'CONTEXT' }),
        ])
      );
    });
  });
});

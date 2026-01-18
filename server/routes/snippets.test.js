/**
 * Snippets Routes Tests
 * Phase 5.3: Test Coverage for Command Snippets API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createSnippetsRouter } from './snippets.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock RBAC middleware
vi.mock('../middleware/rbac.js', () => ({
  buildOwnershipFilter: vi.fn().mockReturnValue({}),
  getOwnerIdForCreate: vi.fn().mockReturnValue('test-user-id'),
}));

// Mock validation middleware
vi.mock('../middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => {
    req.validatedBody = req.body;
    next();
  },
}));

// Mock quota middleware
vi.mock('../middleware/quotas.js', () => ({
  enforceQuota: () => (req, res, next) => next(),
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

describe('Snippets Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testSnippet = {
    id: 'snippet-1',
    name: 'List Files',
    command: 'ls -la',
    description: 'List all files with details',
    category: 'filesystem',
    tags: ['files', 'list', 'common'],
    isFavorite: false,
    usageCount: 10,
    lastUsedAt: new Date(),
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testSnippet2 = {
    id: 'snippet-2',
    name: 'Git Status',
    command: 'git status',
    description: 'Show git repository status',
    category: 'git',
    tags: ['git', 'status', 'common'],
    isFavorite: true,
    usageCount: 25,
    lastUsedAt: new Date(),
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      commandSnippet: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    // Create app with router
    app = express();
    app.use(express.json());

    // Middleware to set test context
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      req.user = { id: 'test-user-id' };
      req.dbUser = { role: 'USER', teamId: null };
      next();
    });

    app.use('/api/snippets', createSnippetsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST SNIPPETS
  // ============================================

  describe('GET /api/snippets', () => {
    it('should return all snippets with pagination', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([testSnippet, testSnippet2]);
      mockPrisma.commandSnippet.count.mockResolvedValue(2);

      const res = await request(app).get('/api/snippets');

      expect(res.status).toBe(200);
      expect(res.body.snippets).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.limit).toBe(100);
      expect(res.body.offset).toBe(0);
    });

    it('should filter by category', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([testSnippet2]);
      mockPrisma.commandSnippet.count.mockResolvedValue(1);

      await request(app).get('/api/snippets?category=git');

      expect(mockPrisma.commandSnippet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'git',
          }),
        })
      );
    });

    it('should filter by favorite status', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([testSnippet2]);
      mockPrisma.commandSnippet.count.mockResolvedValue(1);

      await request(app).get('/api/snippets?favorite=true');

      expect(mockPrisma.commandSnippet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isFavorite: true,
          }),
        })
      );
    });

    it('should filter by tag', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([testSnippet, testSnippet2]);
      mockPrisma.commandSnippet.count.mockResolvedValue(2);

      await request(app).get('/api/snippets?tag=common');

      expect(mockPrisma.commandSnippet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { has: 'common' },
          }),
        })
      );
    });

    it('should search snippets by name, command, or description', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([testSnippet]);
      mockPrisma.commandSnippet.count.mockResolvedValue(1);

      await request(app).get('/api/snippets?search=list');

      expect(mockPrisma.commandSnippet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { name: { contains: 'list', mode: 'insensitive' } },
                  { command: { contains: 'list', mode: 'insensitive' } },
                  { description: { contains: 'list', mode: 'insensitive' } },
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it('should apply pagination with limit and offset', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([]);
      mockPrisma.commandSnippet.count.mockResolvedValue(50);

      const res = await request(app).get('/api/snippets?limit=10&offset=20');

      expect(res.status).toBe(200);
      expect(mockPrisma.commandSnippet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(20);
    });

    it('should order by favorite, then usage count, then created date', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([]);
      mockPrisma.commandSnippet.count.mockResolvedValue(0);

      await request(app).get('/api/snippets');

      expect(mockPrisma.commandSnippet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { isFavorite: 'desc' },
            { usageCount: 'desc' },
            { createdAt: 'desc' },
          ],
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/snippets');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch snippets');
    });
  });

  // ============================================
  // GET CATEGORIES
  // ============================================

  describe('GET /api/snippets/categories', () => {
    it('should return snippet categories with counts', async () => {
      mockPrisma.commandSnippet.groupBy.mockResolvedValue([
        { category: 'git', _count: { id: 10 } },
        { category: 'filesystem', _count: { id: 5 } },
        { category: 'docker', _count: { id: 3 } },
      ]);

      const res = await request(app).get('/api/snippets/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { name: 'git', count: 10 },
        { name: 'filesystem', count: 5 },
        { name: 'docker', count: 3 },
      ]);
    });

    it('should handle empty categories', async () => {
      mockPrisma.commandSnippet.groupBy.mockResolvedValue([]);

      const res = await request(app).get('/api/snippets/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.groupBy.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/snippets/categories');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch categories');
    });
  });

  // ============================================
  // GET TAGS
  // ============================================

  describe('GET /api/snippets/tags', () => {
    it('should return all unique tags with counts', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([
        { tags: ['git', 'common'] },
        { tags: ['git', 'status'] },
        { tags: ['common', 'files'] },
      ]);

      const res = await request(app).get('/api/snippets/tags');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          { name: 'common', count: 2 },
          { name: 'git', count: 2 },
          { name: 'status', count: 1 },
          { name: 'files', count: 1 },
        ])
      );
    });

    it('should handle snippets with no tags', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([
        { tags: null },
        { tags: [] },
        { tags: ['test'] },
      ]);

      const res = await request(app).get('/api/snippets/tags');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ name: 'test', count: 1 }]);
    });

    it('should sort tags by count descending', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([
        { tags: ['a', 'b', 'c'] },
        { tags: ['b', 'c'] },
        { tags: ['c'] },
      ]);

      const res = await request(app).get('/api/snippets/tags');

      expect(res.status).toBe(200);
      expect(res.body[0].name).toBe('c');
      expect(res.body[0].count).toBe(3);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/snippets/tags');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch tags');
    });
  });

  // ============================================
  // GET SINGLE SNIPPET
  // ============================================

  describe('GET /api/snippets/:id', () => {
    it('should return a snippet by id', async () => {
      mockPrisma.commandSnippet.findUnique.mockResolvedValue(testSnippet);

      const res = await request(app).get('/api/snippets/snippet-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('snippet-1');
      expect(res.body.name).toBe('List Files');
    });

    it('should return 404 for non-existent snippet', async () => {
      mockPrisma.commandSnippet.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/snippets/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Snippet not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/snippets/snippet-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch snippet');
    });
  });

  // ============================================
  // CREATE SNIPPET
  // ============================================

  describe('POST /api/snippets', () => {
    it('should create a new snippet', async () => {
      const newSnippet = {
        ...testSnippet,
        id: 'new-snippet',
        name: 'New Snippet',
      };
      mockPrisma.commandSnippet.create.mockResolvedValue(newSnippet);

      const res = await request(app)
        .post('/api/snippets')
        .send({
          title: 'New Snippet',
          command: 'echo "hello"',
          description: 'A test snippet',
          category: 'test',
          tags: ['test', 'echo'],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Snippet');
      expect(mockPrisma.commandSnippet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Snippet',
          command: 'echo "hello"',
          description: 'A test snippet',
          category: 'test',
          tags: ['test', 'echo'],
          isFavorite: false,
          ownerId: 'test-user-id',
        }),
      });
    });

    it('should create snippet with null description and category', async () => {
      mockPrisma.commandSnippet.create.mockResolvedValue(testSnippet);

      await request(app)
        .post('/api/snippets')
        .send({
          title: 'Minimal Snippet',
          command: 'pwd',
        });

      expect(mockPrisma.commandSnippet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
          category: null,
          tags: [],
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'Test', command: 'test' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create snippet');
    });
  });

  // ============================================
  // UPDATE SNIPPET
  // ============================================

  describe('PUT /api/snippets/:id', () => {
    it('should update snippet title', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue({
        ...testSnippet,
        name: 'Updated Name',
      });

      const res = await request(app)
        .put('/api/snippets/snippet-1')
        .send({ title: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update snippet command', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue({
        ...testSnippet,
        command: 'ls -lah',
      });

      await request(app)
        .put('/api/snippets/snippet-1')
        .send({ command: 'ls -lah' });

      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { command: 'ls -lah' },
      });
    });

    it('should update snippet description', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue({
        ...testSnippet,
        description: 'New description',
      });

      await request(app)
        .put('/api/snippets/snippet-1')
        .send({ description: 'New description' });

      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { description: 'New description' },
      });
    });

    it('should update snippet tags', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue({
        ...testSnippet,
        tags: ['new', 'tags'],
      });

      await request(app)
        .put('/api/snippets/snippet-1')
        .send({ tags: ['new', 'tags'] });

      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { tags: ['new', 'tags'] },
      });
    });

    it('should update multiple fields at once', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue(testSnippet);

      await request(app)
        .put('/api/snippets/snippet-1')
        .send({
          title: 'New Title',
          command: 'new command',
          category: 'new-cat',
          description: 'new desc',
        });

      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: {
          name: 'New Title',
          command: 'new command',
          category: 'new-cat',
          description: 'new desc',
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/snippets/snippet-1')
        .send({ title: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update snippet');
    });
  });

  // ============================================
  // DELETE SNIPPET
  // ============================================

  describe('DELETE /api/snippets/:id', () => {
    it('should delete a snippet', async () => {
      mockPrisma.commandSnippet.delete.mockResolvedValue(testSnippet);

      const res = await request(app).delete('/api/snippets/snippet-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.commandSnippet.delete).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/snippets/snippet-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete snippet');
    });
  });

  // ============================================
  // RUN SNIPPET
  // ============================================

  describe('POST /api/snippets/:id/run', () => {
    it('should return command and track usage', async () => {
      mockPrisma.commandSnippet.findUnique.mockResolvedValue(testSnippet);
      mockPrisma.commandSnippet.update.mockResolvedValue(testSnippet);

      const res = await request(app).post('/api/snippets/snippet-1/run');

      expect(res.status).toBe(200);
      expect(res.body.command).toBe('ls -la');
      expect(res.body.snippetId).toBe('snippet-1');
      expect(res.body.snippetName).toBe('List Files');
    });

    it('should increment usage count', async () => {
      mockPrisma.commandSnippet.findUnique.mockResolvedValue(testSnippet);
      mockPrisma.commandSnippet.update.mockResolvedValue(testSnippet);

      await request(app).post('/api/snippets/snippet-1/run');

      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: expect.any(Date),
        },
      });
    });

    it('should return 404 for non-existent snippet', async () => {
      mockPrisma.commandSnippet.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/snippets/nonexistent/run');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Snippet not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/snippets/snippet-1/run');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to run snippet');
    });
  });

  // ============================================
  // TOGGLE FAVORITE
  // ============================================

  describe('PUT /api/snippets/:id/favorite', () => {
    it('should set snippet as favorite', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue({
        ...testSnippet,
        isFavorite: true,
      });

      const res = await request(app)
        .put('/api/snippets/snippet-1/favorite')
        .send({ isFavorite: true });

      expect(res.status).toBe(200);
      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { isFavorite: true },
      });
    });

    it('should unfavorite a snippet', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue({
        ...testSnippet,
        isFavorite: false,
      });

      const res = await request(app)
        .put('/api/snippets/snippet-1/favorite')
        .send({ isFavorite: false });

      expect(res.status).toBe(200);
      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { isFavorite: false },
      });
    });

    it('should default to true if isFavorite not provided', async () => {
      mockPrisma.commandSnippet.update.mockResolvedValue({
        ...testSnippet,
        isFavorite: true,
      });

      await request(app)
        .put('/api/snippets/snippet-1/favorite')
        .send({});

      expect(mockPrisma.commandSnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { isFavorite: true },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/snippets/snippet-1/favorite')
        .send({ isFavorite: true });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to toggle favorite');
    });
  });

  // ============================================
  // DUPLICATE SNIPPET
  // ============================================

  describe('POST /api/snippets/:id/duplicate', () => {
    it('should duplicate a snippet', async () => {
      mockPrisma.commandSnippet.findUnique.mockResolvedValue(testSnippet);
      mockPrisma.commandSnippet.create.mockResolvedValue({
        ...testSnippet,
        id: 'duplicated-snippet',
        name: 'List Files (Copy)',
        isFavorite: false,
        usageCount: 0,
      });

      const res = await request(app).post('/api/snippets/snippet-1/duplicate');

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('List Files (Copy)');
      expect(mockPrisma.commandSnippet.create).toHaveBeenCalledWith({
        data: {
          name: 'List Files (Copy)',
          command: testSnippet.command,
          description: testSnippet.description,
          category: testSnippet.category,
          tags: testSnippet.tags,
          isFavorite: false,
          usageCount: 0,
          ownerId: 'test-user-id',
        },
      });
    });

    it('should return 404 for non-existent snippet', async () => {
      mockPrisma.commandSnippet.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/snippets/nonexistent/duplicate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Snippet not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.commandSnippet.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/snippets/snippet-1/duplicate');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to duplicate snippet');
    });
  });
});

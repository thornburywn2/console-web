/**
 * Prompts Routes Tests
 * Phase 5.3: Test Coverage for Prompt Library API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPromptsRouter } from './prompts.js';

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

describe('Prompts Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testPrompt = {
    id: 'prompt-1',
    name: 'Test Prompt',
    content: 'Hello {{name}}, welcome to {{place}}!',
    description: 'A test greeting prompt',
    category: 'greetings',
    variables: [
      { name: 'name', default: 'User' },
      { name: 'place', default: 'Console.web' },
    ],
    isFavorite: false,
    usageCount: 5,
    lastUsedAt: new Date(),
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testPrompt2 = {
    id: 'prompt-2',
    name: 'Debug Prompt',
    content: 'Debug: {{error}}',
    description: 'Debugging template',
    category: 'debugging',
    variables: [{ name: 'error' }],
    isFavorite: true,
    usageCount: 10,
    lastUsedAt: new Date(),
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      prompt: {
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

    app.use('/api/prompts', createPromptsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST PROMPTS
  // ============================================

  describe('GET /api/prompts', () => {
    it('should return all prompts with pagination', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([testPrompt, testPrompt2]);
      mockPrisma.prompt.count.mockResolvedValue(2);

      const res = await request(app).get('/api/prompts');

      expect(res.status).toBe(200);
      expect(res.body.prompts).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.limit).toBe(100);
      expect(res.body.offset).toBe(0);
    });

    it('should filter by category', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([testPrompt]);
      mockPrisma.prompt.count.mockResolvedValue(1);

      await request(app).get('/api/prompts?category=greetings');

      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'greetings',
          }),
        })
      );
    });

    it('should filter by favorite status', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([testPrompt2]);
      mockPrisma.prompt.count.mockResolvedValue(1);

      await request(app).get('/api/prompts?favorite=true');

      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isFavorite: true,
          }),
        })
      );
    });

    it('should search prompts by name, content, or description', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([testPrompt]);
      mockPrisma.prompt.count.mockResolvedValue(1);

      await request(app).get('/api/prompts?search=hello');

      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { name: { contains: 'hello', mode: 'insensitive' } },
                  { content: { contains: 'hello', mode: 'insensitive' } },
                  { description: { contains: 'hello', mode: 'insensitive' } },
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it('should apply pagination with limit and offset', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([]);
      mockPrisma.prompt.count.mockResolvedValue(50);

      const res = await request(app).get('/api/prompts?limit=10&offset=20');

      expect(res.status).toBe(200);
      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(20);
    });

    it('should order by favorite, then usage count, then updated', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([]);
      mockPrisma.prompt.count.mockResolvedValue(0);

      await request(app).get('/api/prompts');

      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { isFavorite: 'desc' },
            { usageCount: 'desc' },
            { updatedAt: 'desc' },
          ],
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/prompts');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch prompts');
    });
  });

  // ============================================
  // GET CATEGORIES
  // ============================================

  describe('GET /api/prompts/categories', () => {
    it('should return prompt categories with counts', async () => {
      mockPrisma.prompt.groupBy.mockResolvedValue([
        { category: 'greetings', _count: { id: 5 } },
        { category: 'debugging', _count: { id: 3 } },
        { category: 'templates', _count: { id: 10 } },
      ]);

      const res = await request(app).get('/api/prompts/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { name: 'greetings', count: 5 },
        { name: 'debugging', count: 3 },
        { name: 'templates', count: 10 },
      ]);
    });

    it('should handle empty categories', async () => {
      mockPrisma.prompt.groupBy.mockResolvedValue([]);

      const res = await request(app).get('/api/prompts/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.groupBy.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/prompts/categories');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch categories');
    });
  });

  // ============================================
  // GET SINGLE PROMPT
  // ============================================

  describe('GET /api/prompts/:id', () => {
    it('should return a prompt by id', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(testPrompt);

      const res = await request(app).get('/api/prompts/prompt-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('prompt-1');
      expect(res.body.name).toBe('Test Prompt');
    });

    it('should return 404 for non-existent prompt', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/prompts/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Prompt not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/prompts/prompt-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch prompt');
    });
  });

  // ============================================
  // CREATE PROMPT
  // ============================================

  describe('POST /api/prompts', () => {
    it('should create a new prompt', async () => {
      const newPrompt = {
        ...testPrompt,
        id: 'new-prompt',
        name: 'New Prompt',
      };
      mockPrisma.prompt.create.mockResolvedValue(newPrompt);

      const res = await request(app)
        .post('/api/prompts')
        .send({
          title: 'New Prompt',
          content: 'Hello {{name}}!',
          category: 'greetings',
          tags: ['name'],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Prompt');
      expect(mockPrisma.prompt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Prompt',
          content: 'Hello {{name}}!',
          category: 'greetings',
          variables: [{ name: 'name' }],
          ownerId: 'test-user-id',
        }),
      });
    });

    it('should create prompt with isFavorite flag', async () => {
      mockPrisma.prompt.create.mockResolvedValue({
        ...testPrompt,
        isFavorite: true,
      });

      await request(app)
        .post('/api/prompts')
        .send({
          title: 'Favorite Prompt',
          content: 'Content',
          isFavorite: true,
        });

      expect(mockPrisma.prompt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isFavorite: true,
        }),
      });
    });

    it('should handle null category', async () => {
      mockPrisma.prompt.create.mockResolvedValue(testPrompt);

      await request(app)
        .post('/api/prompts')
        .send({
          title: 'Uncategorized Prompt',
          content: 'Content',
        });

      expect(mockPrisma.prompt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: null,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/prompts')
        .send({ title: 'Test', content: 'Content' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create prompt');
    });
  });

  // ============================================
  // UPDATE PROMPT
  // ============================================

  describe('PUT /api/prompts/:id', () => {
    it('should update prompt title', async () => {
      mockPrisma.prompt.update.mockResolvedValue({
        ...testPrompt,
        name: 'Updated Prompt',
      });

      const res = await request(app)
        .put('/api/prompts/prompt-1')
        .send({ title: 'Updated Prompt' });

      expect(res.status).toBe(200);
      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: { name: 'Updated Prompt' },
      });
    });

    it('should update prompt content', async () => {
      mockPrisma.prompt.update.mockResolvedValue({
        ...testPrompt,
        content: 'New content',
      });

      await request(app)
        .put('/api/prompts/prompt-1')
        .send({ content: 'New content' });

      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: { content: 'New content' },
      });
    });

    it('should update prompt category', async () => {
      mockPrisma.prompt.update.mockResolvedValue({
        ...testPrompt,
        category: 'new-category',
      });

      await request(app)
        .put('/api/prompts/prompt-1')
        .send({ category: 'new-category' });

      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: { category: 'new-category' },
      });
    });

    it('should update prompt tags/variables', async () => {
      mockPrisma.prompt.update.mockResolvedValue({
        ...testPrompt,
        variables: [{ name: 'var1' }, { name: 'var2' }],
      });

      await request(app)
        .put('/api/prompts/prompt-1')
        .send({ tags: ['var1', 'var2'] });

      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: { variables: [{ name: 'var1' }, { name: 'var2' }] },
      });
    });

    it('should update multiple fields at once', async () => {
      mockPrisma.prompt.update.mockResolvedValue(testPrompt);

      await request(app)
        .put('/api/prompts/prompt-1')
        .send({
          title: 'New Title',
          content: 'New Content',
          category: 'new-cat',
          isFavorite: true,
        });

      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: {
          name: 'New Title',
          content: 'New Content',
          category: 'new-cat',
          isFavorite: true,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/prompts/prompt-1')
        .send({ title: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update prompt');
    });
  });

  // ============================================
  // DELETE PROMPT
  // ============================================

  describe('DELETE /api/prompts/:id', () => {
    it('should delete a prompt', async () => {
      mockPrisma.prompt.delete.mockResolvedValue(testPrompt);

      const res = await request(app).delete('/api/prompts/prompt-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.prompt.delete).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/prompts/prompt-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete prompt');
    });
  });

  // ============================================
  // EXECUTE PROMPT
  // ============================================

  describe('POST /api/prompts/:id/execute', () => {
    it('should execute a prompt with variable interpolation', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(testPrompt);
      mockPrisma.prompt.update.mockResolvedValue(testPrompt);

      const res = await request(app)
        .post('/api/prompts/prompt-1/execute')
        .send({ variables: { name: 'Alice', place: 'Wonderland' } });

      expect(res.status).toBe(200);
      expect(res.body.original).toBe('Hello {{name}}, welcome to {{place}}!');
      expect(res.body.interpolated).toBe('Hello Alice, welcome to Wonderland!');
      expect(res.body.promptId).toBe('prompt-1');
    });

    it('should use default values for missing variables', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(testPrompt);
      mockPrisma.prompt.update.mockResolvedValue(testPrompt);

      const res = await request(app)
        .post('/api/prompts/prompt-1/execute')
        .send({ variables: { name: 'Bob' } });

      expect(res.status).toBe(200);
      expect(res.body.interpolated).toBe('Hello Bob, welcome to Console.web!');
    });

    it('should keep original placeholder if no value or default', async () => {
      const promptNoDefaults = {
        ...testPrompt,
        content: 'Hello {{unknown}}!',
        variables: [],
      };
      mockPrisma.prompt.findUnique.mockResolvedValue(promptNoDefaults);
      mockPrisma.prompt.update.mockResolvedValue(promptNoDefaults);

      const res = await request(app)
        .post('/api/prompts/prompt-1/execute')
        .send({ variables: {} });

      expect(res.status).toBe(200);
      expect(res.body.interpolated).toBe('Hello {{unknown}}!');
    });

    it('should increment usage count on execute', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(testPrompt);
      mockPrisma.prompt.update.mockResolvedValue(testPrompt);

      await request(app)
        .post('/api/prompts/prompt-1/execute')
        .send({ variables: {} });

      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: expect.any(Date),
        },
      });
    });

    it('should return 404 for non-existent prompt', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/prompts/nonexistent/execute')
        .send({ variables: {} });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Prompt not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/prompts/prompt-1/execute')
        .send({ variables: {} });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to execute prompt');
    });
  });

  // ============================================
  // TOGGLE FAVORITE
  // ============================================

  describe('PUT /api/prompts/:id/favorite', () => {
    it('should set prompt as favorite', async () => {
      mockPrisma.prompt.update.mockResolvedValue({
        ...testPrompt,
        isFavorite: true,
      });

      const res = await request(app)
        .put('/api/prompts/prompt-1/favorite')
        .send({ isFavorite: true });

      expect(res.status).toBe(200);
      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: { isFavorite: true },
      });
    });

    it('should unfavorite a prompt', async () => {
      mockPrisma.prompt.update.mockResolvedValue({
        ...testPrompt,
        isFavorite: false,
      });

      const res = await request(app)
        .put('/api/prompts/prompt-1/favorite')
        .send({ isFavorite: false });

      expect(res.status).toBe(200);
      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: { isFavorite: false },
      });
    });

    it('should default to true if isFavorite not provided', async () => {
      mockPrisma.prompt.update.mockResolvedValue({
        ...testPrompt,
        isFavorite: true,
      });

      await request(app)
        .put('/api/prompts/prompt-1/favorite')
        .send({});

      expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-1' },
        data: { isFavorite: true },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/prompts/prompt-1/favorite')
        .send({ isFavorite: true });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to toggle favorite');
    });
  });

  // ============================================
  // DUPLICATE PROMPT
  // ============================================

  describe('POST /api/prompts/:id/duplicate', () => {
    it('should duplicate a prompt', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(testPrompt);
      mockPrisma.prompt.create.mockResolvedValue({
        ...testPrompt,
        id: 'duplicated-prompt',
        name: 'Test Prompt (Copy)',
        isFavorite: false,
        usageCount: 0,
      });

      const res = await request(app).post('/api/prompts/prompt-1/duplicate');

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Prompt (Copy)');
      expect(mockPrisma.prompt.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Prompt (Copy)',
          content: testPrompt.content,
          description: testPrompt.description,
          category: testPrompt.category,
          variables: testPrompt.variables,
          isFavorite: false,
          usageCount: 0,
          ownerId: 'test-user-id',
        },
      });
    });

    it('should return 404 for non-existent prompt', async () => {
      mockPrisma.prompt.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/prompts/nonexistent/duplicate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Prompt not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.prompt.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/prompts/prompt-1/duplicate');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to duplicate prompt');
    });
  });
});

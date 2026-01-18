/**
 * Templates Routes Tests
 * Phase 5.3: Test Coverage for Session Templates API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTemplatesRouter } from './templates.js';

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

describe('Templates Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const builtInTemplate = {
    id: 'template-builtin',
    name: 'Default',
    description: 'Standard Claude Code session',
    icon: '💻',
    commands: ['claude'],
    environment: null,
    workingDir: null,
    isBuiltIn: true,
    usageCount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const customTemplate = {
    id: 'template-custom',
    name: 'My Custom Template',
    description: 'Custom workflow',
    icon: '🚀',
    commands: ['npm test', 'claude'],
    environment: { NODE_ENV: 'test' },
    workingDir: '/home/user/projects',
    isBuiltIn: false,
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      sessionTemplate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
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

    app.use('/api/templates', createTemplatesRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST TEMPLATES
  // ============================================

  describe('GET /api/templates', () => {
    it('should return all templates', async () => {
      mockPrisma.sessionTemplate.findMany.mockResolvedValue([builtInTemplate, customTemplate]);

      const res = await request(app).get('/api/templates');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should order by built-in first, then usage count, then name', async () => {
      mockPrisma.sessionTemplate.findMany.mockResolvedValue([]);

      await request(app).get('/api/templates');

      expect(mockPrisma.sessionTemplate.findMany).toHaveBeenCalledWith({
        orderBy: [
          { isBuiltIn: 'desc' },
          { usageCount: 'desc' },
          { name: 'asc' },
        ],
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTemplate.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/templates');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch templates');
    });
  });

  // ============================================
  // GET SINGLE TEMPLATE
  // ============================================

  describe('GET /api/templates/:id', () => {
    it('should return a template by id', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);

      const res = await request(app).get('/api/templates/template-custom');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('My Custom Template');
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/templates/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTemplate.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/templates/template-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch template');
    });
  });

  // ============================================
  // CREATE TEMPLATE
  // ============================================

  describe('POST /api/templates', () => {
    it('should create a new template', async () => {
      mockPrisma.sessionTemplate.create.mockResolvedValue(customTemplate);

      const res = await request(app)
        .post('/api/templates')
        .send({
          name: 'My Custom Template',
          description: 'Custom workflow',
          icon: '🚀',
          commands: ['npm test', 'claude'],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('My Custom Template');
    });

    it('should trim name and description', async () => {
      mockPrisma.sessionTemplate.create.mockResolvedValue(customTemplate);

      await request(app)
        .post('/api/templates')
        .send({
          name: '  My Template  ',
          description: '  Description  ',
          commands: ['claude'],
        });

      expect(mockPrisma.sessionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My Template',
          description: 'Description',
        }),
      });
    });

    it('should create template with environment and workingDir', async () => {
      mockPrisma.sessionTemplate.create.mockResolvedValue(customTemplate);

      await request(app)
        .post('/api/templates')
        .send({
          name: 'Dev Template',
          commands: ['claude'],
          environment: { DEBUG: 'true' },
          workingDir: '/home/user',
        });

      expect(mockPrisma.sessionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          environment: { DEBUG: 'true' },
          workingDir: '/home/user',
          isBuiltIn: false,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTemplate.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/templates')
        .send({
          name: 'Test',
          commands: ['claude'],
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create template');
    });
  });

  // ============================================
  // UPDATE TEMPLATE
  // ============================================

  describe('PUT /api/templates/:id', () => {
    it('should update a custom template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.update.mockResolvedValue({
        ...customTemplate,
        name: 'Updated Name',
      });

      const res = await request(app)
        .put('/api/templates/template-custom')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/templates/nonexistent')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
    });

    it('should return 403 for built-in template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(builtInTemplate);

      const res = await request(app)
        .put('/api/templates/template-builtin')
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot modify built-in templates');
    });

    it('should update multiple fields', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.update.mockResolvedValue(customTemplate);

      await request(app)
        .put('/api/templates/template-custom')
        .send({
          name: 'New Name',
          description: 'New desc',
          commands: ['npm build', 'claude'],
        });

      expect(mockPrisma.sessionTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-custom' },
        data: {
          name: 'New Name',
          description: 'New desc',
          commands: ['npm build', 'claude'],
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/templates/template-custom')
        .send({ name: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update template');
    });
  });

  // ============================================
  // DELETE TEMPLATE
  // ============================================

  describe('DELETE /api/templates/:id', () => {
    it('should delete a custom template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.delete.mockResolvedValue(customTemplate);

      const res = await request(app).delete('/api/templates/template-custom');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/templates/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
    });

    it('should return 403 for built-in template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(builtInTemplate);

      const res = await request(app).delete('/api/templates/template-builtin');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot delete built-in templates');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/templates/template-custom');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete template');
    });
  });

  // ============================================
  // USE TEMPLATE
  // ============================================

  describe('POST /api/templates/:id/use', () => {
    it('should return template commands and increment usage', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.update.mockResolvedValue(customTemplate);

      const res = await request(app).post('/api/templates/template-custom/use');

      expect(res.status).toBe(200);
      expect(res.body.commands).toEqual(['npm test', 'claude']);
      expect(res.body.templateId).toBe('template-custom');
      expect(res.body.templateName).toBe('My Custom Template');
    });

    it('should increment usage count', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.update.mockResolvedValue(customTemplate);

      await request(app).post('/api/templates/template-custom/use');

      expect(mockPrisma.sessionTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-custom' },
        data: { usageCount: { increment: 1 } },
      });
    });

    it('should return environment and workingDir', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(customTemplate);
      mockPrisma.sessionTemplate.update.mockResolvedValue(customTemplate);

      const res = await request(app).post('/api/templates/template-custom/use');

      expect(res.body.environment).toEqual({ NODE_ENV: 'test' });
      expect(res.body.workingDir).toBe('/home/user/projects');
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/templates/nonexistent/use');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTemplate.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/templates/template-1/use');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to use template');
    });
  });

  // ============================================
  // DUPLICATE TEMPLATE
  // ============================================

  describe('POST /api/templates/:id/duplicate', () => {
    it('should duplicate a template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(builtInTemplate);
      mockPrisma.sessionTemplate.create.mockResolvedValue({
        ...builtInTemplate,
        id: 'template-copy',
        name: 'Default (Custom)',
        isBuiltIn: false,
        usageCount: 0,
      });

      const res = await request(app).post('/api/templates/template-builtin/duplicate');

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Default (Custom)');
      expect(res.body.isBuiltIn).toBe(false);
    });

    it('should create non-built-in duplicate with zero usage', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(builtInTemplate);
      mockPrisma.sessionTemplate.create.mockResolvedValue({
        ...builtInTemplate,
        isBuiltIn: false,
        usageCount: 0,
      });

      await request(app).post('/api/templates/template-builtin/duplicate');

      expect(mockPrisma.sessionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isBuiltIn: false,
          usageCount: 0,
        }),
      });
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.sessionTemplate.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/templates/nonexistent/duplicate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTemplate.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/templates/template-1/duplicate');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to duplicate template');
    });
  });
});

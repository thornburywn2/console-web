/**
 * Contexts Routes Tests
 * Phase 5.3: Test Coverage for Project Context API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createContextsRouter } from './contexts.js';

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

describe('Contexts Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testContext = {
    id: 'ctx-1',
    projectId: 'test-project',
    files: ['src/index.ts', 'src/utils.ts', 'README.md'],
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      projectContext: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api', createContextsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST CONTEXTS
  // ============================================

  describe('GET /api/projects/:projectName/contexts', () => {
    it('should return context items for a project', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(testContext);

      const res = await request(app).get('/api/projects/test-project/contexts');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0]).toHaveProperty('type', 'file');
      expect(res.body[0]).toHaveProperty('value', 'src/index.ts');
    });

    it('should return empty array when no context exists', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/projects/new-project/contexts');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should extract label from file path', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(testContext);

      const res = await request(app).get('/api/projects/test-project/contexts');

      expect(res.body[0].label).toBe('index.ts');
      expect(res.body[1].label).toBe('utils.ts');
      expect(res.body[2].label).toBe('README.md');
    });

    it('should include context id with project and index', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(testContext);

      const res = await request(app).get('/api/projects/test-project/contexts');

      expect(res.body[0].id).toBe('test-project-0');
      expect(res.body[1].id).toBe('test-project-1');
      expect(res.body[2].id).toBe('test-project-2');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.projectContext.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/projects/test-project/contexts');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch contexts');
    });
  });

  // ============================================
  // ADD CONTEXT
  // ============================================

  describe('POST /api/projects/:projectName/contexts', () => {
    it('should add a new context item', async () => {
      mockPrisma.projectContext.upsert.mockResolvedValue({
        ...testContext,
        files: [...testContext.files, 'src/new-file.ts'],
      });

      const res = await request(app)
        .post('/api/projects/test-project/contexts')
        .send({ value: 'src/new-file.ts', type: 'file' });

      expect(res.status).toBe(201);
      expect(res.body.value).toBe('src/new-file.ts');
      expect(res.body.type).toBe('file');
    });

    it('should return 400 when value is missing', async () => {
      const res = await request(app)
        .post('/api/projects/test-project/contexts')
        .send({ type: 'file' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Value is required');
    });

    it('should extract label from value', async () => {
      mockPrisma.projectContext.upsert.mockResolvedValue({
        projectId: 'test-project',
        files: ['path/to/file.js'],
      });

      const res = await request(app)
        .post('/api/projects/test-project/contexts')
        .send({ value: 'path/to/file.js' });

      expect(res.body.label).toBe('file.js');
    });

    it('should use provided label', async () => {
      mockPrisma.projectContext.upsert.mockResolvedValue({
        projectId: 'test-project',
        files: ['config.json'],
      });

      const res = await request(app)
        .post('/api/projects/test-project/contexts')
        .send({ value: 'config.json', label: 'Configuration' });

      expect(res.body.label).toBe('Configuration');
    });

    it('should default type to file', async () => {
      mockPrisma.projectContext.upsert.mockResolvedValue({
        projectId: 'test-project',
        files: ['test.ts'],
      });

      const res = await request(app)
        .post('/api/projects/test-project/contexts')
        .send({ value: 'test.ts' });

      expect(res.body.type).toBe('file');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.projectContext.upsert.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/projects/test-project/contexts')
        .send({ value: 'file.ts' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to add context');
    });
  });

  // ============================================
  // DELETE CONTEXT
  // ============================================

  describe('DELETE /api/projects/:projectName/contexts/:contextId', () => {
    it('should remove a context item', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(testContext);
      mockPrisma.projectContext.update.mockResolvedValue({
        ...testContext,
        files: ['src/utils.ts', 'README.md'],
      });

      const res = await request(app).delete(
        '/api/projects/test-project/contexts/test-project-0'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when context not found', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(null);

      const res = await request(app).delete(
        '/api/projects/test-project/contexts/test-project-0'
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Context not found');
    });

    it('should return 400 for invalid context ID', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(testContext);

      const res = await request(app).delete(
        '/api/projects/test-project/contexts/test-project-invalid'
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid context ID');
    });

    it('should return 400 for out of bounds index', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(testContext);

      const res = await request(app).delete(
        '/api/projects/test-project/contexts/test-project-99'
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid context ID');
    });

    it('should update files array correctly', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(testContext);
      mockPrisma.projectContext.update.mockResolvedValue({});

      await request(app).delete(
        '/api/projects/test-project/contexts/test-project-1'
      );

      expect(mockPrisma.projectContext.update).toHaveBeenCalledWith({
        where: { projectId: 'test-project' },
        data: { files: ['src/index.ts', 'README.md'] },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.projectContext.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete(
        '/api/projects/test-project/contexts/test-project-0'
      );

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to remove context');
    });
  });

  // ============================================
  // REORDER CONTEXTS
  // ============================================

  describe('PUT /api/projects/:projectName/contexts/reorder', () => {
    it('should reorder context items', async () => {
      mockPrisma.projectContext.upsert.mockResolvedValue({});

      const res = await request(app)
        .put('/api/projects/test-project/contexts/reorder')
        .send({ files: ['README.md', 'src/utils.ts', 'src/index.ts'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when files is not an array', async () => {
      const res = await request(app)
        .put('/api/projects/test-project/contexts/reorder')
        .send({ files: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Files array is required');
    });

    it('should return 400 when files is missing', async () => {
      const res = await request(app)
        .put('/api/projects/test-project/contexts/reorder')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Files array is required');
    });

    it('should upsert with new file order', async () => {
      mockPrisma.projectContext.upsert.mockResolvedValue({});
      const newOrder = ['c.ts', 'a.ts', 'b.ts'];

      await request(app)
        .put('/api/projects/test-project/contexts/reorder')
        .send({ files: newOrder });

      expect(mockPrisma.projectContext.upsert).toHaveBeenCalledWith({
        where: { projectId: 'test-project' },
        update: { files: newOrder },
        create: { projectId: 'test-project', files: newOrder },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.projectContext.upsert.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/projects/test-project/contexts/reorder')
        .send({ files: ['a.ts'] });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to reorder contexts');
    });
  });
});

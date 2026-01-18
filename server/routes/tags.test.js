/**
 * Tags Routes Tests
 * Phase 5.3: Test Coverage for Session Tags API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTagsRouter } from './tags.js';

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

describe('Tags Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testTag = {
    id: 'tag-1',
    name: 'important',
    color: '#ef4444',
    description: 'Important sessions that need attention',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { sessions: 5 },
  };

  const testTag2 = {
    id: 'tag-2',
    name: 'in-progress',
    color: '#f59e0b',
    description: 'Work in progress',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { sessions: 3 },
  };

  const testSession = {
    id: 'session-1',
    sessionName: 'test-session',
    displayName: 'Test Session',
    status: 'ACTIVE',
    project: { name: 'Test Project' },
  };

  const testTagWithSessions = {
    ...testTag,
    sessions: [
      {
        session: {
          id: 'session-1',
          sessionName: 'test-session',
          displayName: 'Test Session',
          status: 'ACTIVE',
          project: { name: 'Test Project' },
        },
      },
    ],
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      sessionTag: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      sessionTagAssignment: {
        findMany: vi.fn(),
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

    app.use('/api/tags', createTagsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST TAGS
  // ============================================

  describe('GET /api/tags', () => {
    it('should return all tags with session counts', async () => {
      mockPrisma.sessionTag.findMany.mockResolvedValue([testTag, testTag2]);

      const res = await request(app).get('/api/tags');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('important');
      expect(res.body[0]._count.sessions).toBe(5);
    });

    it('should order tags by name', async () => {
      mockPrisma.sessionTag.findMany.mockResolvedValue([]);

      await request(app).get('/api/tags');

      expect(mockPrisma.sessionTag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { sessions: true },
          },
        },
      });
    });

    it('should return empty array when no tags exist', async () => {
      mockPrisma.sessionTag.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/tags');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/tags');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch tags');
    });
  });

  // ============================================
  // CREATE TAG
  // ============================================

  describe('POST /api/tags', () => {
    it('should create a new tag', async () => {
      mockPrisma.sessionTag.create.mockResolvedValue(testTag);

      const res = await request(app)
        .post('/api/tags')
        .send({
          name: 'important',
          color: '#ef4444',
          description: 'Important sessions that need attention',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('important');
      expect(mockPrisma.sessionTag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'important',
          color: '#ef4444',
          description: 'Important sessions that need attention',
        }),
        include: expect.any(Object),
      });
    });

    it('should trim tag name and description', async () => {
      mockPrisma.sessionTag.create.mockResolvedValue(testTag);

      await request(app)
        .post('/api/tags')
        .send({
          name: '  important  ',
          color: '#ef4444',
          description: '  Important sessions  ',
        });

      expect(mockPrisma.sessionTag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'important',
          description: 'Important sessions',
        }),
        include: expect.any(Object),
      });
    });

    it('should handle null description', async () => {
      mockPrisma.sessionTag.create.mockResolvedValue(testTag);

      await request(app)
        .post('/api/tags')
        .send({
          name: 'test',
          color: '#000000',
        });

      expect(mockPrisma.sessionTag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should return 409 for duplicate tag name', async () => {
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.sessionTag.create.mockRejectedValue(duplicateError);

      const res = await request(app)
        .post('/api/tags')
        .send({
          name: 'existing',
          color: '#000000',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('A tag with this name already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/tags')
        .send({
          name: 'test',
          color: '#000000',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create tag');
    });
  });

  // ============================================
  // GET SINGLE TAG
  // ============================================

  describe('GET /api/tags/:id', () => {
    it('should return a tag by id with sessions', async () => {
      mockPrisma.sessionTag.findUnique.mockResolvedValue(testTagWithSessions);

      const res = await request(app).get('/api/tags/tag-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('tag-1');
      expect(res.body.name).toBe('important');
      expect(res.body.sessions).toHaveLength(1);
    });

    it('should return 404 for non-existent tag', async () => {
      mockPrisma.sessionTag.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/tags/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Tag not found');
    });

    it('should include session count', async () => {
      mockPrisma.sessionTag.findUnique.mockResolvedValue(testTagWithSessions);

      await request(app).get('/api/tags/tag-1');

      expect(mockPrisma.sessionTag.findUnique).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        include: expect.objectContaining({
          _count: { select: { sessions: true } },
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/tags/tag-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch tag');
    });
  });

  // ============================================
  // UPDATE TAG
  // ============================================

  describe('PATCH /api/tags/:id', () => {
    it('should update tag name', async () => {
      mockPrisma.sessionTag.update.mockResolvedValue({
        ...testTag,
        name: 'critical',
      });

      const res = await request(app)
        .patch('/api/tags/tag-1')
        .send({ name: 'critical' });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'critical' },
        include: expect.any(Object),
      });
    });

    it('should update tag color', async () => {
      mockPrisma.sessionTag.update.mockResolvedValue({
        ...testTag,
        color: '#22c55e',
      });

      await request(app)
        .patch('/api/tags/tag-1')
        .send({ color: '#22c55e' });

      expect(mockPrisma.sessionTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { color: '#22c55e' },
        include: expect.any(Object),
      });
    });

    it('should update tag description', async () => {
      mockPrisma.sessionTag.update.mockResolvedValue({
        ...testTag,
        description: 'New description',
      });

      await request(app)
        .patch('/api/tags/tag-1')
        .send({ description: 'New description' });

      expect(mockPrisma.sessionTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { description: 'New description' },
        include: expect.any(Object),
      });
    });

    it('should trim name and description when updating', async () => {
      mockPrisma.sessionTag.update.mockResolvedValue(testTag);

      await request(app)
        .patch('/api/tags/tag-1')
        .send({
          name: '  updated  ',
          description: '  Updated description  ',
        });

      expect(mockPrisma.sessionTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: {
          name: 'updated',
          description: 'Updated description',
        },
        include: expect.any(Object),
      });
    });

    it('should update multiple fields at once', async () => {
      mockPrisma.sessionTag.update.mockResolvedValue(testTag);

      await request(app)
        .patch('/api/tags/tag-1')
        .send({
          name: 'new-name',
          color: '#000000',
          description: 'New desc',
        });

      expect(mockPrisma.sessionTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: {
          name: 'new-name',
          color: '#000000',
          description: 'New desc',
        },
        include: expect.any(Object),
      });
    });

    it('should return 404 for non-existent tag', async () => {
      const notFoundError = new Error('Record not found');
      notFoundError.code = 'P2025';
      mockPrisma.sessionTag.update.mockRejectedValue(notFoundError);

      const res = await request(app)
        .patch('/api/tags/nonexistent')
        .send({ name: 'updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Tag not found');
    });

    it('should return 409 for duplicate tag name', async () => {
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.sessionTag.update.mockRejectedValue(duplicateError);

      const res = await request(app)
        .patch('/api/tags/tag-1')
        .send({ name: 'existing' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('A tag with this name already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .patch('/api/tags/tag-1')
        .send({ name: 'updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update tag');
    });
  });

  // ============================================
  // DELETE TAG
  // ============================================

  describe('DELETE /api/tags/:id', () => {
    it('should delete a tag', async () => {
      mockPrisma.sessionTag.delete.mockResolvedValue(testTag);

      const res = await request(app).delete('/api/tags/tag-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.sessionTag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
    });

    it('should return 404 for non-existent tag', async () => {
      const notFoundError = new Error('Record not found');
      notFoundError.code = 'P2025';
      mockPrisma.sessionTag.delete.mockRejectedValue(notFoundError);

      const res = await request(app).delete('/api/tags/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Tag not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/tags/tag-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete tag');
    });
  });

  // ============================================
  // GET TAG SESSIONS
  // ============================================

  describe('GET /api/tags/:id/sessions', () => {
    it('should return all sessions with the tag', async () => {
      mockPrisma.sessionTagAssignment.findMany.mockResolvedValue([
        {
          session: {
            id: 'session-1',
            sessionName: 'test-session',
            displayName: 'Test Session',
            project: { id: 'proj-1', name: 'Test Project', path: '/test' },
            folder: { id: 'folder-1', name: 'Work', color: '#3b82f6', icon: 'folder' },
          },
        },
        {
          session: {
            id: 'session-2',
            sessionName: 'another-session',
            displayName: 'Another Session',
            project: { id: 'proj-2', name: 'Another Project', path: '/another' },
            folder: null,
          },
        },
      ]);

      const res = await request(app).get('/api/tags/tag-1/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].sessionName).toBe('test-session');
      expect(res.body[1].sessionName).toBe('another-session');
    });

    it('should include project and folder info', async () => {
      mockPrisma.sessionTagAssignment.findMany.mockResolvedValue([
        {
          session: {
            id: 'session-1',
            sessionName: 'test-session',
            project: { id: 'proj-1', name: 'Test Project', path: '/test' },
            folder: { id: 'folder-1', name: 'Work', color: '#3b82f6', icon: 'folder' },
          },
        },
      ]);

      const res = await request(app).get('/api/tags/tag-1/sessions');

      expect(res.status).toBe(200);
      expect(res.body[0].project).toBeDefined();
      expect(res.body[0].project.name).toBe('Test Project');
      expect(res.body[0].folder).toBeDefined();
      expect(res.body[0].folder.name).toBe('Work');
    });

    it('should return empty array when no sessions have the tag', async () => {
      mockPrisma.sessionTagAssignment.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/tags/tag-1/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTagAssignment.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/tags/tag-1/sessions');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch sessions');
    });
  });
});

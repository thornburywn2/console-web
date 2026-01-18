/**
 * Tests for Project Tags Routes
 * Tests project tagging, assignments, settings, and notes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createProjectTagsRouter } from './project-tags.js';

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
    projectTag: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    projectTagAssignment: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    projectNote: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

// Create app with router
function createApp(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api', createProjectTagsRouter(prisma));
  return app;
}

// Helper to encode path to base64
function encodePath(path) {
  return Buffer.from(path).toString('base64');
}

describe('Project Tags Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // PROJECT TAGS CRUD
  // ==========================================================================
  describe('GET /api/project-tags', () => {
    it('should return all tags with project count', async () => {
      mockPrisma.projectTag.findMany.mockResolvedValue([
        { id: 't1', name: 'Frontend', color: '#3b82f6', projects: [{ projectId: 'p1' }] },
        { id: 't2', name: 'Backend', color: '#22c55e', projects: [] },
      ]);

      const res = await request(app).get('/api/project-tags');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].projectCount).toBe(1);
      expect(res.body[1].projectCount).toBe(0);
    });

    it('should handle database errors', async () => {
      mockPrisma.projectTag.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/project-tags');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/project-tags', () => {
    it('should create a tag', async () => {
      mockPrisma.projectTag.create.mockResolvedValue({
        id: 'new-tag',
        name: 'DevOps',
        color: '#f59e0b',
      });

      const res = await request(app)
        .post('/api/project-tags')
        .send({ name: 'DevOps', color: '#f59e0b' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('DevOps');
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .post('/api/project-tags')
        .send({ color: '#f59e0b' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('name is required');
    });

    it('should reject missing color', async () => {
      const res = await request(app)
        .post('/api/project-tags')
        .send({ name: 'Tag' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('color is required');
    });

    it('should handle duplicate name', async () => {
      mockPrisma.projectTag.create.mockRejectedValue({ code: 'P2002' });

      const res = await request(app)
        .post('/api/project-tags')
        .send({ name: 'Existing', color: '#000' });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/project-tags/:id', () => {
    it('should update a tag', async () => {
      mockPrisma.projectTag.update.mockResolvedValue({
        id: 't1',
        name: 'Updated',
        color: '#ef4444',
      });

      const res = await request(app)
        .put('/api/project-tags/t1')
        .send({ name: 'Updated', color: '#ef4444' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('should handle duplicate name on update', async () => {
      mockPrisma.projectTag.update.mockRejectedValue({ code: 'P2002' });

      const res = await request(app)
        .put('/api/project-tags/t1')
        .send({ name: 'Existing' });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/project-tags/:id', () => {
    it('should delete a tag', async () => {
      mockPrisma.projectTag.delete.mockResolvedValue({ id: 't1' });

      const res = await request(app).delete('/api/project-tags/t1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // PROJECT TAG ASSIGNMENTS
  // ==========================================================================
  describe('GET /api/projects/by-path/:encodedPath/tags', () => {
    it('should return tags for a project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', path: '/home/user/project' });
      mockPrisma.projectTagAssignment.findMany.mockResolvedValue([
        { tag: { id: 't1', name: 'Frontend' } },
        { tag: { id: 't2', name: 'React' } },
      ]);

      const encoded = encodePath('/home/user/project');
      const res = await request(app).get(`/api/projects/by-path/${encoded}/tags`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should create project if not exists', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({ id: 'new-p', path: '/home/user/new-project' });
      mockPrisma.projectTagAssignment.findMany.mockResolvedValue([]);

      const encoded = encodePath('/home/user/new-project');
      const res = await request(app).get(`/api/projects/by-path/${encoded}/tags`);

      expect(res.status).toBe(200);
      expect(mockPrisma.project.create).toHaveBeenCalled();
    });
  });

  describe('POST /api/projects/by-path/:encodedPath/tags/:tagId', () => {
    it('should assign tag to project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.projectTagAssignment.create.mockResolvedValue({
        projectId: 'p1',
        tagId: 't1',
        tag: { id: 't1', name: 'Frontend' },
      });

      const encoded = encodePath('/home/user/project');
      const res = await request(app).post(`/api/projects/by-path/${encoded}/tags/t1`);

      expect(res.status).toBe(201);
    });

    it('should handle duplicate assignment', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.projectTagAssignment.create.mockRejectedValue({ code: 'P2002' });

      const encoded = encodePath('/home/user/project');
      const res = await request(app).post(`/api/projects/by-path/${encoded}/tags/t1`);

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/projects/by-path/:encodedPath/tags/:tagId', () => {
    it('should remove tag from project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.projectTagAssignment.deleteMany.mockResolvedValue({ count: 1 });

      const encoded = encodePath('/home/user/project');
      const res = await request(app).delete(`/api/projects/by-path/${encoded}/tags/t1`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/projects/:projectId/tags', () => {
    it('should replace all tags for project', async () => {
      mockPrisma.projectTagAssignment.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.projectTagAssignment.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.projectTagAssignment.findMany.mockResolvedValue([
        { tag: { id: 't1' } },
        { tag: { id: 't2' } },
        { tag: { id: 't3' } },
      ]);

      const res = await request(app)
        .put('/api/projects/p1/tags')
        .send({ tagIds: ['t1', 't2', 't3'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('should reject non-array tagIds', async () => {
      const res = await request(app)
        .put('/api/projects/p1/tags')
        .send({ tagIds: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // PROJECT SETTINGS
  // ==========================================================================
  describe('GET /api/projects/by-path/:encodedPath/settings', () => {
    it('should return project settings', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        skipPermissions: true,
        priority: 'high',
        favorited: true,
        description: 'My project',
      });

      const encoded = encodePath('/home/user/project');
      const res = await request(app).get(`/api/projects/by-path/${encoded}/settings`);

      expect(res.status).toBe(200);
      expect(res.body.skipPermissions).toBe(true);
      expect(res.body.priority).toBe('high');
    });
  });

  describe('PATCH /api/projects/by-path/:encodedPath/settings', () => {
    it('should update project settings', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.project.update.mockResolvedValue({
        id: 'p1',
        skipPermissions: false,
        priority: 'low',
        favorited: false,
        description: 'Updated',
      });

      const encoded = encodePath('/home/user/project');
      const res = await request(app)
        .patch(`/api/projects/by-path/${encoded}/settings`)
        .send({ skipPermissions: false, priority: 'low' });

      expect(res.status).toBe(200);
      expect(res.body.skipPermissions).toBe(false);
    });
  });

  // ==========================================================================
  // PROJECT NOTES
  // ==========================================================================
  describe('GET /api/projects/by-path/:encodedPath/notes', () => {
    it('should return project notes', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.projectNote.findMany.mockResolvedValue([
        { id: 'n1', title: 'Note 1', content: 'Content 1', isPinned: true },
        { id: 'n2', title: 'Note 2', content: 'Content 2', isPinned: false },
      ]);

      const encoded = encodePath('/home/user/project');
      const res = await request(app).get(`/api/projects/by-path/${encoded}/notes`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/projects/by-path/:encodedPath/notes', () => {
    it('should create a note', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.projectNote.create.mockResolvedValue({
        id: 'new-note',
        title: 'New Note',
        content: 'Note content',
        isPinned: false,
      });

      const encoded = encodePath('/home/user/project');
      const res = await request(app)
        .post(`/api/projects/by-path/${encoded}/notes`)
        .send({ title: 'New Note', content: 'Note content' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Note');
    });

    it('should reject missing content', async () => {
      const encoded = encodePath('/home/user/project');
      const res = await request(app)
        .post(`/api/projects/by-path/${encoded}/notes`)
        .send({ title: 'Title only' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('content is required');
    });
  });

  describe('PUT /api/projects/notes/:noteId', () => {
    it('should update a note', async () => {
      mockPrisma.projectNote.update.mockResolvedValue({
        id: 'n1',
        title: 'Updated Title',
        content: 'Updated content',
        isPinned: true,
      });

      const res = await request(app)
        .put('/api/projects/notes/n1')
        .send({ title: 'Updated Title', isPinned: true });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/projects/notes/:noteId', () => {
    it('should delete a note', async () => {
      mockPrisma.projectNote.delete.mockResolvedValue({ id: 'n1' });

      const res = await request(app).delete('/api/projects/notes/n1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

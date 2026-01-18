/**
 * Folders Routes Tests
 * Phase 5.3: Test Coverage for Session Folders and Tags API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createFoldersRouter } from './folders.js';

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

describe('Folders Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testFolder = {
    id: 'folder-1',
    name: 'Work Projects',
    color: '#3b82f6',
    icon: 'folder',
    parentId: null,
    sortOrder: 0,
    ownerId: 'test-user-id',
    children: [],
    sessions: [{ id: 'session-1' }, { id: 'session-2' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testChildFolder = {
    id: 'folder-2',
    name: 'Subproject',
    color: '#10b981',
    icon: 'folder',
    parentId: 'folder-1',
    sortOrder: 0,
    ownerId: 'test-user-id',
    children: [],
    sessions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testTag = {
    id: 'tag-1',
    name: 'important',
    color: '#ef4444',
    description: 'Important sessions',
    sessions: [{ sessionId: 'session-1' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testSession = {
    id: 'session-1',
    sessionName: 'test-session',
    displayName: 'Test Session',
    projectPath: '/home/user/projects/test',
    folderId: 'folder-1',
    isPinned: false,
    isArchived: false,
    archivedAt: null,
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      sessionFolder: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      sessionTag: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      sessionTagAssignment: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      session: {
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
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

    app.use('/api', createFoldersRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // FOLDERS - LIST
  // ============================================

  describe('GET /api/folders', () => {
    it('should return all folders with hierarchy', async () => {
      mockPrisma.sessionFolder.findMany.mockResolvedValue([testFolder, testChildFolder]);

      const res = await request(app).get('/api/folders');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Work Projects');
    });

    it('should include children and session counts', async () => {
      mockPrisma.sessionFolder.findMany.mockResolvedValue([testFolder]);

      const res = await request(app).get('/api/folders');

      expect(res.status).toBe(200);
      expect(res.body[0].children).toBeDefined();
      expect(res.body[0].sessions).toBeDefined();
    });

    it('should order by sortOrder then name', async () => {
      mockPrisma.sessionFolder.findMany.mockResolvedValue([]);

      await request(app).get('/api/folders');

      expect(mockPrisma.sessionFolder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionFolder.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/folders');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch folders');
    });
  });

  // ============================================
  // FOLDERS - CREATE
  // ============================================

  describe('POST /api/folders', () => {
    it('should create a new folder', async () => {
      mockPrisma.sessionFolder.create.mockResolvedValue(testFolder);

      const res = await request(app)
        .post('/api/folders')
        .send({
          name: 'Work Projects',
          color: '#3b82f6',
          icon: 'folder',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Work Projects');
      expect(mockPrisma.sessionFolder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Work Projects',
          color: '#3b82f6',
          icon: 'folder',
          ownerId: 'test-user-id',
        }),
        include: expect.any(Object),
      });
    });

    it('should create a nested folder with parentId', async () => {
      mockPrisma.sessionFolder.create.mockResolvedValue(testChildFolder);

      const res = await request(app)
        .post('/api/folders')
        .send({
          name: 'Subproject',
          parentId: 'folder-1',
        });

      expect(res.status).toBe(201);
      expect(mockPrisma.sessionFolder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: 'folder-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should trim folder name', async () => {
      mockPrisma.sessionFolder.create.mockResolvedValue(testFolder);

      await request(app)
        .post('/api/folders')
        .send({ name: '  Work Projects  ' });

      expect(mockPrisma.sessionFolder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Work Projects',
        }),
        include: expect.any(Object),
      });
    });

    it('should handle null optional fields', async () => {
      mockPrisma.sessionFolder.create.mockResolvedValue(testFolder);

      await request(app)
        .post('/api/folders')
        .send({ name: 'Minimal Folder' });

      expect(mockPrisma.sessionFolder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          color: null,
          icon: null,
          parentId: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionFolder.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/folders')
        .send({ name: 'Test Folder' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create folder');
    });
  });

  // ============================================
  // FOLDERS - UPDATE
  // ============================================

  describe('PUT /api/folders/:id', () => {
    it('should update folder name', async () => {
      mockPrisma.sessionFolder.update.mockResolvedValue({
        ...testFolder,
        name: 'Updated Name',
      });

      const res = await request(app)
        .put('/api/folders/folder-1')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionFolder.update).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
        data: { name: 'Updated Name' },
        include: expect.any(Object),
      });
    });

    it('should update folder color', async () => {
      mockPrisma.sessionFolder.update.mockResolvedValue({
        ...testFolder,
        color: '#ef4444',
      });

      await request(app)
        .put('/api/folders/folder-1')
        .send({ color: '#ef4444' });

      expect(mockPrisma.sessionFolder.update).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
        data: { color: '#ef4444' },
        include: expect.any(Object),
      });
    });

    it('should update folder parentId', async () => {
      mockPrisma.sessionFolder.update.mockResolvedValue({
        ...testFolder,
        parentId: 'folder-2',
      });

      await request(app)
        .put('/api/folders/folder-1')
        .send({ parentId: 'folder-2' });

      expect(mockPrisma.sessionFolder.update).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
        data: { parentId: 'folder-2' },
        include: expect.any(Object),
      });
    });

    it('should prevent circular reference (folder as own parent)', async () => {
      const res = await request(app)
        .put('/api/folders/folder-1')
        .send({ parentId: 'folder-1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Folder cannot be its own parent');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionFolder.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/folders/folder-1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update folder');
    });
  });

  // ============================================
  // FOLDERS - DELETE
  // ============================================

  describe('DELETE /api/folders/:id', () => {
    it('should delete a folder and move sessions to parent', async () => {
      mockPrisma.sessionFolder.findUnique.mockResolvedValue({
        ...testFolder,
        parentId: 'parent-folder',
      });
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.sessionFolder.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.sessionFolder.delete.mockResolvedValue(testFolder);

      const res = await request(app).delete('/api/folders/folder-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.movedSessions).toBe(2);
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { folderId: 'folder-1' },
        data: { folderId: 'parent-folder' },
      });
    });

    it('should move child folders to parent', async () => {
      mockPrisma.sessionFolder.findUnique.mockResolvedValue({
        ...testFolder,
        children: [testChildFolder],
      });
      mockPrisma.session.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.sessionFolder.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.sessionFolder.delete.mockResolvedValue(testFolder);

      const res = await request(app).delete('/api/folders/folder-1');

      expect(res.status).toBe(200);
      expect(res.body.movedFolders).toBe(1);
    });

    it('should return 404 for non-existent folder', async () => {
      mockPrisma.sessionFolder.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/folders/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Folder not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionFolder.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/folders/folder-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete folder');
    });
  });

  // ============================================
  // FOLDERS - REORDER
  // ============================================

  describe('POST /api/folders/reorder', () => {
    it('should reorder folders', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/folders/reorder')
        .send({
          orders: [
            { id: 'folder-1', sortOrder: 1 },
            { id: 'folder-2', sortOrder: 0 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/folders/reorder')
        .send({ orders: [{ id: 'folder-1', sortOrder: 0 }] });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to reorder folders');
    });
  });

  // ============================================
  // TAGS - LIST
  // ============================================

  describe('GET /api/tags', () => {
    it('should return all tags with session counts', async () => {
      mockPrisma.sessionTag.findMany.mockResolvedValue([testTag]);

      const res = await request(app).get('/api/tags');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('important');
      expect(res.body[0].sessionCount).toBe(1);
    });

    it('should order tags by name', async () => {
      mockPrisma.sessionTag.findMany.mockResolvedValue([]);

      await request(app).get('/api/tags');

      expect(mockPrisma.sessionTag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/tags');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch tags');
    });
  });

  // ============================================
  // TAGS - CREATE
  // ============================================

  describe('POST /api/tags', () => {
    it('should create a new tag', async () => {
      mockPrisma.sessionTag.create.mockResolvedValue(testTag);

      const res = await request(app)
        .post('/api/tags')
        .send({
          name: 'important',
          color: '#ef4444',
          description: 'Important sessions',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('important');
    });

    it('should trim tag name', async () => {
      mockPrisma.sessionTag.create.mockResolvedValue(testTag);

      await request(app)
        .post('/api/tags')
        .send({ name: '  important  ', color: '#ef4444' });

      expect(mockPrisma.sessionTag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'important',
        }),
      });
    });

    it('should handle null description', async () => {
      mockPrisma.sessionTag.create.mockResolvedValue(testTag);

      await request(app)
        .post('/api/tags')
        .send({ name: 'test', color: '#000' });

      expect(mockPrisma.sessionTag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });

    it('should return 409 for duplicate tag name', async () => {
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.sessionTag.create.mockRejectedValue(duplicateError);

      const res = await request(app)
        .post('/api/tags')
        .send({ name: 'existing', color: '#000' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Tag name already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/tags')
        .send({ name: 'test', color: '#000' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create tag');
    });
  });

  // ============================================
  // TAGS - UPDATE
  // ============================================

  describe('PUT /api/tags/:id', () => {
    it('should update tag name', async () => {
      mockPrisma.sessionTag.update.mockResolvedValue({
        ...testTag,
        name: 'critical',
      });

      const res = await request(app)
        .put('/api/tags/tag-1')
        .send({ name: 'critical' });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'critical' },
      });
    });

    it('should update tag color', async () => {
      mockPrisma.sessionTag.update.mockResolvedValue({
        ...testTag,
        color: '#22c55e',
      });

      await request(app)
        .put('/api/tags/tag-1')
        .send({ color: '#22c55e' });

      expect(mockPrisma.sessionTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { color: '#22c55e' },
      });
    });

    it('should return 409 for duplicate tag name', async () => {
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.sessionTag.update.mockRejectedValue(duplicateError);

      const res = await request(app)
        .put('/api/tags/tag-1')
        .send({ name: 'existing' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Tag name already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/tags/tag-1')
        .send({ name: 'updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update tag');
    });
  });

  // ============================================
  // TAGS - DELETE
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

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTag.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/tags/tag-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete tag');
    });
  });

  // ============================================
  // SESSION-TAG ASSIGNMENT
  // ============================================

  describe('POST /api/sessions/:sessionId/tags/:tagId', () => {
    it('should assign a tag to a session', async () => {
      mockPrisma.sessionTagAssignment.create.mockResolvedValue({
        sessionId: 'session-1',
        tagId: 'tag-1',
      });

      const res = await request(app).post('/api/sessions/session-1/tags/tag-1');

      expect(res.status).toBe(201);
      expect(mockPrisma.sessionTagAssignment.create).toHaveBeenCalledWith({
        data: { sessionId: 'session-1', tagId: 'tag-1' },
      });
    });

    it('should return 409 if tag already assigned', async () => {
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.sessionTagAssignment.create.mockRejectedValue(duplicateError);

      const res = await request(app).post('/api/sessions/session-1/tags/tag-1');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Tag already assigned to session');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTagAssignment.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/sessions/session-1/tags/tag-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to assign tag');
    });
  });

  describe('DELETE /api/sessions/:sessionId/tags/:tagId', () => {
    it('should remove a tag from a session', async () => {
      mockPrisma.sessionTagAssignment.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete('/api/sessions/session-1/tags/tag-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.sessionTagAssignment.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1', tagId: 'tag-1' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionTagAssignment.deleteMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/sessions/session-1/tags/tag-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to remove tag');
    });
  });

  // ============================================
  // SESSION - MOVE TO FOLDER
  // ============================================

  describe('PUT /api/sessions/:sessionId/folder', () => {
    it('should move session to a folder', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        folderId: 'folder-2',
      });

      const res = await request(app)
        .put('/api/sessions/session-1/folder')
        .send({ folderId: 'folder-2' });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { folderId: 'folder-2' },
      });
    });

    it('should move session to root (null folderId)', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        folderId: null,
      });

      await request(app)
        .put('/api/sessions/session-1/folder')
        .send({ folderId: null });

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { folderId: null },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.session.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/sessions/session-1/folder')
        .send({ folderId: 'folder-1' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to move session');
    });
  });

  // ============================================
  // SESSION - PIN
  // ============================================

  describe('PUT /api/sessions/:sessionId/pin', () => {
    it('should pin a session', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isPinned: true,
      });

      const res = await request(app)
        .put('/api/sessions/session-1/pin')
        .send({ isPinned: true });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { isPinned: true },
      });
    });

    it('should unpin a session', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isPinned: false,
      });

      await request(app)
        .put('/api/sessions/session-1/pin')
        .send({ isPinned: false });

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { isPinned: false },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.session.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/sessions/session-1/pin')
        .send({ isPinned: true });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to pin session');
    });
  });

  // ============================================
  // SESSION - ARCHIVE
  // ============================================

  describe('PUT /api/sessions/:sessionId/archive', () => {
    it('should archive a session', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isArchived: true,
        archivedAt: expect.any(Date),
      });

      const res = await request(app)
        .put('/api/sessions/session-1/archive')
        .send({ isArchived: true });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          isArchived: true,
          archivedAt: expect.any(Date),
        },
      });
    });

    it('should restore a session (unarchive)', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isArchived: false,
        archivedAt: null,
      });

      await request(app)
        .put('/api/sessions/session-1/archive')
        .send({ isArchived: false });

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.session.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/sessions/session-1/archive')
        .send({ isArchived: true });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to archive session');
    });
  });
});

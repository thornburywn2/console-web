/**
 * Sessions Routes Tests
 * Phase 6: Multi-Tenant Support with RBAC
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createSessionsRouter } from './sessions.js';

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
  buildSessionFilterWithTeam: vi.fn().mockResolvedValue({}),
  getOwnerIdForCreate: vi.fn().mockReturnValue('test-user-id'),
  requireSessionAccess: () => (req, res, next) => {
    if (req.headers['x-deny-access'] === 'true') {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  },
  checkSessionAccess: vi.fn().mockResolvedValue({ canAccess: true, accessLevel: 'ADMIN' }),
  canTeamWrite: vi.fn().mockResolvedValue(true),
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

describe('Sessions Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testSession = {
    id: 'session-1',
    sessionName: 'test-session',
    displayName: 'Test Session',
    projectPath: '/home/user/projects/test',
    status: 'ACTIVE',
    isPinned: false,
    isArchived: false,
    isTemporary: false,
    folderId: null,
    ownerId: 'test-user-id',
    startedAt: new Date(),
    lastActiveAt: new Date(),
    lastAccessed: new Date(),
    folder: null,
    tags: [],
    notes: [],
  };

  const testFolder = {
    id: 'folder-1',
    name: 'Test Folder',
    color: '#00ff00',
  };

  const testTag = {
    id: 'tag-1',
    name: 'important',
    color: '#ff0000',
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      session: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      sessionFolder: {
        findFirst: vi.fn(),
      },
      sessionTag: {
        findFirst: vi.fn(),
      },
      sessionTagAssignment: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      sessionNote: {
        createMany: vi.fn(),
        create: vi.fn(),
      },
      commandHistory: {
        createMany: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
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

    app.use('/api/sessions', createSessionsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST SESSIONS
  // ============================================

  describe('GET /api/sessions', () => {
    it('should return all sessions', async () => {
      mockPrisma.session.findMany.mockResolvedValue([testSession]);

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].sessionName).toBe('test-session');
    });

    it('should filter by archived status', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await request(app).get('/api/sessions?includeArchived=false');

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isArchived: false,
          }),
        })
      );
    });

    it('should include archived when requested', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await request(app).get('/api/sessions?includeArchived=true');

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isArchived: false,
          }),
        })
      );
    });

    it('should filter by folder', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await request(app).get('/api/sessions?folderId=folder-1');

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            folderId: 'folder-1',
          }),
        })
      );
    });

    it('should filter by tag', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await request(app).get('/api/sessions?tagId=tag-1');

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { tagId: 'tag-1' } },
          }),
        })
      );
    });

    it('should order by pinned first, then last accessed', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await request(app).get('/api/sessions');

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isPinned: 'desc' }, { lastAccessed: 'desc' }],
        })
      );
    });
  });

  // ============================================
  // GET SINGLE SESSION
  // ============================================

  describe('GET /api/sessions/:id', () => {
    it('should return a session by id', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(testSession);

      const res = await request(app).get('/api/sessions/session-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('session-1');
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/sessions/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });

    it('should deny access when RBAC fails', async () => {
      const res = await request(app)
        .get('/api/sessions/session-1')
        .set('x-deny-access', 'true');

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // UPDATE SESSION
  // ============================================

  describe('PATCH /api/sessions/:id', () => {
    it('should update session metadata', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        displayName: 'Updated Name',
      });

      const res = await request(app)
        .patch('/api/sessions/session-1')
        .send({ displayName: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { displayName: 'Updated Name' },
        include: expect.any(Object),
      });
    });

    it('should update folder assignment', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        folderId: 'folder-1',
        folder: testFolder,
      });

      const res = await request(app)
        .patch('/api/sessions/session-1')
        .send({ folderId: 'folder-1' });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ folderId: 'folder-1' }),
        })
      );
    });

    it('should update pinned status', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isPinned: true,
      });

      const res = await request(app)
        .patch('/api/sessions/session-1')
        .send({ isPinned: true });

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // PIN/UNPIN SESSION
  // ============================================

  describe('POST /api/sessions/:id/pin', () => {
    it('should toggle pin status', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(testSession);
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isPinned: true,
      });

      const res = await request(app).post('/api/sessions/session-1/pin');

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { isPinned: true },
      });
    });

    it('should unpin a pinned session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        isPinned: true,
      });
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isPinned: false,
      });

      const res = await request(app).post('/api/sessions/session-1/pin');

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { isPinned: false },
      });
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/sessions/nonexistent/pin');

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // ARCHIVE/RESTORE SESSION
  // ============================================

  describe('POST /api/sessions/:id/archive', () => {
    it('should archive a session', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isArchived: true,
        archivedAt: new Date(),
      });

      const res = await request(app).post('/api/sessions/session-1/archive');

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          isArchived: true,
          archivedAt: expect.any(Date),
        },
      });
    });
  });

  describe('POST /api/sessions/:id/restore', () => {
    it('should restore an archived session', async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...testSession,
        isArchived: false,
        archivedAt: null,
      });

      const res = await request(app).post('/api/sessions/session-1/restore');

      expect(res.status).toBe(200);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });
    });
  });

  // ============================================
  // TAG MANAGEMENT
  // ============================================

  describe('POST /api/sessions/:id/tags', () => {
    it('should add tags to a session', async () => {
      mockPrisma.sessionTagAssignment.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        tags: [{ tag: testTag }],
      });

      const res = await request(app)
        .post('/api/sessions/session-1/tags')
        .send({ tagIds: ['tag-1', 'tag-2'] });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionTagAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { sessionId: 'session-1', tagId: 'tag-1' },
          { sessionId: 'session-1', tagId: 'tag-2' },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('DELETE /api/sessions/:id/tags/:tagId', () => {
    it('should remove a tag from a session', async () => {
      mockPrisma.sessionTagAssignment.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        tags: [],
      });

      const res = await request(app).delete('/api/sessions/session-1/tags/tag-1');

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionTagAssignment.deleteMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-1',
          tagId: 'tag-1',
        },
      });
    });
  });

  // ============================================
  // BULK ACTIONS
  // ============================================

  describe('POST /api/sessions/bulk', () => {
    beforeEach(() => {
      mockPrisma.session.findMany.mockResolvedValue([
        { id: 'session-1', ownerId: 'test-user-id', projectPath: '/test' },
        { id: 'session-2', ownerId: 'test-user-id', projectPath: '/test' },
      ]);
    });

    it('should pin multiple sessions', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1', 'session-2'],
          action: 'pin',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.affected).toBe(2);
    });

    it('should unpin multiple sessions', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1', 'session-2'],
          action: 'unpin',
        });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
        data: { isPinned: false },
      });
    });

    it('should archive multiple sessions', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1', 'session-2'],
          action: 'archive',
        });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
        data: { isArchived: true, archivedAt: expect.any(Date) },
      });
    });

    it('should restore multiple sessions', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1', 'session-2'],
          action: 'restore',
        });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
        data: { isArchived: false, archivedAt: null },
      });
    });

    it('should move multiple sessions to folder', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1', 'session-2'],
          action: 'move',
          folderId: 'folder-1',
        });

      expect(res.status).toBe(200);
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
        data: { folderId: 'folder-1' },
      });
    });

    it('should require folderId for move action', async () => {
      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1'],
          action: 'move',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('folderId required');
    });

    it('should add tag to multiple sessions', async () => {
      mockPrisma.sessionTagAssignment.createMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1', 'session-2'],
          action: 'addTag',
          tagId: 'tag-1',
        });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionTagAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { sessionId: 'session-1', tagId: 'tag-1' },
          { sessionId: 'session-2', tagId: 'tag-1' },
        ],
        skipDuplicates: true,
      });
    });

    it('should require tagId for addTag action', async () => {
      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1'],
          action: 'addTag',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tagId required');
    });

    it('should delete multiple sessions', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1', 'session-2'],
          action: 'delete',
        });

      expect(res.status).toBe(200);
      expect(res.body.affected).toBe(2);
    });

    it('should reject unknown action', async () => {
      const res = await request(app)
        .post('/api/sessions/bulk')
        .send({
          sessionIds: ['session-1'],
          action: 'unknown',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Unknown action');
    });
  });

  // ============================================
  // EXPORT SESSION
  // ============================================

  describe('GET /api/sessions/:id/export', () => {
    const sessionWithDetails = {
      ...testSession,
      project: { name: 'Test Project', path: '/home/user/projects/test' },
      folder: testFolder,
      tags: [{ tag: testTag }],
      notes: [
        {
          title: 'Test Note',
          content: 'Note content',
          isPinned: false,
          createdAt: new Date(),
        },
      ],
      commandHistory: [
        {
          command: 'ls -la',
          output: 'file1 file2',
          exitCode: 0,
          executedAt: new Date(),
          duration: 100,
        },
      ],
    };

    it('should export session as JSON', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(sessionWithDetails);

      const res = await request(app).get('/api/sessions/session-1/export');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.exportVersion).toBe('1.0');
      expect(res.body.session.sessionName).toBe('test-session');
    });

    it('should export session as markdown', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(sessionWithDetails);

      const res = await request(app).get('/api/sessions/session-1/export?format=markdown');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/markdown');
      expect(res.text).toContain('# Session Export');
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/sessions/nonexistent/export');

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // IMPORT SESSION
  // ============================================

  describe('POST /api/sessions/import', () => {
    const validExportData = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      exportedFrom: 'Console.web',
      session: {
        displayName: 'Exported Session',
        sessionName: 'exported-session',
        projectName: 'Original Project',
      },
      organization: {
        folder: 'Test Folder',
        tags: [{ name: 'important' }],
      },
      context: {
        notes: [{ title: 'Note', content: 'Content', isPinned: false }],
      },
      commandHistory: [{ command: 'ls', output: '', exitCode: 0 }],
    };

    it('should import session from export data', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/projects/test',
      });
      mockPrisma.sessionFolder.findFirst.mockResolvedValue(testFolder);
      mockPrisma.session.create.mockResolvedValue({
        ...testSession,
        id: 'new-session',
      });
      mockPrisma.sessionNote.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.sessionNote.create.mockResolvedValue({ id: 'note-1' });
      mockPrisma.sessionTag.findFirst.mockResolvedValue(testTag);
      mockPrisma.sessionTagAssignment.create.mockResolvedValue({ id: 'assign-1' });
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        id: 'new-session',
        notes: [],
        tags: [],
      });

      const res = await request(app)
        .post('/api/sessions/import')
        .send({
          exportData: validExportData,
          targetProjectId: 'project-1',
          createNotes: true,
          importHistory: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('should return 404 for non-existent target project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/sessions/import')
        .send({
          exportData: validExportData,
          targetProjectId: 'nonexistent',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Target project not found');
    });

    it('should import command history when requested', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/projects/test',
      });
      mockPrisma.sessionFolder.findFirst.mockResolvedValue(null);
      mockPrisma.session.create.mockResolvedValue({
        ...testSession,
        id: 'new-session',
      });
      mockPrisma.sessionNote.create.mockResolvedValue({ id: 'note-1' });
      mockPrisma.commandHistory.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        id: 'new-session',
      });

      await request(app)
        .post('/api/sessions/import')
        .send({
          exportData: validExportData,
          targetProjectId: 'project-1',
          createNotes: false,
          importHistory: true,
        });

      expect(mockPrisma.commandHistory.createMany).toHaveBeenCalled();
    });
  });

  // ============================================
  // FORK SESSION
  // ============================================

  describe('POST /api/sessions/:id/fork', () => {
    it('should fork a session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        tags: [{ tagId: 'tag-1' }],
        notes: [],
      });
      mockPrisma.session.create.mockResolvedValue({
        ...testSession,
        id: 'forked-session',
        displayName: 'Test Session (Fork)',
        sessionName: 'test-session-fork-12345',
      });

      const res = await request(app).post('/api/sessions/session-1/fork');

      expect(res.status).toBe(201);
      expect(mockPrisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: expect.stringContaining('Fork'),
          }),
        })
      );
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/sessions/nonexistent/fork');

      expect(res.status).toBe(404);
    });

    it('should copy tags to forked session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        tags: [{ tagId: 'tag-1' }, { tagId: 'tag-2' }],
        notes: [],
      });
      mockPrisma.session.create.mockResolvedValue({
        ...testSession,
        id: 'forked-session',
      });

      await request(app).post('/api/sessions/session-1/fork');

      expect(mockPrisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: {
              create: [{ tagId: 'tag-1' }, { tagId: 'tag-2' }],
            },
          }),
        })
      );
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.session.findMany.mockRejectedValue(new Error('Database connection failed'));

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch sessions');
    });

    it('should handle update errors gracefully', async () => {
      mockPrisma.session.update.mockRejectedValue(new Error('Update failed'));

      const res = await request(app)
        .patch('/api/sessions/session-1')
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update session');
    });
  });
});

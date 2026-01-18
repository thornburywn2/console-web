/**
 * Notes Routes Tests
 * Phase 5.3: Test Coverage for Session Notes API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createNotesRouter } from './notes.js';

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

describe('Notes Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testNote = {
    id: 'note-1',
    sessionId: 'session-1',
    title: 'Important Note',
    content: 'This is the note content with **markdown**.',
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testNote2 = {
    id: 'note-2',
    sessionId: 'session-1',
    title: 'Pinned Note',
    content: 'This note is pinned.',
    isPinned: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testSession = {
    id: 'session-1',
    sessionName: 'test-session',
    displayName: 'Test Session',
    project: { name: 'Test Project', path: '/test' },
    notes: [testNote, testNote2],
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      sessionNote: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      session: {
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
      next();
    });

    app.use('/api/notes', createNotesRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // GET NOTES FOR SESSION
  // ============================================

  describe('GET /api/notes/sessions/:sessionId/notes', () => {
    it('should return all notes for a session', async () => {
      mockPrisma.sessionNote.findMany.mockResolvedValue([testNote2, testNote]);

      const res = await request(app).get('/api/notes/sessions/session-1/notes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should order by pinned first, then created date', async () => {
      mockPrisma.sessionNote.findMany.mockResolvedValue([]);

      await request(app).get('/api/notes/sessions/session-1/notes');

      expect(mockPrisma.sessionNote.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionNote.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/notes/sessions/session-1/notes');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch notes');
    });
  });

  // ============================================
  // LIST ALL NOTES
  // ============================================

  describe('GET /api/notes', () => {
    it('should return all notes with pagination', async () => {
      mockPrisma.sessionNote.findMany.mockResolvedValue([testNote, testNote2]);
      mockPrisma.sessionNote.count.mockResolvedValue(2);

      const res = await request(app).get('/api/notes');

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.limit).toBe(50);
      expect(res.body.offset).toBe(0);
    });

    it('should filter by pinned status', async () => {
      mockPrisma.sessionNote.findMany.mockResolvedValue([testNote2]);
      mockPrisma.sessionNote.count.mockResolvedValue(1);

      await request(app).get('/api/notes?pinned=true');

      expect(mockPrisma.sessionNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPinned: true,
          }),
        })
      );
    });

    it('should search notes by title and content', async () => {
      mockPrisma.sessionNote.findMany.mockResolvedValue([testNote]);
      mockPrisma.sessionNote.count.mockResolvedValue(1);

      await request(app).get('/api/notes?search=markdown');

      expect(mockPrisma.sessionNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'markdown', mode: 'insensitive' } },
              { content: { contains: 'markdown', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should apply pagination', async () => {
      mockPrisma.sessionNote.findMany.mockResolvedValue([]);
      mockPrisma.sessionNote.count.mockResolvedValue(100);

      const res = await request(app).get('/api/notes?limit=10&offset=20');

      expect(mockPrisma.sessionNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(20);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionNote.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/notes');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch notes');
    });
  });

  // ============================================
  // GET SINGLE NOTE
  // ============================================

  describe('GET /api/notes/:id', () => {
    it('should return a note by id', async () => {
      mockPrisma.sessionNote.findUnique.mockResolvedValue({
        ...testNote,
        session: testSession,
      });

      const res = await request(app).get('/api/notes/note-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('note-1');
      expect(res.body.title).toBe('Important Note');
    });

    it('should return 404 for non-existent note', async () => {
      mockPrisma.sessionNote.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/notes/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Note not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionNote.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/notes/note-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch note');
    });
  });

  // ============================================
  // CREATE NOTE
  // ============================================

  describe('POST /api/notes', () => {
    it('should create a new note', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(testSession);
      mockPrisma.sessionNote.create.mockResolvedValue(testNote);

      const res = await request(app)
        .post('/api/notes')
        .send({
          sessionId: 'session-1',
          title: 'Important Note',
          content: 'This is the note content.',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Important Note');
    });

    it('should create note without title', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(testSession);
      mockPrisma.sessionNote.create.mockResolvedValue({ ...testNote, title: null });

      await request(app)
        .post('/api/notes')
        .send({
          sessionId: 'session-1',
          content: 'Content only',
        });

      expect(mockPrisma.sessionNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: null,
        }),
      });
    });

    it('should create pinned note', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(testSession);
      mockPrisma.sessionNote.create.mockResolvedValue({ ...testNote, isPinned: true });

      await request(app)
        .post('/api/notes')
        .send({
          sessionId: 'session-1',
          content: 'Pinned content',
          isPinned: true,
        });

      expect(mockPrisma.sessionNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPinned: true,
        }),
      });
    });

    it('should return 404 if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/notes')
        .send({
          sessionId: 'nonexistent',
          content: 'Content',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(testSession);
      mockPrisma.sessionNote.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/notes')
        .send({
          sessionId: 'session-1',
          content: 'Content',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create note');
    });
  });

  // ============================================
  // UPDATE NOTE
  // ============================================

  describe('PUT /api/notes/:id', () => {
    it('should update note title', async () => {
      mockPrisma.sessionNote.update.mockResolvedValue({
        ...testNote,
        title: 'Updated Title',
      });

      const res = await request(app)
        .put('/api/notes/note-1')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { title: 'Updated Title' },
      });
    });

    it('should update note content', async () => {
      mockPrisma.sessionNote.update.mockResolvedValue({
        ...testNote,
        content: 'Updated content',
      });

      await request(app)
        .put('/api/notes/note-1')
        .send({ content: 'Updated content' });

      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { content: 'Updated content' },
      });
    });

    it('should update pinned status', async () => {
      mockPrisma.sessionNote.update.mockResolvedValue({
        ...testNote,
        isPinned: true,
      });

      await request(app)
        .put('/api/notes/note-1')
        .send({ isPinned: true });

      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { isPinned: true },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionNote.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/notes/note-1')
        .send({ title: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update note');
    });
  });

  // ============================================
  // DELETE NOTE
  // ============================================

  describe('DELETE /api/notes/:id', () => {
    it('should delete a note', async () => {
      mockPrisma.sessionNote.delete.mockResolvedValue(testNote);

      const res = await request(app).delete('/api/notes/note-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionNote.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/notes/note-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete note');
    });
  });

  // ============================================
  // TOGGLE PIN
  // ============================================

  describe('PUT /api/notes/:id/pin', () => {
    it('should pin a note', async () => {
      mockPrisma.sessionNote.update.mockResolvedValue({
        ...testNote,
        isPinned: true,
      });

      const res = await request(app)
        .put('/api/notes/note-1/pin')
        .send({ isPinned: true });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { isPinned: true },
      });
    });

    it('should unpin a note', async () => {
      mockPrisma.sessionNote.update.mockResolvedValue({
        ...testNote,
        isPinned: false,
      });

      await request(app)
        .put('/api/notes/note-1/pin')
        .send({ isPinned: false });

      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { isPinned: false },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionNote.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/notes/note-1/pin')
        .send({ isPinned: true });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to toggle pin');
    });
  });

  // ============================================
  // MOVE NOTE
  // ============================================

  describe('PUT /api/notes/:id/move', () => {
    it('should move note to different session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-2' });
      mockPrisma.sessionNote.update.mockResolvedValue({
        ...testNote,
        sessionId: 'session-2',
      });

      const res = await request(app)
        .put('/api/notes/note-1/move')
        .send({ sessionId: 'session-2' });

      expect(res.status).toBe(200);
      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { sessionId: 'session-2' },
      });
    });

    it('should return 404 if target session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/notes/note-1/move')
        .send({ sessionId: 'nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Target session not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.session.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/notes/note-1/move')
        .send({ sessionId: 'session-2' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to move note');
    });
  });

  // ============================================
  // DUPLICATE NOTE
  // ============================================

  describe('POST /api/notes/:id/duplicate', () => {
    it('should duplicate a note in same session', async () => {
      mockPrisma.sessionNote.findUnique.mockResolvedValue(testNote);
      mockPrisma.sessionNote.create.mockResolvedValue({
        ...testNote,
        id: 'note-copy',
        title: 'Important Note (Copy)',
        isPinned: false,
      });

      const res = await request(app).post('/api/notes/note-1/duplicate');

      expect(res.status).toBe(201);
      expect(mockPrisma.sessionNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-1',
          title: 'Important Note (Copy)',
          isPinned: false,
        }),
      });
    });

    it('should duplicate to different session', async () => {
      mockPrisma.sessionNote.findUnique.mockResolvedValue(testNote);
      mockPrisma.sessionNote.create.mockResolvedValue({
        ...testNote,
        id: 'note-copy',
        sessionId: 'session-2',
      });

      await request(app)
        .post('/api/notes/note-1/duplicate')
        .send({ sessionId: 'session-2' });

      expect(mockPrisma.sessionNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-2',
        }),
      });
    });

    it('should return 404 for non-existent note', async () => {
      mockPrisma.sessionNote.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/notes/nonexistent/duplicate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Note not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.sessionNote.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/notes/note-1/duplicate');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to duplicate note');
    });
  });

  // ============================================
  // EXPORT NOTES
  // ============================================

  describe('GET /api/notes/sessions/:sessionId/export', () => {
    it('should export notes as markdown', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(testSession);

      const res = await request(app).get('/api/notes/sessions/session-1/export');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/markdown');
      expect(res.headers['content-disposition']).toContain('test-session-notes.md');
      expect(res.text).toContain('# Session Notes:');
    });

    it('should include pinned indicator in export', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...testSession,
        notes: [testNote2],
      });

      const res = await request(app).get('/api/notes/sessions/session-1/export');

      expect(res.text).toContain('📌');
    });

    it('should return 404 if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/notes/sessions/nonexistent/export');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.session.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/notes/sessions/session-1/export');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to export notes');
    });
  });
});

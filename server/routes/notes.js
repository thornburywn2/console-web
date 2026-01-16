/**
 * Session Notes API Routes
 * Manages markdown notes attached to sessions
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';

const log = createLogger('notes');

export function createNotesRouter(prisma) {
  const router = Router();

  /**
   * Get all notes for a session
   */
  router.get('/sessions/:sessionId/notes', async (req, res) => {
    try {
      const { sessionId } = req.params;

      const notes = await prisma.sessionNote.findMany({
        where: { sessionId },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json(notes);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch notes');
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  /**
   * Get all notes across sessions with optional filtering
   */
  router.get('/', async (req, res) => {
    try {
      const { pinned, search, limit = 50, offset = 0 } = req.query;

      const where = {};

      if (pinned === 'true') {
        where.isPinned = true;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [notes, total] = await Promise.all([
        prisma.sessionNote.findMany({
          where,
          include: {
            session: {
              select: {
                id: true,
                sessionName: true,
                displayName: true,
                project: { select: { name: true } }
              }
            }
          },
          orderBy: [
            { isPinned: 'desc' },
            { updatedAt: 'desc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.sessionNote.count({ where })
      ]);

      res.json({ notes, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch notes');
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  /**
   * Get a single note by ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const note = await prisma.sessionNote.findUnique({
        where: { id },
        include: {
          session: {
            select: {
              id: true,
              sessionName: true,
              displayName: true,
              project: { select: { name: true, path: true } }
            }
          }
        }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      res.json(note);
    } catch (error) {
      log.error({ error: error.message, noteId: req.params.id, requestId: req.id }, 'failed to fetch note');
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  });

  /**
   * Create a new note
   */
  router.post('/', async (req, res) => {
    try {
      const { sessionId, title, content, isPinned } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const note = await prisma.sessionNote.create({
        data: {
          sessionId,
          title: title?.trim() || null,
          content: content.trim(),
          isPinned: isPinned || false
        }
      });

      res.status(201).json(note);
    } catch (error) {
      log.error({ error: error.message, sessionId: req.body.sessionId, requestId: req.id }, 'failed to create note');
      res.status(500).json({ error: 'Failed to create note' });
    }
  });

  /**
   * Update a note
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, isPinned } = req.body;

      const note = await prisma.sessionNote.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title?.trim() || null }),
          ...(content !== undefined && { content: content.trim() }),
          ...(isPinned !== undefined && { isPinned })
        }
      });

      res.json(note);
    } catch (error) {
      log.error({ error: error.message, noteId: req.params.id, requestId: req.id }, 'failed to update note');
      res.status(500).json({ error: 'Failed to update note' });
    }
  });

  /**
   * Delete a note
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.sessionNote.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, noteId: req.params.id, requestId: req.id }, 'failed to delete note');
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  /**
   * Toggle note pin status
   */
  router.put('/:id/pin', async (req, res) => {
    try {
      const { id } = req.params;
      const { isPinned } = req.body;

      const note = await prisma.sessionNote.update({
        where: { id },
        data: { isPinned: isPinned ?? true }
      });

      res.json(note);
    } catch (error) {
      log.error({ error: error.message, noteId: req.params.id, requestId: req.id }, 'failed to toggle note pin');
      res.status(500).json({ error: 'Failed to toggle pin' });
    }
  });

  /**
   * Move note to different session
   */
  router.put('/:id/move', async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Target session ID is required' });
      }

      // Verify target session exists
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        return res.status(404).json({ error: 'Target session not found' });
      }

      const note = await prisma.sessionNote.update({
        where: { id },
        data: { sessionId }
      });

      res.json(note);
    } catch (error) {
      log.error({ error: error.message, noteId: req.params.id, targetSessionId: req.body.sessionId, requestId: req.id }, 'failed to move note');
      res.status(500).json({ error: 'Failed to move note' });
    }
  });

  /**
   * Duplicate a note
   */
  router.post('/:id/duplicate', async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId } = req.body; // Optional: duplicate to different session

      const original = await prisma.sessionNote.findUnique({
        where: { id }
      });

      if (!original) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const duplicate = await prisma.sessionNote.create({
        data: {
          sessionId: sessionId || original.sessionId,
          title: original.title ? `${original.title} (Copy)` : null,
          content: original.content,
          isPinned: false
        }
      });

      res.status(201).json(duplicate);
    } catch (error) {
      log.error({ error: error.message, noteId: req.params.id, requestId: req.id }, 'failed to duplicate note');
      res.status(500).json({ error: 'Failed to duplicate note' });
    }
  });

  /**
   * Export notes for a session as markdown
   */
  router.get('/sessions/:sessionId/export', async (req, res) => {
    try {
      const { sessionId } = req.params;

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          project: { select: { name: true } },
          notes: {
            orderBy: [
              { isPinned: 'desc' },
              { createdAt: 'asc' }
            ]
          }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Build markdown document
      let markdown = `# Session Notes: ${session.displayName || session.sessionName}\n\n`;
      markdown += `**Project:** ${session.project.name}\n`;
      markdown += `**Exported:** ${new Date().toISOString()}\n\n`;
      markdown += `---\n\n`;

      for (const note of session.notes) {
        if (note.isPinned) {
          markdown += `## 📌 ${note.title || 'Pinned Note'}\n\n`;
        } else if (note.title) {
          markdown += `## ${note.title}\n\n`;
        }
        markdown += `${note.content}\n\n`;
        markdown += `*Created: ${note.createdAt.toISOString()}*\n\n`;
        markdown += `---\n\n`;
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${session.sessionName}-notes.md"`);
      res.send(markdown);
    } catch (error) {
      log.error({ error: error.message, sessionId: req.params.sessionId, requestId: req.id }, 'failed to export notes');
      res.status(500).json({ error: 'Failed to export notes' });
    }
  });

  return router;
}

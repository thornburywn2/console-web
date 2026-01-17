/**
 * Session Notes API Routes
 * Manages markdown notes attached to sessions
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import {
  noteCreateSchema,
  noteUpdateSchema,
  noteMoveSchema,
  notePinSchema,
} from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

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
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch notes',
        operation: 'fetch session notes',
        requestId: req.id,
      });
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
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch notes',
        operation: 'fetch notes',
        requestId: req.id,
      });
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
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch note',
        operation: 'fetch note',
        requestId: req.id,
        context: { noteId: req.params.id },
      });
    }
  });

  /**
   * Create a new note
   */
  router.post('/', validateBody(noteCreateSchema), async (req, res) => {
    try {
      const { sessionId, title, content, isPinned } = req.validatedBody;

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
      return sendSafeError(res, error, {
        userMessage: 'Failed to create note',
        operation: 'create note',
        requestId: req.id,
      });
    }
  });

  /**
   * Update a note
   */
  router.put('/:id', validateBody(noteUpdateSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, isPinned } = req.validatedBody;

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
      return sendSafeError(res, error, {
        userMessage: 'Failed to update note',
        operation: 'update note',
        requestId: req.id,
        context: { noteId: req.params.id },
      });
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
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete note',
        operation: 'delete note',
        requestId: req.id,
        context: { noteId: req.params.id },
      });
    }
  });

  /**
   * Toggle note pin status
   */
  router.put('/:id/pin', validateBody(notePinSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const { isPinned } = req.validatedBody;

      const note = await prisma.sessionNote.update({
        where: { id },
        data: { isPinned }
      });

      res.json(note);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to toggle pin',
        operation: 'toggle note pin',
        requestId: req.id,
        context: { noteId: req.params.id },
      });
    }
  });

  /**
   * Move note to different session
   */
  router.put('/:id/move', validateBody(noteMoveSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId } = req.validatedBody;

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
      return sendSafeError(res, error, {
        userMessage: 'Failed to move note',
        operation: 'move note',
        requestId: req.id,
        context: { noteId: req.params.id },
      });
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
      return sendSafeError(res, error, {
        userMessage: 'Failed to duplicate note',
        operation: 'duplicate note',
        requestId: req.id,
        context: { noteId: req.params.id },
      });
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
      return sendSafeError(res, error, {
        userMessage: 'Failed to export notes',
        operation: 'export notes',
        requestId: req.id,
        context: { sessionId: req.params.sessionId },
      });
    }
  });

  return router;
}

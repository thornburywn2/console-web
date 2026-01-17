/**
 * Session Folders and Tags API Routes
 * Manages hierarchical folder organization and tagging for sessions
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import {
  folderSchema,
  folderUpdateSchema,
  folderReorderSchema,
  tagSchema,
  tagUpdateSchema,
  sessionMoveFolderSchema,
  sessionPinSchema,
  sessionArchiveSchema,
} from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('folders');

export function createFoldersRouter(prisma) {
  const router = Router();

  // =============================================================================
  // SESSION FOLDERS
  // =============================================================================

  /**
   * Get all folders with hierarchy
   */
  router.get('/folders', async (req, res) => {
    try {
      const folders = await prisma.sessionFolder.findMany({
        include: {
          children: true,
          sessions: {
            select: { id: true }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });
      res.json(folders);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch folders',
        operation: 'fetch folders',
        requestId: req.id,
      });
    }
  });

  /**
   * Create a new folder
   */
  router.post('/folders', validateBody(folderSchema), async (req, res) => {
    try {
      const { name, color, icon, parentId, sortOrder } = req.validatedBody;

      const folder = await prisma.sessionFolder.create({
        data: {
          name: name.trim(),
          color: color || null,
          icon: icon || null,
          parentId: parentId || null,
          sortOrder: sortOrder ?? 0
        },
        include: {
          children: true,
          sessions: { select: { id: true } }
        }
      });

      res.status(201).json(folder);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create folder',
        operation: 'create folder',
        requestId: req.id,
      });
    }
  });

  /**
   * Update a folder
   */
  router.put('/folders/:id', validateBody(folderUpdateSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, icon, parentId, sortOrder } = req.validatedBody;

      // Prevent circular reference
      if (parentId === id) {
        return res.status(400).json({ error: 'Folder cannot be its own parent' });
      }

      const folder = await prisma.sessionFolder.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(color !== undefined && { color }),
          ...(icon !== undefined && { icon }),
          ...(parentId !== undefined && { parentId }),
          ...(sortOrder !== undefined && { sortOrder })
        },
        include: {
          children: true,
          sessions: { select: { id: true } }
        }
      });

      res.json(folder);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update folder',
        operation: 'update folder',
        requestId: req.id,
        context: { folderId: req.params.id },
      });
    }
  });

  /**
   * Delete a folder (moves sessions to parent or root)
   */
  router.delete('/folders/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Get folder to find parentId for reassignment
      const folder = await prisma.sessionFolder.findUnique({
        where: { id },
        include: { sessions: true, children: true }
      });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      // Move all sessions to parent folder (or root if no parent)
      await prisma.session.updateMany({
        where: { folderId: id },
        data: { folderId: folder.parentId }
      });

      // Move child folders to parent
      await prisma.sessionFolder.updateMany({
        where: { parentId: id },
        data: { parentId: folder.parentId }
      });

      // Delete the folder
      await prisma.sessionFolder.delete({ where: { id } });

      res.json({ success: true, movedSessions: folder.sessions.length, movedFolders: folder.children.length });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete folder',
        operation: 'delete folder',
        requestId: req.id,
        context: { folderId: req.params.id },
      });
    }
  });

  /**
   * Reorder folders
   */
  router.post('/folders/reorder', validateBody(folderReorderSchema), async (req, res) => {
    try {
      const { orders } = req.validatedBody;

      await prisma.$transaction(
        orders.map(({ id, sortOrder }) =>
          prisma.sessionFolder.update({
            where: { id },
            data: { sortOrder }
          })
        )
      );

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to reorder folders',
        operation: 'reorder folders',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // SESSION TAGS
  // =============================================================================

  /**
   * Get all tags
   */
  router.get('/tags', async (req, res) => {
    try {
      const tags = await prisma.sessionTag.findMany({
        include: {
          sessions: {
            select: { sessionId: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Add session count
      const tagsWithCount = tags.map(tag => ({
        ...tag,
        sessionCount: tag.sessions.length
      }));

      res.json(tagsWithCount);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch tags',
        operation: 'fetch tags',
        requestId: req.id,
      });
    }
  });

  /**
   * Create a new tag
   */
  router.post('/tags', validateBody(tagSchema), async (req, res) => {
    try {
      const { name, color, description } = req.validatedBody;

      const tag = await prisma.sessionTag.create({
        data: {
          name: name.trim(),
          color,
          description: description || null
        }
      });

      res.status(201).json(tag);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Tag name already exists' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to create tag',
        operation: 'create tag',
        requestId: req.id,
      });
    }
  });

  /**
   * Update a tag
   */
  router.put('/tags/:id', validateBody(tagUpdateSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, description } = req.validatedBody;

      const tag = await prisma.sessionTag.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(color !== undefined && { color }),
          ...(description !== undefined && { description })
        }
      });

      res.json(tag);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Tag name already exists' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to update tag',
        operation: 'update tag',
        requestId: req.id,
        context: { tagId: req.params.id },
      });
    }
  });

  /**
   * Delete a tag
   */
  router.delete('/tags/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.sessionTag.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete tag',
        operation: 'delete tag',
        requestId: req.id,
        context: { tagId: req.params.id },
      });
    }
  });

  /**
   * Assign tag to session
   */
  router.post('/sessions/:sessionId/tags/:tagId', async (req, res) => {
    try {
      const { sessionId, tagId } = req.params;

      const assignment = await prisma.sessionTagAssignment.create({
        data: { sessionId, tagId }
      });

      res.status(201).json(assignment);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Tag already assigned to session' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to assign tag',
        operation: 'assign tag to session',
        requestId: req.id,
        context: { sessionId: req.params.sessionId, tagId: req.params.tagId },
      });
    }
  });

  /**
   * Remove tag from session
   */
  router.delete('/sessions/:sessionId/tags/:tagId', async (req, res) => {
    try {
      const { sessionId, tagId } = req.params;

      await prisma.sessionTagAssignment.deleteMany({
        where: { sessionId, tagId }
      });

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to remove tag',
        operation: 'remove tag from session',
        requestId: req.id,
        context: { sessionId: req.params.sessionId, tagId: req.params.tagId },
      });
    }
  });

  /**
   * Move session to folder
   */
  router.put('/sessions/:sessionId/folder', validateBody(sessionMoveFolderSchema), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { folderId } = req.validatedBody;

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { folderId }
      });

      res.json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to move session',
        operation: 'move session to folder',
        requestId: req.id,
        context: { sessionId: req.params.sessionId },
      });
    }
  });

  /**
   * Toggle session pin status
   */
  router.put('/sessions/:sessionId/pin', validateBody(sessionPinSchema), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isPinned } = req.validatedBody;

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { isPinned }
      });

      res.json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to pin session',
        operation: 'toggle session pin',
        requestId: req.id,
        context: { sessionId: req.params.sessionId },
      });
    }
  });

  /**
   * Archive session
   */
  router.put('/sessions/:sessionId/archive', validateBody(sessionArchiveSchema), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isArchived } = req.validatedBody;

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: {
          isArchived,
          archivedAt: isArchived ? new Date() : null
        }
      });

      res.json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to archive session',
        operation: 'archive session',
        requestId: req.id,
        context: { sessionId: req.params.sessionId },
      });
    }
  });

  return router;
}

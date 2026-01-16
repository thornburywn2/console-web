/**
 * Session Folders and Tags API Routes
 * Manages hierarchical folder organization and tagging for sessions
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';

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
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch folders');
      res.status(500).json({ error: 'Failed to fetch folders' });
    }
  });

  /**
   * Create a new folder
   */
  router.post('/folders', async (req, res) => {
    try {
      const { name, color, icon, parentId, sortOrder } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Folder name is required' });
      }

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
      log.error({ error: error.message, requestId: req.id }, 'failed to create folder');
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  /**
   * Update a folder
   */
  router.put('/folders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, icon, parentId, sortOrder } = req.body;

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
      log.error({ error: error.message, folderId: req.params.id, requestId: req.id }, 'failed to update folder');
      res.status(500).json({ error: 'Failed to update folder' });
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
      log.error({ error: error.message, folderId: req.params.id, requestId: req.id }, 'failed to delete folder');
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  });

  /**
   * Reorder folders
   */
  router.post('/folders/reorder', async (req, res) => {
    try {
      const { orders } = req.body; // Array of { id, sortOrder }

      if (!Array.isArray(orders)) {
        return res.status(400).json({ error: 'Orders must be an array' });
      }

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
      log.error({ error: error.message, requestId: req.id }, 'failed to reorder folders');
      res.status(500).json({ error: 'Failed to reorder folders' });
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
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch tags');
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  /**
   * Create a new tag
   */
  router.post('/tags', async (req, res) => {
    try {
      const { name, color, description } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Tag name is required' });
      }

      if (!color) {
        return res.status(400).json({ error: 'Tag color is required' });
      }

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
      log.error({ error: error.message, requestId: req.id }, 'failed to create tag');
      res.status(500).json({ error: 'Failed to create tag' });
    }
  });

  /**
   * Update a tag
   */
  router.put('/tags/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;

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
      log.error({ error: error.message, tagId: req.params.id, requestId: req.id }, 'failed to update tag');
      res.status(500).json({ error: 'Failed to update tag' });
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
      log.error({ error: error.message, tagId: req.params.id, requestId: req.id }, 'failed to delete tag');
      res.status(500).json({ error: 'Failed to delete tag' });
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
      log.error({ error: error.message, sessionId: req.params.sessionId, requestId: req.id }, 'failed to assign tag');
      res.status(500).json({ error: 'Failed to assign tag' });
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
      log.error({ error: error.message, sessionId: req.params.sessionId, requestId: req.id }, 'failed to remove tag');
      res.status(500).json({ error: 'Failed to remove tag' });
    }
  });

  /**
   * Move session to folder
   */
  router.put('/sessions/:sessionId/folder', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { folderId } = req.body;

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { folderId: folderId || null }
      });

      res.json(session);
    } catch (error) {
      log.error({ error: error.message, sessionId: req.params.sessionId, requestId: req.id }, 'failed to move session to folder');
      res.status(500).json({ error: 'Failed to move session' });
    }
  });

  /**
   * Toggle session pin status
   */
  router.put('/sessions/:sessionId/pin', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isPinned } = req.body;

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { isPinned: isPinned ?? true }
      });

      res.json(session);
    } catch (error) {
      log.error({ error: error.message, sessionId: req.params.sessionId, requestId: req.id }, 'failed to pin session');
      res.status(500).json({ error: 'Failed to pin session' });
    }
  });

  /**
   * Archive session
   */
  router.put('/sessions/:sessionId/archive', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isArchived } = req.body;

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: {
          isArchived: isArchived ?? true,
          archivedAt: isArchived ? new Date() : null
        }
      });

      res.json(session);
    } catch (error) {
      log.error({ error: error.message, sessionId: req.params.sessionId, requestId: req.id }, 'failed to archive session');
      res.status(500).json({ error: 'Failed to archive session' });
    }
  });

  return router;
}

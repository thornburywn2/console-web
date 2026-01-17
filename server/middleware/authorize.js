/**
 * Resource Authorization Middleware
 *
 * Provides middleware for authorizing access to resources based on ownership.
 * Prevents cross-user access to sessions, notes, folders, and shares.
 */

import { createLogger } from '../services/logger.js';

const log = createLogger('authorize');

/**
 * Create resource authorization middleware factory
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Object} Authorization middleware functions
 */
export function createResourceAuthorizer(prisma) {
  /**
   * Extract user ID from request
   * Supports multiple auth mechanisms (Authentik proxy, session, API key)
   */
  const getUserId = (req) => {
    // Authentik proxy auth (primary method)
    if (req.user?.id) return req.user.id;

    // Session-based auth
    if (req.session?.userId) return req.session.userId;

    // API key user ID
    if (req.apiKeyUser?.id) return req.apiKeyUser.id;

    // For standalone mode, use a default user
    if (process.env.AUTH_ENABLED === 'false') {
      return 'standalone-user';
    }

    return null;
  };

  /**
   * Middleware to verify session ownership
   *
   * @param {string} paramName - Request param containing session ID (default: 'id')
   */
  const session = (paramName = 'id') => async (req, res, next) => {
    try {
      const sessionId = req.params[paramName];
      const userId = getUserId(req);

      if (!userId) {
        log.warn({ sessionId, path: req.path }, 'authorization check with no user');
        return res.status(401).json({ error: 'Authentication required' });
      }

      // In standalone mode, skip ownership check
      if (userId === 'standalone-user') {
        return next();
      }

      const sessionRecord = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { id: true, ownerId: true },
      });

      if (!sessionRecord) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check ownership (null ownerId means legacy session, allow access)
      if (sessionRecord.ownerId && sessionRecord.ownerId !== userId) {
        log.warn({
          sessionId,
          requestedBy: userId,
          ownedBy: sessionRecord.ownerId,
          path: req.path,
        }, 'session access denied - not owner');

        return res.status(403).json({
          error: 'You do not have permission to access this session',
        });
      }

      // Attach session to request for downstream use
      req.authorizedSession = sessionRecord;
      next();
    } catch (error) {
      log.error({ error: error.message, paramName }, 'session authorization error');
      next(error);
    }
  };

  /**
   * Middleware to verify note ownership (via session)
   *
   * @param {string} paramName - Request param containing note ID (default: 'id')
   */
  const note = (paramName = 'id') => async (req, res, next) => {
    try {
      const noteId = req.params[paramName];
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (userId === 'standalone-user') {
        return next();
      }

      const noteRecord = await prisma.sessionNote.findUnique({
        where: { id: noteId },
        include: {
          session: {
            select: { ownerId: true },
          },
        },
      });

      if (!noteRecord) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Check ownership via session (null ownerId means legacy, allow)
      if (noteRecord.session.ownerId && noteRecord.session.ownerId !== userId) {
        log.warn({
          noteId,
          requestedBy: userId,
          ownedBy: noteRecord.session.ownerId,
          path: req.path,
        }, 'note access denied - not owner');

        return res.status(403).json({
          error: 'You do not have permission to access this note',
        });
      }

      req.authorizedNote = noteRecord;
      next();
    } catch (error) {
      log.error({ error: error.message, paramName }, 'note authorization error');
      next(error);
    }
  };

  /**
   * Middleware to verify folder ownership
   *
   * @param {string} paramName - Request param containing folder ID (default: 'id')
   */
  const folder = (paramName = 'id') => async (req, res, next) => {
    try {
      const folderId = req.params[paramName];
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (userId === 'standalone-user') {
        return next();
      }

      const folderRecord = await prisma.sessionFolder.findUnique({
        where: { id: folderId },
        select: { id: true, ownerId: true },
      });

      if (!folderRecord) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      if (folderRecord.ownerId && folderRecord.ownerId !== userId) {
        log.warn({
          folderId,
          requestedBy: userId,
          ownedBy: folderRecord.ownerId,
          path: req.path,
        }, 'folder access denied - not owner');

        return res.status(403).json({
          error: 'You do not have permission to access this folder',
        });
      }

      req.authorizedFolder = folderRecord;
      next();
    } catch (error) {
      log.error({ error: error.message, paramName }, 'folder authorization error');
      next(error);
    }
  };

  /**
   * Middleware to verify share ownership
   *
   * @param {string} paramName - Request param containing share ID (default: 'id')
   */
  const share = (paramName = 'id') => async (req, res, next) => {
    try {
      const shareId = req.params[paramName];
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (userId === 'standalone-user') {
        return next();
      }

      const shareRecord = await prisma.sharedSession.findUnique({
        where: { id: shareId },
        select: { id: true, createdById: true },
      });

      if (!shareRecord) {
        return res.status(404).json({ error: 'Share not found' });
      }

      if (shareRecord.createdById && shareRecord.createdById !== userId) {
        log.warn({
          shareId,
          requestedBy: userId,
          ownedBy: shareRecord.createdById,
          path: req.path,
        }, 'share access denied - not owner');

        return res.status(403).json({
          error: 'You do not have permission to manage this share',
        });
      }

      req.authorizedShare = shareRecord;
      next();
    } catch (error) {
      log.error({ error: error.message, paramName }, 'share authorization error');
      next(error);
    }
  };

  /**
   * Middleware to verify comment ownership (for editing/deleting)
   *
   * @param {string} paramName - Request param containing comment ID (default: 'commentId')
   */
  const comment = (paramName = 'commentId') => async (req, res, next) => {
    try {
      const commentId = req.params[paramName];
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (userId === 'standalone-user') {
        return next();
      }

      const commentRecord = await prisma.sessionComment.findUnique({
        where: { id: commentId },
        select: { id: true, authorId: true },
      });

      if (!commentRecord) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (commentRecord.authorId && commentRecord.authorId !== userId) {
        log.warn({
          commentId,
          requestedBy: userId,
          ownedBy: commentRecord.authorId,
          path: req.path,
        }, 'comment access denied - not author');

        return res.status(403).json({
          error: 'You do not have permission to modify this comment',
        });
      }

      req.authorizedComment = commentRecord;
      next();
    } catch (error) {
      log.error({ error: error.message, paramName }, 'comment authorization error');
      next(error);
    }
  };

  /**
   * Middleware to verify agent ownership
   *
   * @param {string} paramName - Request param containing agent ID (default: 'id')
   */
  const agent = (paramName = 'id') => async (req, res, next) => {
    try {
      const agentId = req.params[paramName];
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (userId === 'standalone-user') {
        return next();
      }

      const agentRecord = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, ownerId: true },
      });

      if (!agentRecord) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Allow access to shared/system agents (null ownerId)
      if (agentRecord.ownerId && agentRecord.ownerId !== userId) {
        log.warn({
          agentId,
          requestedBy: userId,
          ownedBy: agentRecord.ownerId,
          path: req.path,
        }, 'agent access denied - not owner');

        return res.status(403).json({
          error: 'You do not have permission to access this agent',
        });
      }

      req.authorizedAgent = agentRecord;
      next();
    } catch (error) {
      log.error({ error: error.message, paramName }, 'agent authorization error');
      next(error);
    }
  };

  return {
    session,
    note,
    folder,
    share,
    comment,
    agent,
    getUserId,
  };
}

export default createResourceAuthorizer;

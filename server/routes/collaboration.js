/**
 * Collaboration Routes
 * Handles sharing, comments, activity, team, and handoff operations
 */

import { Router } from 'express';
import crypto from 'crypto';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import {
  shareCreateSchema,
  commentSchema,
  handoffInitSchema,
  teamMemberSchema,
  activityCreateSchema,
} from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('collaboration');

// ============================================
// Share Router - Session sharing functionality
// ============================================
export function createShareRouter(prisma) {
  const router = Router();

  // Create a share link for a session
  router.post('/session', validateBody(shareCreateSchema), async (req, res) => {
    try {
      const { sessionId, type, expiryHours, password } = req.validatedBody;

      // Generate unique token
      const token = crypto.randomBytes(16).toString('hex');

      // Calculate expiry
      const expiresAt = expiryHours
        ? new Date(Date.now() + expiryHours * 60 * 60 * 1000)
        : null;

      // Hash password if provided
      const passwordHash = password
        ? crypto.createHash('sha256').update(password).digest('hex')
        : null;

      // Store share record
      const share = await prisma.sharedSession.create({
        data: {
          sessionId,
          token,
          type: type || 'view',
          expiresAt,
          passwordHash,
        },
      });

      // Generate share URL
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:5275';
      const shareUrl = `${baseUrl}/shared/${token}`;

      res.json({
        url: shareUrl,
        token,
        expiresAt,
        type,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create share link',
        operation: 'create share link',
        requestId: req.id,
      });
    }
  });

  // Get shared session by token
  router.get('/session/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.query;

      const share = await prisma.sharedSession.findUnique({
        where: { token },
        include: { session: true },
      });

      if (!share) {
        return res.status(404).json({ error: 'Share not found' });
      }

      // Check expiry
      if (share.expiresAt && new Date() > share.expiresAt) {
        return res.status(410).json({ error: 'Share link has expired' });
      }

      // Check password
      if (share.passwordHash) {
        if (!password) {
          return res.status(401).json({ error: 'Password required', requiresPassword: true });
        }
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        if (inputHash !== share.passwordHash) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Increment view count
      await prisma.sharedSession.update({
        where: { token },
        data: { viewCount: { increment: 1 } },
      });

      res.json({
        session: share.session,
        type: share.type,
        viewCount: share.viewCount + 1,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get shared session',
        operation: 'get shared session',
        requestId: req.id,
      });
    }
  });

  // Revoke share link
  router.delete('/session/:token', async (req, res) => {
    try {
      const { token } = req.params;

      await prisma.sharedSession.delete({
        where: { token },
      });

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to revoke share',
        operation: 'revoke share',
        requestId: req.id,
      });
    }
  });

  // List all shares for a session
  router.get('/session/:sessionId/list', async (req, res) => {
    try {
      const { sessionId } = req.params;

      const shares = await prisma.sharedSession.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ shares });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to list shares',
        operation: 'list shares',
        requestId: req.id,
      });
    }
  });

  return router;
}

// ============================================
// Activity Router - Team activity tracking
// ============================================
export function createActivityRouter(prisma) {
  const router = Router();

  // Get activity feed
  router.get('/', async (req, res) => {
    try {
      const { limit = 50, project, type, offset = 0 } = req.query;

      const where = {};
      if (project) where.project = project;
      if (type && type !== 'all') {
        if (type === 'session') {
          where.type = { in: ['session_created', 'session_ended'] };
        } else {
          where.type = type;
        }
      }

      const activities = await prisma.activity.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      res.json({ activities });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch activities');
      // Return empty for graceful degradation
      res.json({ activities: [] });
    }
  });

  // Log a new activity
  router.post('/', validateBody(activityCreateSchema), async (req, res) => {
    try {
      const { type, actor, target, message, project, metadata } = req.validatedBody;

      const activity = await prisma.activity.create({
        data: {
          type,
          actor: actor || 'System',
          target,
          message,
          project,
          metadata: metadata || {},
          timestamp: new Date(),
        },
      });

      res.json({ activity });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to log activity',
        operation: 'log activity',
        requestId: req.id,
      });
    }
  });

  // Get activity summary
  router.get('/summary', async (req, res) => {
    try {
      const { hours = 24 } = req.query;
      const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

      const [total, byType, byProject] = await Promise.all([
        prisma.activity.count({
          where: { timestamp: { gte: since } },
        }),
        prisma.activity.groupBy({
          by: ['type'],
          where: { timestamp: { gte: since } },
          _count: true,
        }),
        prisma.activity.groupBy({
          by: ['project'],
          where: { timestamp: { gte: since } },
          _count: true,
        }),
      ]);

      res.json({
        total,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {}),
        byProject: byProject.reduce((acc, item) => {
          if (item.project) acc[item.project] = item._count;
          return acc;
        }, {}),
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get activity summary');
      res.json({ total: 0, byType: {}, byProject: {} });
    }
  });

  return router;
}

// ============================================
// Comments Router - Session comments
// ============================================
export function createCommentsRouter(prisma) {
  const router = Router();

  // Get comments for a session
  router.get('/:sessionId/comments', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { line } = req.query;

      const where = { sessionId };
      if (line !== undefined) {
        where.lineNumber = parseInt(line);
      }

      const comments = await prisma.sessionComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      });

      res.json({ comments });
    } catch (error) {
      log.error({ error: error.message, sessionId: req.params.sessionId, requestId: req.id }, 'failed to fetch comments');
      res.json({ comments: [] });
    }
  });

  // Get comment counts by line
  router.get('/:sessionId/comments/counts', async (req, res) => {
    try {
      const { sessionId } = req.params;

      const result = await prisma.sessionComment.groupBy({
        by: ['lineNumber'],
        where: { sessionId },
        _count: true,
      });

      const counts = result.reduce((acc, item) => {
        if (item.lineNumber !== null) {
          acc[item.lineNumber] = item._count;
        }
        return acc;
      }, {});

      res.json({ counts });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch comment counts');
      res.json({ counts: {} });
    }
  });

  // Add a comment
  router.post('/:sessionId/comments', validateBody(commentSchema), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { content, parentId } = req.validatedBody;
      const { lineNumber, authorName } = req.body; // Optional fields not in schema

      const comment = await prisma.sessionComment.create({
        data: {
          sessionId,
          lineNumber: lineNumber !== undefined ? parseInt(lineNumber) : null,
          content: content.trim(),
          authorName: authorName || 'Anonymous',
        },
      });

      // Log activity
      try {
        await prisma.activity.create({
          data: {
            type: 'comment',
            actor: authorName || 'Anonymous',
            target: `Session ${sessionId}`,
            message: lineNumber !== undefined ? `Line ${lineNumber}` : 'General comment',
            timestamp: new Date(),
          },
        });
      } catch (e) {
        // Activity logging is optional
      }

      res.json({ comment });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to add comment',
        operation: 'add comment',
        requestId: req.id,
      });
    }
  });

  // Delete a comment
  router.delete('/:sessionId/comments/:commentId', async (req, res) => {
    try {
      const { commentId } = req.params;

      await prisma.sessionComment.delete({
        where: { id: commentId },
      });

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete comment',
        operation: 'delete comment',
        requestId: req.id,
      });
    }
  });

  return router;
}

// ============================================
// Team Router - Team member management
// ============================================
export function createTeamRouter(prisma) {
  const router = Router();

  // Get team members
  router.get('/members', async (req, res) => {
    try {
      const members = await prisma.teamMember.findMany({
        orderBy: { name: 'asc' },
      });

      res.json({ members });
    } catch (error) {
      // Return demo data for graceful degradation
      res.json({
        members: [
          { id: '1', name: 'Current User', email: 'user@example.com', status: 'online' },
        ],
      });
    }
  });

  // Add team member
  router.post('/members', validateBody(teamMemberSchema), async (req, res) => {
    try {
      const { name, email, role } = req.validatedBody;

      const member = await prisma.teamMember.create({
        data: {
          name,
          email,
          role: role || 'member',
          status: 'offline',
        },
      });

      res.json({ member });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to add team member',
        operation: 'add team member',
        requestId: req.id,
      });
    }
  });

  // Update member status
  router.patch('/members/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const member = await prisma.teamMember.update({
        where: { id },
        data: { status },
      });

      res.json({ member });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update status',
        operation: 'update member status',
        requestId: req.id,
      });
    }
  });

  // Remove team member
  router.delete('/members/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.teamMember.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to remove team member',
        operation: 'remove team member',
        requestId: req.id,
        context: { memberId: req.params.id },
      });
    }
  });

  return router;
}

// ============================================
// Handoff Router - Session handoff functionality
// ============================================
export function createHandoffRouter(prisma) {
  const router = Router();

  // Initiate session handoff
  router.post('/:sessionId/handoff', validateBody(handoffInitSchema), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { toUserId, reason, notes, includeContext } = req.validatedBody;

      // Create handoff record
      const handoff = await prisma.sessionHandoff.create({
        data: {
          sessionId,
          toUserId,
          reason: reason || 'other',
          notes,
          includeContext: includeContext !== false,
          status: 'pending',
        },
      });

      // Log activity
      try {
        await prisma.activity.create({
          data: {
            type: 'handoff',
            actor: 'System',
            target: `Session ${sessionId}`,
            message: `Handoff initiated to user ${toUserId}`,
            timestamp: new Date(),
          },
        });
      } catch (e) {
        // Activity logging is optional
      }

      res.json({ handoff });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to initiate handoff',
        operation: 'initiate handoff',
        requestId: req.id,
        context: { sessionId: req.params.sessionId },
      });
    }
  });

  // Accept handoff
  router.post('/:sessionId/handoff/:handoffId/accept', async (req, res) => {
    try {
      const { sessionId, handoffId } = req.params;

      const handoff = await prisma.sessionHandoff.update({
        where: { id: handoffId },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      // Update session owner if applicable
      try {
        await prisma.session.update({
          where: { id: sessionId },
          data: { ownerId: handoff.toUserId },
        });
      } catch (e) {
        // Session update is optional
      }

      res.json({ handoff, success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to accept handoff',
        operation: 'accept handoff',
        requestId: req.id,
        context: { handoffId: req.params.handoffId },
      });
    }
  });

  // Decline handoff
  router.post('/:sessionId/handoff/:handoffId/decline', async (req, res) => {
    try {
      const { handoffId } = req.params;
      const { reason } = req.body;

      const handoff = await prisma.sessionHandoff.update({
        where: { id: handoffId },
        data: {
          status: 'declined',
          declineReason: reason,
        },
      });

      res.json({ handoff, success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to decline handoff',
        operation: 'decline handoff',
        requestId: req.id,
        context: { handoffId: req.params.handoffId },
      });
    }
  });

  // Get pending handoffs for user
  router.get('/pending', async (req, res) => {
    try {
      const { userId } = req.query;

      const handoffs = await prisma.sessionHandoff.findMany({
        where: {
          toUserId: userId,
          status: 'pending',
        },
        include: { session: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ handoffs });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch pending handoffs');
      res.json({ handoffs: [] });
    }
  });

  return router;
}

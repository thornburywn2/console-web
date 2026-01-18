/**
 * Tests for Collaboration Routes
 * Tests sharing, activity, comments, team, and handoff
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  createShareRouter,
  createActivityRouter,
  createCommentsRouter,
  createTeamRouter,
  createHandoffRouter,
} from './collaboration.js';

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

// Mock validation middleware
vi.mock('../middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => {
    req.validatedBody = req.body;
    next();
  },
}));

// Mock schemas
vi.mock('../validation/schemas.js', () => ({
  shareCreateSchema: {},
  commentSchema: {},
  handoffInitSchema: {},
  teamMemberSchema: {},
  activityCreateSchema: {},
}));

// Create mock prisma
function createMockPrisma() {
  return {
    sharedSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    sessionComment: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    teamMember: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sessionHandoff: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    session: {
      update: vi.fn(),
    },
  };
}

describe('Collaboration Routes', () => {
  let mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ==========================================================================
  // SHARE ROUTER
  // ==========================================================================
  describe('Share Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/share', createShareRouter(mockPrisma));
    });

    describe('POST /api/share/session', () => {
      it('should create a share link', async () => {
        mockPrisma.sharedSession.create.mockResolvedValue({
          id: 'share-1',
          token: 'abc123',
          type: 'view',
          expiresAt: null,
        });

        const res = await request(app)
          .post('/api/share/session')
          .send({ sessionId: 'session-1', type: 'view' });

        expect(res.status).toBe(200);
        expect(res.body.url).toBeDefined();
        expect(res.body.token).toBeDefined();
      });

      it('should set expiry when specified', async () => {
        mockPrisma.sharedSession.create.mockResolvedValue({
          id: 'share-1',
          token: 'abc123',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const res = await request(app)
          .post('/api/share/session')
          .send({ sessionId: 'session-1', expiryHours: 24 });

        expect(res.status).toBe(200);
        expect(res.body.expiresAt).toBeDefined();
      });

      it('should handle database errors', async () => {
        mockPrisma.sharedSession.create.mockRejectedValue(new Error('DB error'));

        const res = await request(app)
          .post('/api/share/session')
          .send({ sessionId: 'session-1' });

        expect(res.status).toBe(500);
      });
    });

    describe('GET /api/share/session/:token', () => {
      it('should return shared session', async () => {
        mockPrisma.sharedSession.findUnique.mockResolvedValue({
          id: 'share-1',
          token: 'abc123',
          type: 'view',
          viewCount: 5,
          session: { id: 'session-1', name: 'Test' },
          passwordHash: null,
          expiresAt: null,
        });
        mockPrisma.sharedSession.update.mockResolvedValue({});

        const res = await request(app).get('/api/share/session/abc123');

        expect(res.status).toBe(200);
        expect(res.body.session).toBeDefined();
        expect(res.body.viewCount).toBe(6);
      });

      it('should return 404 for non-existent share', async () => {
        mockPrisma.sharedSession.findUnique.mockResolvedValue(null);

        const res = await request(app).get('/api/share/session/nonexistent');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Share not found');
      });

      it('should return 410 for expired share', async () => {
        mockPrisma.sharedSession.findUnique.mockResolvedValue({
          token: 'abc123',
          expiresAt: new Date(Date.now() - 1000), // 1 second ago
        });

        const res = await request(app).get('/api/share/session/abc123');

        expect(res.status).toBe(410);
        expect(res.body.error).toBe('Share link has expired');
      });

      it('should require password if set', async () => {
        mockPrisma.sharedSession.findUnique.mockResolvedValue({
          token: 'abc123',
          passwordHash: 'somehash',
          expiresAt: null,
        });

        const res = await request(app).get('/api/share/session/abc123');

        expect(res.status).toBe(401);
        expect(res.body.requiresPassword).toBe(true);
      });

      it('should reject invalid password', async () => {
        mockPrisma.sharedSession.findUnique.mockResolvedValue({
          token: 'abc123',
          passwordHash: 'correcthash',
          expiresAt: null,
        });

        const res = await request(app).get('/api/share/session/abc123?password=wrong');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid password');
      });
    });

    describe('DELETE /api/share/session/:token', () => {
      it('should revoke share', async () => {
        mockPrisma.sharedSession.delete.mockResolvedValue({});

        const res = await request(app).delete('/api/share/session/abc123');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should handle deletion errors', async () => {
        mockPrisma.sharedSession.delete.mockRejectedValue(new Error('Not found'));

        const res = await request(app).delete('/api/share/session/nonexistent');

        expect(res.status).toBe(500);
      });
    });

    describe('GET /api/share/session/:sessionId/list', () => {
      it('should list all shares for session', async () => {
        mockPrisma.sharedSession.findMany.mockResolvedValue([
          { id: 'share-1', token: 'abc', type: 'view' },
          { id: 'share-2', token: 'def', type: 'edit' },
        ]);

        const res = await request(app).get('/api/share/session/session-1/list');

        expect(res.status).toBe(200);
        expect(res.body.shares).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // ACTIVITY ROUTER
  // ==========================================================================
  describe('Activity Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/activity', createActivityRouter(mockPrisma));
    });

    describe('GET /api/activity', () => {
      it('should return activity feed', async () => {
        mockPrisma.activity.findMany.mockResolvedValue([
          { id: 'a1', type: 'session_created', actor: 'User', timestamp: new Date() },
        ]);

        const res = await request(app).get('/api/activity');

        expect(res.status).toBe(200);
        expect(res.body.activities).toBeDefined();
      });

      it('should filter by project', async () => {
        mockPrisma.activity.findMany.mockResolvedValue([]);

        await request(app).get('/api/activity?project=test-project');

        expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ project: 'test-project' }),
          })
        );
      });

      it('should filter by type', async () => {
        mockPrisma.activity.findMany.mockResolvedValue([]);

        await request(app).get('/api/activity?type=session');

        expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              type: { in: ['session_created', 'session_ended'] },
            }),
          })
        );
      });

      it('should return empty array on error', async () => {
        mockPrisma.activity.findMany.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/activity');

        expect(res.status).toBe(200);
        expect(res.body.activities).toEqual([]);
      });
    });

    describe('POST /api/activity', () => {
      it('should create activity entry', async () => {
        mockPrisma.activity.create.mockResolvedValue({
          id: 'a1',
          type: 'custom',
          actor: 'User',
          message: 'Did something',
        });

        const res = await request(app)
          .post('/api/activity')
          .send({
            type: 'custom',
            actor: 'User',
            message: 'Did something',
          });

        expect(res.status).toBe(200);
        expect(res.body.activity).toBeDefined();
      });
    });

    describe('GET /api/activity/summary', () => {
      it('should return activity summary', async () => {
        mockPrisma.activity.count.mockResolvedValue(100);
        mockPrisma.activity.groupBy.mockResolvedValue([
          { type: 'session_created', _count: 50 },
          { type: 'commit', _count: 30 },
        ]);

        const res = await request(app).get('/api/activity/summary');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(100);
        expect(res.body.byType).toBeDefined();
      });

      it('should return defaults on error', async () => {
        mockPrisma.activity.count.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/activity/summary');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(0);
      });
    });
  });

  // ==========================================================================
  // COMMENTS ROUTER
  // ==========================================================================
  describe('Comments Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/sessions', createCommentsRouter(mockPrisma));
    });

    describe('GET /api/sessions/:sessionId/comments', () => {
      it('should return comments for session', async () => {
        mockPrisma.sessionComment.findMany.mockResolvedValue([
          { id: 'c1', content: 'Great work!', lineNumber: 10 },
          { id: 'c2', content: 'Nice', lineNumber: null },
        ]);

        const res = await request(app).get('/api/sessions/session-1/comments');

        expect(res.status).toBe(200);
        expect(res.body.comments).toHaveLength(2);
      });

      it('should filter by line number', async () => {
        mockPrisma.sessionComment.findMany.mockResolvedValue([]);

        await request(app).get('/api/sessions/session-1/comments?line=42');

        expect(mockPrisma.sessionComment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ lineNumber: 42 }),
          })
        );
      });
    });

    describe('GET /api/sessions/:sessionId/comments/counts', () => {
      it('should return comment counts by line', async () => {
        mockPrisma.sessionComment.groupBy.mockResolvedValue([
          { lineNumber: 10, _count: 3 },
          { lineNumber: 20, _count: 1 },
        ]);

        const res = await request(app).get('/api/sessions/session-1/comments/counts');

        expect(res.status).toBe(200);
        expect(res.body.counts).toEqual({ 10: 3, 20: 1 });
      });
    });

    describe('POST /api/sessions/:sessionId/comments', () => {
      it('should add comment', async () => {
        mockPrisma.sessionComment.create.mockResolvedValue({
          id: 'c-new',
          content: 'New comment',
          authorName: 'User',
        });
        mockPrisma.activity.create.mockResolvedValue({});

        const res = await request(app)
          .post('/api/sessions/session-1/comments')
          .send({ content: 'New comment', authorName: 'User' });

        expect(res.status).toBe(200);
        expect(res.body.comment).toBeDefined();
      });

      it('should add line-specific comment', async () => {
        mockPrisma.sessionComment.create.mockResolvedValue({
          id: 'c-new',
          content: 'Line comment',
          lineNumber: 42,
        });
        mockPrisma.activity.create.mockResolvedValue({});

        const res = await request(app)
          .post('/api/sessions/session-1/comments')
          .send({ content: 'Line comment', lineNumber: 42 });

        expect(res.status).toBe(200);
      });
    });

    describe('DELETE /api/sessions/:sessionId/comments/:commentId', () => {
      it('should delete comment', async () => {
        mockPrisma.sessionComment.delete.mockResolvedValue({});

        const res = await request(app).delete('/api/sessions/session-1/comments/c1');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ==========================================================================
  // TEAM ROUTER
  // ==========================================================================
  describe('Team Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/team', createTeamRouter(mockPrisma));
    });

    describe('GET /api/team/members', () => {
      it('should return team members', async () => {
        mockPrisma.teamMember.findMany.mockResolvedValue([
          { id: 'm1', name: 'Alice', status: 'online' },
          { id: 'm2', name: 'Bob', status: 'offline' },
        ]);

        const res = await request(app).get('/api/team/members');

        expect(res.status).toBe(200);
        expect(res.body.members).toHaveLength(2);
      });

      it('should return fallback data on error', async () => {
        mockPrisma.teamMember.findMany.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/team/members');

        expect(res.status).toBe(200);
        expect(res.body.members).toHaveLength(1);
        expect(res.body.members[0].name).toBe('Current User');
      });
    });

    describe('POST /api/team/members', () => {
      it('should add team member', async () => {
        mockPrisma.teamMember.create.mockResolvedValue({
          id: 'm-new',
          name: 'Charlie',
          email: 'charlie@example.com',
          role: 'member',
        });

        const res = await request(app)
          .post('/api/team/members')
          .send({ name: 'Charlie', email: 'charlie@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.member.name).toBe('Charlie');
      });
    });

    describe('PATCH /api/team/members/:id/status', () => {
      it('should update member status', async () => {
        mockPrisma.teamMember.update.mockResolvedValue({
          id: 'm1',
          status: 'away',
        });

        const res = await request(app)
          .patch('/api/team/members/m1/status')
          .send({ status: 'away' });

        expect(res.status).toBe(200);
        expect(res.body.member.status).toBe('away');
      });
    });

    describe('DELETE /api/team/members/:id', () => {
      it('should remove team member', async () => {
        mockPrisma.teamMember.delete.mockResolvedValue({});

        const res = await request(app).delete('/api/team/members/m1');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ==========================================================================
  // HANDOFF ROUTER
  // ==========================================================================
  describe('Handoff Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/sessions', createHandoffRouter(mockPrisma));
    });

    describe('POST /api/sessions/:sessionId/handoff', () => {
      it('should initiate handoff', async () => {
        mockPrisma.sessionHandoff.create.mockResolvedValue({
          id: 'h1',
          sessionId: 'session-1',
          toUserId: 'user-2',
          status: 'pending',
        });
        mockPrisma.activity.create.mockResolvedValue({});

        const res = await request(app)
          .post('/api/sessions/session-1/handoff')
          .send({ toUserId: 'user-2', reason: 'shift_change' });

        expect(res.status).toBe(200);
        expect(res.body.handoff).toBeDefined();
        expect(res.body.handoff.status).toBe('pending');
      });
    });

    describe('POST /api/sessions/:sessionId/handoff/:handoffId/accept', () => {
      it('should accept handoff', async () => {
        mockPrisma.sessionHandoff.update.mockResolvedValue({
          id: 'h1',
          status: 'accepted',
          toUserId: 'user-2',
        });
        mockPrisma.session.update.mockResolvedValue({});

        const res = await request(app).post('/api/sessions/session-1/handoff/h1/accept');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.handoff.status).toBe('accepted');
      });
    });

    describe('POST /api/sessions/:sessionId/handoff/:handoffId/decline', () => {
      it('should decline handoff', async () => {
        mockPrisma.sessionHandoff.update.mockResolvedValue({
          id: 'h1',
          status: 'declined',
          declineReason: 'Too busy',
        });

        const res = await request(app)
          .post('/api/sessions/session-1/handoff/h1/decline')
          .send({ reason: 'Too busy' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.handoff.status).toBe('declined');
      });
    });

    describe('GET /api/sessions/pending', () => {
      it('should return pending handoffs for user', async () => {
        mockPrisma.sessionHandoff.findMany.mockResolvedValue([
          { id: 'h1', sessionId: 'session-1', status: 'pending', session: { name: 'Test' } },
        ]);

        const res = await request(app).get('/api/sessions/pending?userId=user-2');

        expect(res.status).toBe(200);
        expect(res.body.handoffs).toHaveLength(1);
      });

      it('should return empty array on error', async () => {
        mockPrisma.sessionHandoff.findMany.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/sessions/pending?userId=user-2');

        expect(res.status).toBe(200);
        expect(res.body.handoffs).toEqual([]);
      });
    });
  });
});

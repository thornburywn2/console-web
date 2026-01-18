/**
 * Teams Routes Tests
 * Phase 6: Multi-Tenant Support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTeamsRouter } from './teams.js';

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
  requireAdmin: (req, res, next) => {
    if (req.testRole === 'ADMIN' || req.testRole === 'SUPER_ADMIN') {
      return next();
    }
    return res.status(403).json({ error: 'Admin access required' });
  },
  requireSuperAdmin: (req, res, next) => {
    if (req.testRole === 'SUPER_ADMIN') {
      return next();
    }
    return res.status(403).json({ error: 'Super admin access required' });
  },
  auditLog: () => (req, res, next) => next(),
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

describe('Teams Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testTeam = {
    id: 'team-1',
    name: 'Engineering',
    slug: 'engineering',
    description: 'Engineering team',
    defaultRole: 'USER',
    maxMembers: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    projects: [],
    _count: { members: 0, projects: 0 },
  };

  const testUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'USER',
    teamId: null,
  };

  const testAssignment = {
    id: 'assignment-1',
    teamId: 'team-1',
    projectPath: '/home/user/projects/test',
    accessLevel: 'READ_WRITE',
    assignedAt: new Date(),
    assignedBy: 'admin-1',
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      team: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      projectAssignment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    // Create app with router
    app = express();
    app.use(express.json());

    // Middleware to set test user context
    app.use((req, res, next) => {
      req.dbUser = req.headers['x-test-dbuser']
        ? JSON.parse(req.headers['x-test-dbuser'])
        : { role: 'USER', teamId: null };
      req.testRole = req.headers['x-test-role'] || 'USER';
      req.user = { id: 'test-user-id' };
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/teams', createTeamsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // TEAM CRUD TESTS
  // ============================================

  describe('GET /api/teams', () => {
    it('should return all teams for ADMIN users', async () => {
      mockPrisma.team.findMany.mockResolvedValue([testTeam]);

      const res = await request(app)
        .get('/api/teams')
        .set('x-test-role', 'ADMIN')
        .set('x-test-dbuser', JSON.stringify({ role: 'ADMIN', teamId: null }));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Engineering');
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('should return only user\'s team for non-admin users', async () => {
      mockPrisma.team.findMany.mockResolvedValue([testTeam]);

      const res = await request(app)
        .get('/api/teams')
        .set('x-test-role', 'USER')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: 'team-1' }));

      expect(res.status).toBe(200);
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, id: 'team-1' },
        })
      );
    });

    it('should return empty array for users without a team', async () => {
      const res = await request(app)
        .get('/api/teams')
        .set('x-test-role', 'USER')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: null }));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(mockPrisma.team.findMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return team for ADMIN users', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);

      const res = await request(app)
        .get('/api/teams/team-1')
        .set('x-test-role', 'ADMIN')
        .set('x-test-dbuser', JSON.stringify({ role: 'ADMIN', teamId: null }));

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Engineering');
    });

    it('should return team for team members', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);

      const res = await request(app)
        .get('/api/teams/team-1')
        .set('x-test-role', 'USER')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: 'team-1' }));

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Engineering');
    });

    it('should deny access to non-members of other teams', async () => {
      const res = await request(app)
        .get('/api/teams/team-1')
        .set('x-test-role', 'USER')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: 'team-2' }));

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/teams/nonexistent')
        .set('x-test-role', 'ADMIN')
        .set('x-test-dbuser', JSON.stringify({ role: 'ADMIN', teamId: null }));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Team not found');
    });
  });

  describe('POST /api/teams', () => {
    it('should create team for SUPER_ADMIN', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null); // No slug conflict
      mockPrisma.team.create.mockResolvedValue({
        ...testTeam,
        id: 'new-team',
        name: 'New Team',
        slug: 'new-team',
      });

      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'New Team', description: 'A new team' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Team');
      expect(mockPrisma.team.create).toHaveBeenCalled();
    });

    it('should reject ADMIN users', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'ADMIN')
        .send({ name: 'New Team' });

      expect(res.status).toBe(403);
      expect(mockPrisma.team.create).not.toHaveBeenCalled();
    });

    it('should validate team name length', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'A' }); // Too short

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 2 characters');
    });

    it('should validate default role', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'New Team', defaultRole: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('USER or VIEWER');
    });

    it('should handle duplicate team names', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.team.create.mockRejectedValue(duplicateError);

      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'Engineering' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should generate unique slugs for duplicate names', async () => {
      // First call returns existing slug, second returns null
      mockPrisma.team.findUnique
        .mockResolvedValueOnce({ slug: 'new-team' })
        .mockResolvedValueOnce(null);
      mockPrisma.team.create.mockResolvedValue({
        ...testTeam,
        name: 'New Team',
        slug: 'new-team-1',
      });

      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'New Team' });

      expect(res.status).toBe(201);
      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'new-team-1',
          }),
        })
      );
    });
  });

  describe('PUT /api/teams/:id', () => {
    it('should update team for SUPER_ADMIN', async () => {
      mockPrisma.team.findUnique
        .mockResolvedValueOnce(testTeam) // Existing team check
        .mockResolvedValueOnce(null); // Slug conflict check
      mockPrisma.team.update.mockResolvedValue({
        ...testTeam,
        name: 'Updated Team',
      });

      const res = await request(app)
        .put('/api/teams/team-1')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'Updated Team' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Team');
    });

    it('should return 404 for non-existent team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/teams/nonexistent')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'Updated Team' });

      expect(res.status).toBe(404);
    });

    it('should validate name length on update', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);

      const res = await request(app)
        .put('/api/teams/team-1')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'X' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 2 characters');
    });

    it('should update isActive status', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);
      mockPrisma.team.update.mockResolvedValue({
        ...testTeam,
        isActive: false,
      });

      const res = await request(app)
        .put('/api/teams/team-1')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(mockPrisma.team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('should delete team for SUPER_ADMIN', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        ...testTeam,
        _count: { members: 2 },
      });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.team.delete.mockResolvedValue(testTeam);

      const res = await request(app)
        .delete('/api/teams/team-1')
        .set('x-test-role', 'SUPER_ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { teamId: 'team-1' },
        data: { teamId: null },
      });
      expect(mockPrisma.team.delete).toHaveBeenCalled();
    });

    it('should return 404 for non-existent team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/teams/nonexistent')
        .set('x-test-role', 'SUPER_ADMIN');

      expect(res.status).toBe(404);
    });

    it('should reject ADMIN users', async () => {
      const res = await request(app)
        .delete('/api/teams/team-1')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // TEAM MEMBERSHIP TESTS
  // ============================================

  describe('POST /api/teams/:id/members', () => {
    it('should add user to team for ADMIN', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        ...testTeam,
        _count: { members: 5 },
      });
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        teamId: 'team-1',
        role: 'USER',
      });

      const res = await request(app)
        .post('/api/teams/team-1/members')
        .set('x-test-role', 'ADMIN')
        .send({ userId: 'user-1' });

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { teamId: 'team-1', role: 'USER' },
        select: expect.any(Object),
      });
    });

    it('should require userId', async () => {
      const res = await request(app)
        .post('/api/teams/team-1/members')
        .set('x-test-role', 'ADMIN')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('userId is required');
    });

    it('should reject if team is full', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        ...testTeam,
        maxMembers: 5,
        _count: { members: 5 },
      });

      const res = await request(app)
        .post('/api/teams/team-1/members')
        .set('x-test-role', 'ADMIN')
        .send({ userId: 'user-1' });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('maximum members');
    });

    it('should reject if user is already in a team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        ...testTeam,
        _count: { members: 5 },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUser,
        teamId: 'other-team',
      });

      const res = await request(app)
        .post('/api/teams/team-1/members')
        .set('x-test-role', 'ADMIN')
        .send({ userId: 'user-1' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already in a team');
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        ...testTeam,
        _count: { members: 5 },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/teams/team-1/members')
        .set('x-test-role', 'ADMIN')
        .send({ userId: 'nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('User not found');
    });

    it('should use custom role if provided', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        ...testTeam,
        _count: { members: 5 },
      });
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        teamId: 'team-1',
        role: 'VIEWER',
      });

      const res = await request(app)
        .post('/api/teams/team-1/members')
        .set('x-test-role', 'ADMIN')
        .send({ userId: 'user-1', role: 'VIEWER' });

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'VIEWER' }),
        })
      );
    });

    it('should reject invalid role', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        ...testTeam,
        _count: { members: 5 },
      });
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/teams/team-1/members')
        .set('x-test-role', 'ADMIN')
        .send({ userId: 'user-1', role: 'ADMIN' }); // ADMIN not valid for members

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid role');
    });
  });

  describe('DELETE /api/teams/:id/members/:userId', () => {
    it('should remove user from team for ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUser,
        teamId: 'team-1',
      });
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        teamId: null,
      });

      const res = await request(app)
        .delete('/api/teams/team-1/members/user-1')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { teamId: null },
      });
    });

    it('should return 404 if user not in team', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUser,
        teamId: 'other-team',
      });

      const res = await request(app)
        .delete('/api/teams/team-1/members/user-1')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('User not found in this team');
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/teams/team-1/members/nonexistent')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // PROJECT ASSIGNMENT TESTS
  // ============================================

  describe('GET /api/teams/:id/projects', () => {
    it('should return project assignments for ADMIN', async () => {
      mockPrisma.projectAssignment.findMany.mockResolvedValue([testAssignment]);

      const res = await request(app)
        .get('/api/teams/team-1/projects')
        .set('x-test-role', 'ADMIN')
        .set('x-test-dbuser', JSON.stringify({ role: 'ADMIN', teamId: null }));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].projectPath).toBe('/home/user/projects/test');
    });

    it('should return assignments for team members', async () => {
      mockPrisma.projectAssignment.findMany.mockResolvedValue([testAssignment]);

      const res = await request(app)
        .get('/api/teams/team-1/projects')
        .set('x-test-role', 'USER')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: 'team-1' }));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should deny access to non-members', async () => {
      const res = await request(app)
        .get('/api/teams/team-1/projects')
        .set('x-test-role', 'USER')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: 'team-2' }));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/teams/:id/projects', () => {
    it('should assign project to team for ADMIN', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);
      mockPrisma.projectAssignment.create.mockResolvedValue(testAssignment);

      const res = await request(app)
        .post('/api/teams/team-1/projects')
        .set('x-test-role', 'ADMIN')
        .send({ projectPath: '/home/user/projects/test', accessLevel: 'READ_WRITE' });

      expect(res.status).toBe(201);
      expect(res.body.projectPath).toBe('/home/user/projects/test');
    });

    it('should require projectPath', async () => {
      const res = await request(app)
        .post('/api/teams/team-1/projects')
        .set('x-test-role', 'ADMIN')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('projectPath is required');
    });

    it('should validate access level', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);

      const res = await request(app)
        .post('/api/teams/team-1/projects')
        .set('x-test-role', 'ADMIN')
        .send({ projectPath: '/test', accessLevel: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid access level');
    });

    it('should handle duplicate assignment', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.projectAssignment.create.mockRejectedValue(duplicateError);

      const res = await request(app)
        .post('/api/teams/team-1/projects')
        .set('x-test-role', 'ADMIN')
        .send({ projectPath: '/test' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already assigned');
    });

    it('should return 404 for non-existent team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/teams/nonexistent/projects')
        .set('x-test-role', 'ADMIN')
        .send({ projectPath: '/test' });

      expect(res.status).toBe(404);
    });

    it('should default to READ_WRITE access level', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);
      mockPrisma.projectAssignment.create.mockResolvedValue({
        ...testAssignment,
        accessLevel: 'READ_WRITE',
      });

      const res = await request(app)
        .post('/api/teams/team-1/projects')
        .set('x-test-role', 'ADMIN')
        .send({ projectPath: '/test' });

      expect(res.status).toBe(201);
      expect(mockPrisma.projectAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessLevel: 'READ_WRITE',
          }),
        })
      );
    });
  });

  describe('PUT /api/teams/:id/projects/:assignmentId', () => {
    it('should update assignment for ADMIN', async () => {
      mockPrisma.projectAssignment.findUnique.mockResolvedValue(testAssignment);
      mockPrisma.projectAssignment.update.mockResolvedValue({
        ...testAssignment,
        accessLevel: 'ADMIN',
      });

      const res = await request(app)
        .put('/api/teams/team-1/projects/assignment-1')
        .set('x-test-role', 'ADMIN')
        .send({ accessLevel: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(mockPrisma.projectAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { accessLevel: 'ADMIN' },
      });
    });

    it('should return 404 for non-existent assignment', async () => {
      mockPrisma.projectAssignment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/teams/team-1/projects/nonexistent')
        .set('x-test-role', 'ADMIN')
        .send({ accessLevel: 'READ_ONLY' });

      expect(res.status).toBe(404);
    });

    it('should return 404 if assignment belongs to different team', async () => {
      mockPrisma.projectAssignment.findUnique.mockResolvedValue({
        ...testAssignment,
        teamId: 'other-team',
      });

      const res = await request(app)
        .put('/api/teams/team-1/projects/assignment-1')
        .set('x-test-role', 'ADMIN')
        .send({ accessLevel: 'READ_ONLY' });

      expect(res.status).toBe(404);
    });

    it('should validate access level', async () => {
      mockPrisma.projectAssignment.findUnique.mockResolvedValue(testAssignment);

      const res = await request(app)
        .put('/api/teams/team-1/projects/assignment-1')
        .set('x-test-role', 'ADMIN')
        .send({ accessLevel: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid access level');
    });
  });

  describe('DELETE /api/teams/:id/projects/:assignmentId', () => {
    it('should delete assignment for ADMIN', async () => {
      mockPrisma.projectAssignment.findUnique.mockResolvedValue(testAssignment);
      mockPrisma.projectAssignment.delete.mockResolvedValue(testAssignment);

      const res = await request(app)
        .delete('/api/teams/team-1/projects/assignment-1')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.projectAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
    });

    it('should return 404 for non-existent assignment', async () => {
      mockPrisma.projectAssignment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/teams/team-1/projects/nonexistent')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(404);
    });

    it('should return 404 if assignment belongs to different team', async () => {
      mockPrisma.projectAssignment.findUnique.mockResolvedValue({
        ...testAssignment,
        teamId: 'other-team',
      });

      const res = await request(app)
        .delete('/api/teams/team-1/projects/assignment-1')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // CURRENT USER TEAM TESTS
  // ============================================

  describe('GET /api/teams/me/current', () => {
    it('should return current user\'s team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(testTeam);

      const res = await request(app)
        .get('/api/teams/me/current')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: 'team-1' }));

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Engineering');
      expect(mockPrisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        include: expect.any(Object),
      });
    });

    it('should return null if user has no team', async () => {
      const res = await request(app)
        .get('/api/teams/me/current')
        .set('x-test-dbuser', JSON.stringify({ role: 'USER', teamId: null }));

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
      expect(mockPrisma.team.findUnique).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // UTILITY FUNCTION TESTS
  // ============================================

  describe('Slug Generation', () => {
    it('should generate URL-safe slugs', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      mockPrisma.team.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...testTeam, ...data })
      );

      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: 'Test Team 123!' });

      expect(res.status).toBe(201);
      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'test-team-123',
          }),
        })
      );
    });

    it('should handle special characters', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      mockPrisma.team.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...testTeam, ...data })
      );

      const res = await request(app)
        .post('/api/teams')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ name: '---My@#Team---' });

      expect(res.status).toBe(201);
      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'my-team',
          }),
        })
      );
    });
  });
});

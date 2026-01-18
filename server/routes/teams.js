/**
 * Team Management Routes
 * Phase 6: Multi-Tenant Support
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';
import { requireAdmin, requireSuperAdmin, auditLog } from '../middleware/rbac.js';

const log = createLogger('teams');

/**
 * Generate URL-safe slug from team name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export function createTeamsRouter(prisma) {
  const router = Router();

  // ============================================
  // TEAM CRUD
  // ============================================

  /**
   * List all teams
   * GET /api/teams
   * ADMIN+ can see all teams, users see only their team
   */
  router.get('/', async (req, res) => {
    try {
      const userRole = req.dbUser?.role || 'USER';
      const userTeamId = req.dbUser?.teamId;

      let where = { isActive: true };

      // Non-admins can only see their own team
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        if (!userTeamId) {
          return res.json([]);
        }
        where.id = userTeamId;
      }

      const teams = await prisma.team.findMany({
        where,
        include: {
          members: {
            select: { id: true, name: true, email: true, role: true },
          },
          projects: {
            select: { id: true, projectPath: true, accessLevel: true },
          },
          _count: {
            select: { members: true, projects: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.json(teams);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch teams',
        operation: 'fetch teams',
        requestId: req.id,
      });
    }
  });

  /**
   * Get a single team
   * GET /api/teams/:id
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userRole = req.dbUser?.role || 'USER';
      const userTeamId = req.dbUser?.teamId;

      // Non-admins can only view their own team
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN' && userTeamId !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const team = await prisma.team.findUnique({
        where: { id },
        include: {
          members: {
            select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
          },
          projects: {
            select: { id: true, projectPath: true, accessLevel: true, assignedAt: true },
          },
        },
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      res.json(team);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch team',
        operation: 'fetch team',
        requestId: req.id,
        context: { teamId: req.params.id },
      });
    }
  });

  /**
   * Create a new team
   * POST /api/teams
   * SUPER_ADMIN only
   */
  router.post('/', requireSuperAdmin, auditLog(prisma, 'CREATE', 'team'), async (req, res) => {
    try {
      const { name, description, defaultRole, maxMembers } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Team name must be at least 2 characters' });
      }

      // Generate unique slug
      let slug = generateSlug(name);
      let slugSuffix = 0;
      while (await prisma.team.findUnique({ where: { slug } })) {
        slugSuffix++;
        slug = `${generateSlug(name)}-${slugSuffix}`;
      }

      // Validate defaultRole
      const validRoles = ['USER', 'VIEWER'];
      if (defaultRole && !validRoles.includes(defaultRole)) {
        return res.status(400).json({ error: 'Default role must be USER or VIEWER' });
      }

      const team = await prisma.team.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          slug,
          defaultRole: defaultRole || 'USER',
          maxMembers: maxMembers ? Math.max(1, parseInt(maxMembers)) : 10,
        },
        include: {
          _count: { select: { members: true, projects: true } },
        },
      });

      res.status(201).json(team);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Team name already exists' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to create team',
        operation: 'create team',
        requestId: req.id,
      });
    }
  });

  /**
   * Update a team
   * PUT /api/teams/:id
   * SUPER_ADMIN only
   */
  router.put('/:id', requireSuperAdmin, auditLog(prisma, 'UPDATE', 'team'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, defaultRole, maxMembers, isActive } = req.body;

      const existing = await prisma.team.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const updateData = {};

      if (name !== undefined) {
        if (name.trim().length < 2) {
          return res.status(400).json({ error: 'Team name must be at least 2 characters' });
        }
        updateData.name = name.trim();
        // Update slug if name changed
        let slug = generateSlug(name);
        let slugSuffix = 0;
        while (true) {
          const existingSlug = await prisma.team.findUnique({ where: { slug } });
          if (!existingSlug || existingSlug.id === id) break;
          slugSuffix++;
          slug = `${generateSlug(name)}-${slugSuffix}`;
        }
        updateData.slug = slug;
      }

      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }

      if (defaultRole !== undefined) {
        const validRoles = ['USER', 'VIEWER'];
        if (!validRoles.includes(defaultRole)) {
          return res.status(400).json({ error: 'Default role must be USER or VIEWER' });
        }
        updateData.defaultRole = defaultRole;
      }

      if (maxMembers !== undefined) {
        updateData.maxMembers = Math.max(1, parseInt(maxMembers));
      }

      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const team = await prisma.team.update({
        where: { id },
        data: updateData,
        include: {
          members: {
            select: { id: true, name: true, email: true, role: true },
          },
          _count: { select: { members: true, projects: true } },
        },
      });

      res.json(team);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Team name already exists' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to update team',
        operation: 'update team',
        requestId: req.id,
        context: { teamId: req.params.id },
      });
    }
  });

  /**
   * Delete a team
   * DELETE /api/teams/:id
   * SUPER_ADMIN only
   */
  router.delete('/:id', requireSuperAdmin, auditLog(prisma, 'DELETE', 'team'), async (req, res) => {
    try {
      const { id } = req.params;

      const team = await prisma.team.findUnique({
        where: { id },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Remove team membership from all users first
      await prisma.user.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      });

      // Delete team (cascades to ProjectAssignment)
      await prisma.team.delete({ where: { id } });

      res.json({ success: true, message: 'Team deleted' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete team',
        operation: 'delete team',
        requestId: req.id,
        context: { teamId: req.params.id },
      });
    }
  });

  // ============================================
  // TEAM MEMBERSHIP
  // ============================================

  /**
   * Add user to team
   * POST /api/teams/:id/members
   * ADMIN+ can add to any team, team admins can add to their team
   */
  router.post('/:id/members', requireAdmin, auditLog(prisma, 'UPDATE', 'team_membership'), async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const team = await prisma.team.findUnique({
        where: { id },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check max members
      if (team._count.members >= team.maxMembers) {
        return res.status(429).json({ error: `Team has reached maximum members (${team.maxMembers})` });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.teamId) {
        return res.status(409).json({ error: 'User is already in a team' });
      }

      // Determine role - use provided role or team default
      const assignRole = role || team.defaultRole;
      const validRoles = ['USER', 'VIEWER'];
      if (!validRoles.includes(assignRole)) {
        return res.status(400).json({ error: 'Invalid role for team member' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          teamId: id,
          role: assignRole,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      res.json(updatedUser);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to add team member',
        operation: 'add team member',
        requestId: req.id,
        context: { teamId: req.params.id },
      });
    }
  });

  /**
   * Remove user from team
   * DELETE /api/teams/:id/members/:userId
   */
  router.delete('/:id/members/:userId', requireAdmin, auditLog(prisma, 'UPDATE', 'team_membership'), async (req, res) => {
    try {
      const { id, userId } = req.params;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.teamId !== id) {
        return res.status(404).json({ error: 'User not found in this team' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { teamId: null },
      });

      res.json({ success: true, message: 'User removed from team' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to remove team member',
        operation: 'remove team member',
        requestId: req.id,
        context: { teamId: req.params.id, userId: req.params.userId },
      });
    }
  });

  // ============================================
  // PROJECT ASSIGNMENTS
  // ============================================

  /**
   * Get team's project assignments
   * GET /api/teams/:id/projects
   */
  router.get('/:id/projects', async (req, res) => {
    try {
      const { id } = req.params;
      const userRole = req.dbUser?.role || 'USER';
      const userTeamId = req.dbUser?.teamId;

      // Non-admins can only view their team's projects
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN' && userTeamId !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const assignments = await prisma.projectAssignment.findMany({
        where: { teamId: id },
        orderBy: { projectPath: 'asc' },
      });

      res.json(assignments);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch project assignments',
        operation: 'fetch project assignments',
        requestId: req.id,
        context: { teamId: req.params.id },
      });
    }
  });

  /**
   * Assign project to team
   * POST /api/teams/:id/projects
   */
  router.post('/:id/projects', requireAdmin, auditLog(prisma, 'CREATE', 'project_assignment'), async (req, res) => {
    try {
      const { id } = req.params;
      const { projectPath, accessLevel } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'projectPath is required' });
      }

      const team = await prisma.team.findUnique({ where: { id } });
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Validate access level
      const validLevels = ['READ_ONLY', 'READ_WRITE', 'ADMIN'];
      if (accessLevel && !validLevels.includes(accessLevel)) {
        return res.status(400).json({ error: 'Invalid access level' });
      }

      const assignment = await prisma.projectAssignment.create({
        data: {
          teamId: id,
          projectPath,
          accessLevel: accessLevel || 'READ_WRITE',
          assignedBy: req.user?.id,
        },
      });

      res.status(201).json(assignment);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Project already assigned to this team' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to assign project',
        operation: 'assign project',
        requestId: req.id,
        context: { teamId: req.params.id },
      });
    }
  });

  /**
   * Update project assignment
   * PUT /api/teams/:id/projects/:assignmentId
   */
  router.put('/:id/projects/:assignmentId', requireAdmin, auditLog(prisma, 'UPDATE', 'project_assignment'), async (req, res) => {
    try {
      const { id, assignmentId } = req.params;
      const { accessLevel } = req.body;

      const assignment = await prisma.projectAssignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment || assignment.teamId !== id) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const validLevels = ['READ_ONLY', 'READ_WRITE', 'ADMIN'];
      if (!validLevels.includes(accessLevel)) {
        return res.status(400).json({ error: 'Invalid access level' });
      }

      const updated = await prisma.projectAssignment.update({
        where: { id: assignmentId },
        data: { accessLevel },
      });

      res.json(updated);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update assignment',
        operation: 'update project assignment',
        requestId: req.id,
        context: { teamId: req.params.id, assignmentId: req.params.assignmentId },
      });
    }
  });

  /**
   * Remove project from team
   * DELETE /api/teams/:id/projects/:assignmentId
   */
  router.delete('/:id/projects/:assignmentId', requireAdmin, auditLog(prisma, 'DELETE', 'project_assignment'), async (req, res) => {
    try {
      const { id, assignmentId } = req.params;

      const assignment = await prisma.projectAssignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment || assignment.teamId !== id) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      await prisma.projectAssignment.delete({ where: { id: assignmentId } });

      res.json({ success: true, message: 'Project removed from team' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to remove project',
        operation: 'remove project assignment',
        requestId: req.id,
        context: { teamId: req.params.id, assignmentId: req.params.assignmentId },
      });
    }
  });

  // ============================================
  // CURRENT USER'S TEAM
  // ============================================

  /**
   * Get current user's team
   * GET /api/teams/me
   */
  router.get('/me/current', async (req, res) => {
    try {
      const userTeamId = req.dbUser?.teamId;

      if (!userTeamId) {
        return res.json(null);
      }

      const team = await prisma.team.findUnique({
        where: { id: userTeamId },
        include: {
          members: {
            select: { id: true, name: true, email: true, role: true },
          },
          projects: {
            select: { id: true, projectPath: true, accessLevel: true },
          },
        },
      });

      res.json(team);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch your team',
        operation: 'fetch current team',
        requestId: req.id,
      });
    }
  });

  return router;
}

export default createTeamsRouter;

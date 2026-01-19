/**
 * RBAC (Role-Based Access Control) Middleware
 * Phase 1 Implementation for Enterprise Mission Control
 *
 * Role Hierarchy: SUPER_ADMIN > ADMIN > USER > VIEWER
 * - SUPER_ADMIN: Full system access, infrastructure control
 * - ADMIN: Team management, all project access
 * - USER: Own projects/sessions only
 * - VIEWER: Read-only access to shared resources
 */

import { createLogger } from '../services/logger.js';

const log = createLogger('rbac');

// Role hierarchy values (higher = more permissions)
export const ROLE_HIERARCHY = {
  VIEWER: 0,
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

// Admin group names from Authentik that map to roles
const ROLE_GROUP_MAPPING = {
  'authentik Admins': 'SUPER_ADMIN',
  'Administrators': 'SUPER_ADMIN',
  'admins': 'ADMIN',
  'Admins': 'ADMIN',
  'developers': 'USER',
  'viewers': 'VIEWER',
};

/**
 * Determine role from Authentik groups
 * Returns the highest role found in groups, defaults to USER
 */
export function roleFromGroups(groups = []) {
  let highestRole = 'USER';
  let highestLevel = ROLE_HIERARCHY.USER;

  for (const group of groups) {
    const groupLower = group.toLowerCase();

    // Check explicit group mappings
    for (const [groupName, role] of Object.entries(ROLE_GROUP_MAPPING)) {
      if (groupLower === groupName.toLowerCase()) {
        const level = ROLE_HIERARCHY[role];
        if (level > highestLevel) {
          highestRole = role;
          highestLevel = level;
        }
      }
    }
  }

  return highestRole;
}

/**
 * Check if user has required role or higher
 */
export function hasRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] ?? ROLE_HIERARCHY.USER;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? ROLE_HIERARCHY.USER;
  return userLevel >= requiredLevel;
}

/**
 * Middleware: Require specific role(s)
 *
 * Usage:
 *   router.get('/admin', requireRole('ADMIN'), handler)
 *   router.post('/settings', requireRole('SUPER_ADMIN', 'ADMIN'), handler)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Check authentication
    if (!req.user) {
      log.warn({ path: req.path }, 'RBAC: unauthenticated request blocked');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    // Get user's role from database user or derive from Authentik groups
    const userRole = req.dbUser?.role || roleFromGroups(req.user.groups);

    // Check if user's role is in allowed roles or has higher permission
    const hasPermission = allowedRoles.some(role => hasRole(userRole, role));

    if (!hasPermission) {
      log.warn({
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      }, 'RBAC: insufficient permissions');

      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        required: allowedRoles,
        current: userRole,
      });
    }

    // Attach resolved role to request for downstream use
    req.userRole = userRole;
    next();
  };
}

/**
 * Middleware: Require admin (ADMIN or SUPER_ADMIN)
 * Convenience wrapper for common admin check
 */
export function requireAdmin() {
  return requireRole('ADMIN', 'SUPER_ADMIN');
}

/**
 * Middleware: Require super admin only
 * For the most sensitive operations (firewall, reboot, etc.)
 */
export function requireSuperAdmin() {
  return requireRole('SUPER_ADMIN');
}

/**
 * Sync user to database on first login
 * Creates or updates User record from Authentik data
 *
 * @param {Object} prisma - Prisma client instance
 */
export function createUserSync(prisma) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next();
    }

    try {
      // Determine role from groups
      const role = roleFromGroups(req.user.groups);

      // Upsert user record
      const dbUser = await prisma.user.upsert({
        where: { id: req.user.id },
        update: {
          email: req.user.email,
          name: req.user.name,
          username: req.user.username,
          groups: req.user.groups || [],
          lastLoginAt: new Date(),
          // Only update role if user is new or role increased
          // (prevents accidental downgrades)
        },
        create: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          username: req.user.username,
          role: role,
          groups: req.user.groups || [],
          lastLoginAt: new Date(),
        },
      });

      // Attach database user to request
      req.dbUser = dbUser;
    } catch (error) {
      // Log but don't fail request - user sync is non-critical
      log.error({ error: error.message, userId: req.user.id }, 'failed to sync user to database');
    }

    next();
  };
}

/**
 * Middleware: Audit log for sensitive operations
 *
 * Usage:
 *   router.delete('/sessions/:id', auditLog(prisma, 'DELETE', 'session'), handler)
 */
export function auditLog(prisma, action, resource) {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (body) {
      // Log after response is sent (for success/failure tracking)
      const statusCode = res.statusCode;
      const success = statusCode >= 200 && statusCode < 400;

      // Only log successful operations or sensitive failures
      if (success || action === 'DELETE' || action === 'EXECUTE') {
        prisma.auditLog.create({
          data: {
            userId: req.user?.id || 'anonymous',
            action,
            resource,
            resourceId: req.params?.id || null,
            metadata: {
              method: req.method,
              path: req.path,
              query: req.query,
              statusCode,
              success,
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
          },
        }).catch(err => {
          log.error({ error: err.message }, 'failed to write audit log');
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Create RBAC middleware factory with prisma instance
 */
export function createRBACMiddleware(prisma) {
  return {
    requireRole,
    requireAdmin,
    requireSuperAdmin,
    userSync: createUserSync(prisma),
    auditLog: (action, resource) => auditLog(prisma, action, resource),
  };
}

/**
 * Build ownership filter for Prisma queries
 * Returns a WHERE clause that filters by user ownership
 *
 * For SUPER_ADMIN: No filter (sees all)
 * For ADMIN: Sees own + shared/public resources
 * For USER: Sees own resources only
 * For VIEWER: Sees shared resources only
 *
 * @param {Object} req - Express request with user and dbUser
 * @param {Object} options - Filter options
 * @param {boolean} options.includeShared - Include shared resources (isShared=true)
 * @param {boolean} options.includePublic - Include public resources (isPublic=true)
 * @param {boolean} options.includeLegacy - Include resources with null ownerId (legacy data)
 */
export function buildOwnershipFilter(req, options = {}) {
  const {
    includeShared = true,
    includePublic = true,
    includeLegacy = true,
  } = options;

  // Get user info
  const userId = req.user?.id;
  const userRole = req.dbUser?.role || roleFromGroups(req.user?.groups);

  // SUPER_ADMIN sees everything
  if (userRole === 'SUPER_ADMIN') {
    return {};
  }

  // Build OR conditions
  const orConditions = [];

  // User's own resources
  if (userId) {
    orConditions.push({ ownerId: userId });
  }

  // Shared resources (for ADMIN and USER)
  if (includeShared && (userRole === 'ADMIN' || userRole === 'USER')) {
    orConditions.push({ isShared: true });
  }

  // Public resources (marketplace agents, etc.)
  if (includePublic) {
    orConditions.push({ isPublic: true });
  }

  // Legacy resources (null ownerId) - for backward compatibility
  if (includeLegacy) {
    orConditions.push({ ownerId: null });
  }

  // VIEWER only sees shared/public/legacy
  if (userRole === 'VIEWER') {
    return {
      OR: orConditions.filter(c => !c.ownerId), // Remove own-resources condition
    };
  }

  // No conditions means no access
  if (orConditions.length === 0) {
    return { ownerId: 'impossible-id-no-access' };
  }

  return { OR: orConditions };
}

/**
 * Build session ownership filter (sync version for backward compatibility)
 * Sessions don't have isShared/isPublic fields, so we use different logic
 */
export function buildSessionFilter(req, options = {}) {
  const { includeLegacy = true } = options;

  const userId = req.user?.id;
  const userRole = req.dbUser?.role || roleFromGroups(req.user?.groups);

  // SUPER_ADMIN and ADMIN see all sessions
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    return {};
  }

  // USER sees own sessions + legacy sessions
  const orConditions = [];

  if (userId) {
    orConditions.push({ ownerId: userId });
  }

  if (includeLegacy) {
    orConditions.push({ ownerId: null });
  }

  // VIEWER cannot see sessions (terminal access is write operation)
  if (userRole === 'VIEWER') {
    return { ownerId: 'impossible-id-no-access' };
  }

  if (orConditions.length === 0) {
    return { ownerId: 'impossible-id-no-access' };
  }

  return { OR: orConditions };
}

/**
 * Build session ownership filter with team access (async version)
 * Includes sessions from projects assigned to the user's team
 *
 * @param {Object} prisma - Prisma client
 * @param {Object} req - Express request
 * @param {Object} options - Filter options
 */
export async function buildSessionFilterWithTeam(prisma, req, options = {}) {
  const { includeLegacy = true } = options;

  const userId = req.user?.id;
  const userRole = req.dbUser?.role || roleFromGroups(req.user?.groups);
  const teamId = req.dbUser?.teamId;

  // SUPER_ADMIN and ADMIN see all sessions
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    return {};
  }

  // VIEWER cannot see sessions (terminal access is write operation)
  if (userRole === 'VIEWER') {
    return { ownerId: 'impossible-id-no-access' };
  }

  // USER sees own sessions + legacy sessions + team project sessions
  const orConditions = [];

  if (userId) {
    orConditions.push({ ownerId: userId });
  }

  if (includeLegacy) {
    orConditions.push({ ownerId: null });
  }

  // Add team project paths if user is in a team
  if (teamId) {
    const teamProjectPaths = await getTeamProjectPaths(prisma, req);
    if (teamProjectPaths.length > 0) {
      orConditions.push({ projectPath: { in: teamProjectPaths } });
    }
  }

  if (orConditions.length === 0) {
    return { ownerId: 'impossible-id-no-access' };
  }

  return { OR: orConditions };
}

/**
 * Check if user can access a specific session
 * Returns { canAccess, accessLevel, reason }
 *
 * @param {Object} prisma - Prisma client
 * @param {Object} req - Express request
 * @param {Object} session - Session object with ownerId and projectPath
 */
export async function checkSessionAccess(prisma, req, session) {
  const userId = req.user?.id;
  const userRole = req.dbUser?.role || roleFromGroups(req.user?.groups);
  const teamId = req.dbUser?.teamId;

  // SUPER_ADMIN and ADMIN have full access
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    return { canAccess: true, accessLevel: 'ADMIN', reason: 'admin_role' };
  }

  // VIEWER cannot access sessions
  if (userRole === 'VIEWER') {
    return { canAccess: false, accessLevel: null, reason: 'viewer_role' };
  }

  // Owner has full access
  if (session.ownerId === userId) {
    return { canAccess: true, accessLevel: 'ADMIN', reason: 'owner' };
  }

  // Legacy sessions (no owner) are accessible
  if (session.ownerId === null) {
    return { canAccess: true, accessLevel: 'READ_WRITE', reason: 'legacy' };
  }

  // Check team access via project assignment
  const projectPath = session.projectPath || session.project?.path;
  if (teamId && projectPath) {
    const { hasAccess, accessLevel } = await checkTeamProjectAccess(prisma, teamId, projectPath);
    if (hasAccess) {
      return { canAccess: true, accessLevel, reason: 'team_project' };
    }
  }

  return { canAccess: false, accessLevel: null, reason: 'no_access' };
}

/**
 * Middleware: Require access to a session
 * Checks ownership, team access, and role
 *
 * @param {Object} prisma - Prisma client
 * @param {string} accessRequired - Minimum access level required ('READ_ONLY', 'READ_WRITE', 'ADMIN')
 */
export function requireSessionAccess(prisma, accessRequired = 'READ_ONLY') {
  const ACCESS_LEVELS = { READ_ONLY: 0, READ_WRITE: 1, ADMIN: 2 };

  return async (req, res, next) => {
    const sessionId = req.params.id || req.params.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { id: true, ownerId: true, project: { select: { path: true } } },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { canAccess, accessLevel, reason } = await checkSessionAccess(prisma, req, session);

      if (!canAccess) {
        log.warn({
          userId: req.user?.id,
          sessionId,
          reason,
        }, 'RBAC: session access denied');

        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this session',
        });
      }

      // Check if access level is sufficient
      const userLevel = ACCESS_LEVELS[accessLevel] ?? 0;
      const requiredLevel = ACCESS_LEVELS[accessRequired] ?? 0;

      if (userLevel < requiredLevel) {
        log.warn({
          userId: req.user?.id,
          sessionId,
          accessLevel,
          accessRequired,
        }, 'RBAC: insufficient session access level');

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires ${accessRequired} access`,
        });
      }

      // Attach session and access info to request
      req.session = session;
      req.sessionAccessLevel = accessLevel;
      next();
    } catch (error) {
      log.error({ error: error.message, sessionId }, 'RBAC: session access check failed');
      return res.status(500).json({ error: 'Failed to check session access' });
    }
  };
}

/**
 * Get the user ID to set as owner for new resources
 * Returns null if user not authenticated (will create legacy resource)
 */
export function getOwnerIdForCreate(req) {
  return req.user?.id || null;
}

/**
 * Check if user can access a project by path
 * Returns { canAccess, accessLevel, reason }
 *
 * @param {Object} prisma - Prisma client
 * @param {Object} req - Express request
 * @param {string} projectPath - Project path to check
 */
export async function checkProjectAccess(prisma, req, projectPath) {
  const userId = req.user?.id;
  const userRole = req.dbUser?.role || roleFromGroups(req.user?.groups);
  const teamId = req.dbUser?.teamId;

  // SUPER_ADMIN and ADMIN have full access
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    return { canAccess: true, accessLevel: 'ADMIN', reason: 'admin_role' };
  }

  // Check if user has sessions in this project (implicit access)
  if (userId) {
    const hasSession = await prisma.session.findFirst({
      where: {
        projectPath,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (hasSession) {
      return { canAccess: true, accessLevel: 'READ_WRITE', reason: 'has_session' };
    }
  }

  // Check team access via project assignment
  if (teamId) {
    const { hasAccess, accessLevel } = await checkTeamProjectAccess(prisma, teamId, projectPath);
    if (hasAccess) {
      return { canAccess: true, accessLevel, reason: 'team_project' };
    }
  }

  // Default: allow access for backward compatibility (all users can view projects)
  // but with READ_ONLY level for operations that check access level
  return { canAccess: true, accessLevel: 'READ_ONLY', reason: 'default' };
}

/**
 * Middleware: Require access to a project
 * Checks role and team access
 *
 * @param {Object} prisma - Prisma client
 * @param {string} accessRequired - Minimum access level required ('READ_ONLY', 'READ_WRITE', 'ADMIN')
 * @param {string} pathParam - Request param name containing project path (default: 'projectName')
 */
export function requireProjectAccess(prisma, accessRequired = 'READ_ONLY', pathParam = 'projectName') {
  const ACCESS_LEVELS = { READ_ONLY: 0, READ_WRITE: 1, ADMIN: 2 };

  return async (req, res, next) => {
    // Get project path from params, query, or body
    let projectPath = req.params[pathParam];

    // If projectName is provided, convert to full path
    if (projectPath && !projectPath.startsWith('/')) {
      const PROJECTS_DIR = process.env.PROJECTS_DIR || `${process.env.HOME}/Projects`;
      projectPath = `${PROJECTS_DIR}/${projectPath}`;
    }

    // Try query or body if not in params
    if (!projectPath) {
      projectPath = req.query?.projectPath || req.query?.path || req.body?.projectPath || req.body?.path;
    }

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path required' });
    }

    try {
      const { canAccess, accessLevel, reason } = await checkProjectAccess(prisma, req, projectPath);

      if (!canAccess) {
        log.warn({
          userId: req.user?.id,
          projectPath,
          reason,
        }, 'RBAC: project access denied');

        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this project',
        });
      }

      // Check if access level is sufficient
      const userLevel = ACCESS_LEVELS[accessLevel] ?? 0;
      const requiredLevel = ACCESS_LEVELS[accessRequired] ?? 0;

      if (userLevel < requiredLevel) {
        log.warn({
          userId: req.user?.id,
          projectPath,
          accessLevel,
          accessRequired,
        }, 'RBAC: insufficient project access level');

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires ${accessRequired} access`,
        });
      }

      // Attach project info to request
      req.projectPath = projectPath;
      req.projectAccessLevel = accessLevel;
      next();
    } catch (error) {
      log.error({ error: error.message, projectPath }, 'RBAC: project access check failed');
      return res.status(500).json({ error: 'Failed to check project access' });
    }
  };
}

// ============================================
// Phase 6: Team-Based Access Control
// ============================================

/**
 * Check if user's team has access to a project path
 * @param {Object} prisma - Prisma client
 * @param {string} teamId - User's team ID
 * @param {string} projectPath - Path to check
 * @returns {Promise<{hasAccess: boolean, accessLevel: string|null}>}
 */
export async function checkTeamProjectAccess(prisma, teamId, projectPath) {
  if (!teamId || !projectPath) {
    return { hasAccess: false, accessLevel: null };
  }

  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      teamId,
      projectPath,
    },
  });

  if (!assignment) {
    return { hasAccess: false, accessLevel: null };
  }

  return { hasAccess: true, accessLevel: assignment.accessLevel };
}

/**
 * Check if user has team access to a specific resource
 * For use in ownership checks where the resource has a project path
 *
 * @param {Object} prisma - Prisma client
 * @param {Object} req - Express request
 * @param {string} projectPath - Project path associated with the resource
 * @returns {Promise<boolean>}
 */
export async function hasTeamAccess(prisma, req, projectPath) {
  const teamId = req.dbUser?.teamId;
  const userRole = req.dbUser?.role || 'USER';

  // Super admins bypass team checks
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }

  // No team = no team access
  if (!teamId) {
    return false;
  }

  const { hasAccess } = await checkTeamProjectAccess(prisma, teamId, projectPath);
  return hasAccess;
}

/**
 * Build project filter based on team assignments
 * Returns paths that user's team has access to
 *
 * @param {Object} prisma - Prisma client
 * @param {Object} req - Express request
 * @returns {Promise<string[]>} Array of project paths
 */
export async function getTeamProjectPaths(prisma, req) {
  const teamId = req.dbUser?.teamId;

  if (!teamId) {
    return [];
  }

  const assignments = await prisma.projectAssignment.findMany({
    where: { teamId },
    select: { projectPath: true },
  });

  return assignments.map(a => a.projectPath);
}

/**
 * Middleware factory: Require team access to project
 * Checks if user's team has access to the project in the request
 *
 * @param {Object} prisma - Prisma client
 * @param {string} projectPathParam - Request param name containing project path (default: 'projectPath')
 */
export function requireTeamAccess(prisma, projectPathParam = 'projectPath') {
  return async (req, res, next) => {
    const userRole = req.dbUser?.role || 'USER';

    // Super admins and admins bypass team checks
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      return next();
    }

    const projectPath = req.params[projectPathParam] || req.body?.projectPath || req.query?.projectPath;

    if (!projectPath) {
      return next(); // No project path to check
    }

    const teamId = req.dbUser?.teamId;
    if (!teamId) {
      // User not in a team - check if they own the project or it's public
      return next();
    }

    const { hasAccess, accessLevel } = await checkTeamProjectAccess(prisma, teamId, projectPath);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your team does not have access to this project',
      });
    }

    // Attach access level to request for downstream use
    req.teamAccessLevel = accessLevel;
    next();
  };
}

/**
 * Check if team access level allows write operations
 */
export function canTeamWrite(accessLevel) {
  return accessLevel === 'READ_WRITE' || accessLevel === 'ADMIN';
}

/**
 * Check if team access level allows admin operations
 */
export function canTeamAdmin(accessLevel) {
  return accessLevel === 'ADMIN';
}

export default {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  createUserSync,
  auditLog,
  createRBACMiddleware,
  hasRole,
  roleFromGroups,
  ROLE_HIERARCHY,
  buildOwnershipFilter,
  buildSessionFilter,
  getOwnerIdForCreate,
  // Phase 6: Team access
  checkTeamProjectAccess,
  hasTeamAccess,
  getTeamProjectPaths,
  requireTeamAccess,
  canTeamWrite,
  canTeamAdmin,
  // Phase 6: Session access with team support
  buildSessionFilterWithTeam,
  checkSessionAccess,
  requireSessionAccess,
  // Phase 6: Project access with team support
  checkProjectAccess,
  requireProjectAccess,
};

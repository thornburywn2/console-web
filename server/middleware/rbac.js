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
 * Build session ownership filter
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
 * Get the user ID to set as owner for new resources
 * Returns null if user not authenticated (will create legacy resource)
 */
export function getOwnerIdForCreate(req) {
  return req.user?.id || null;
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
};

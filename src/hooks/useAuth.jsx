/**
 * Authentication Hook
 * Manages Authentik SSO authentication state
 * Phase 3: Enhanced with RBAC utilities (hasRole, canAccess, isOwner)
 */

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';

/**
 * Role hierarchy values (higher = more permissions)
 * Matches server-side ROLE_HIERARCHY in rbac.js
 */
const ROLE_HIERARCHY = {
  VIEWER: 0,
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Permission matrix for fine-grained access control
 * Format: resource.action -> minimum required role
 */
const PERMISSION_MATRIX = {
  // Session permissions
  'session.view': 'VIEWER',
  'session.create': 'USER',
  'session.edit': 'USER',
  'session.delete': 'USER',
  'session.viewAll': 'ADMIN',

  // Project permissions
  'project.view': 'VIEWER',
  'project.edit': 'USER',
  'project.delete': 'ADMIN',

  // Agent permissions
  'agent.view': 'USER',
  'agent.create': 'USER',
  'agent.run': 'USER',
  'agent.viewAll': 'ADMIN',

  // Docker permissions
  'docker.view': 'ADMIN',
  'docker.control': 'ADMIN',

  // Infrastructure permissions
  'infra.view': 'ADMIN',
  'infra.control': 'SUPER_ADMIN',
  'infra.firewall': 'SUPER_ADMIN',
  'infra.packages': 'SUPER_ADMIN',
  'infra.reboot': 'SUPER_ADMIN',

  // User management
  'users.view': 'SUPER_ADMIN',
  'users.manage': 'SUPER_ADMIN',

  // Audit logs
  'audit.view': 'ADMIN',

  // Admin tabs
  'admin.server': 'ADMIN',
  'admin.security': 'ADMIN',
  'admin.users': 'SUPER_ADMIN',
};

// Auth context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loginUrl, setLoginUrl] = useState(null);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          setLoginUrl(null);
        } else {
          setUser(null);
          setLoginUrl(data.loginUrl);
        }
      } else {
        setUser(null);
        setError('Failed to check authentication');
      }
    } catch (err) {
      console.error('[AUTH] Check auth error:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login redirect
  const login = useCallback(() => {
    if (loginUrl) {
      window.location.href = loginUrl;
    } else {
      window.location.href = '/auth/login';
    }
  }, [loginUrl]);

  // Logout
  const logout = useCallback(() => {
    window.location.href = '/auth/logout';
  }, []);

  // Check if user has specific group
  const hasGroup = useCallback((group) => {
    return user?.groups?.includes(group) || false;
  }, [user]);

  // Check if user is admin (legacy - use hasRole instead)
  const isAdmin = user?.isAdmin || false;

  // Get user's role (defaults to USER if not set)
  const userRole = useMemo(() => {
    return user?.role || 'USER';
  }, [user]);

  /**
   * Check if user has the specified role or higher
   * @param {string} requiredRole - Role to check against (VIEWER, USER, ADMIN, SUPER_ADMIN)
   * @returns {boolean}
   */
  const hasRole = useCallback((requiredRole) => {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[userRole] ?? ROLE_HIERARCHY.USER;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? ROLE_HIERARCHY.USER;
    return userLevel >= requiredLevel;
  }, [user, userRole]);

  /**
   * Check if user can perform an action on a resource
   * @param {string} resource - Resource type (e.g., 'session', 'docker')
   * @param {string} action - Action to perform (e.g., 'view', 'create', 'delete')
   * @returns {boolean}
   */
  const canAccess = useCallback((resource, action) => {
    if (!user) return false;
    const permissionKey = `${resource}.${action}`;
    const requiredRole = PERMISSION_MATRIX[permissionKey];
    if (!requiredRole) {
      // If permission not defined, default to USER
      return hasRole('USER');
    }
    return hasRole(requiredRole);
  }, [user, hasRole]);

  /**
   * Check if user owns a resource
   * @param {string} resourceOwnerId - Owner ID of the resource
   * @returns {boolean}
   */
  const isOwner = useCallback((resourceOwnerId) => {
    if (!user) return false;
    if (!resourceOwnerId) return true; // null ownerId = legacy resource, accessible to all
    return user.id === resourceOwnerId;
  }, [user]);

  /**
   * Check if user can access a specific resource (owner OR has sufficient role)
   * @param {string} resourceOwnerId - Owner ID of the resource
   * @param {string} requiredRoleForOthers - Role needed to access others' resources
   * @returns {boolean}
   */
  const canAccessResource = useCallback((resourceOwnerId, requiredRoleForOthers = 'ADMIN') => {
    if (!user) return false;
    // Owner can always access
    if (isOwner(resourceOwnerId)) return true;
    // Otherwise need specified role
    return hasRole(requiredRoleForOthers);
  }, [user, isOwner, hasRole]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin,
    login,
    logout,
    checkAuth,
    hasGroup,
    loginUrl,
    // RBAC utilities (Phase 3)
    userRole,
    hasRole,
    canAccess,
    isOwner,
    canAccessResource,
    ROLE_HIERARCHY,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Auth hook
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Protected Route Component
 */
export function RequireAuth({ children, adminOnly = false, fallback = null }) {
  const { isAuthenticated, isAdmin, loading, login } = useAuth();

  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center h-screen bg-hacker-bg">
        <div className="text-center">
          <div className="animate-pulse text-hacker-green text-2xl font-mono mb-4">
            AUTHENTICATING...
          </div>
          <div className="text-hacker-text-dim text-sm font-mono">
            Verifying credentials with Authentik SSO
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-hacker-bg">
        <div className="text-center">
          <div className="text-hacker-error text-xl font-mono mb-4">
            AUTHENTICATION REQUIRED
          </div>
          <p className="text-hacker-text-dim text-sm font-mono mb-6">
            Please sign in with your Authentik account to continue
          </p>
          <button
            onClick={login}
            className="px-6 py-3 bg-hacker-green/20 border border-hacker-green text-hacker-green rounded-lg font-mono hover:bg-hacker-green/30 transition-colors"
          >
            SIGN IN WITH AUTHENTIK
          </button>
        </div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-hacker-bg">
        <div className="text-center">
          <div className="text-hacker-error text-xl font-mono mb-4">
            ACCESS DENIED
          </div>
          <p className="text-hacker-text-dim text-sm font-mono">
            Administrator privileges required
          </p>
        </div>
      </div>
    );
  }

  return children;
}

/**
 * Role badge colors and labels
 */
const ROLE_BADGE_CONFIG = {
  SUPER_ADMIN: { bg: 'bg-hacker-error/20', text: 'text-hacker-error', border: 'border-hacker-error/50', label: 'SUPER ADMIN' },
  ADMIN: { bg: 'bg-hacker-purple/20', text: 'text-hacker-purple', border: 'border-hacker-purple/50', label: 'ADMIN' },
  USER: { bg: 'bg-hacker-green/20', text: 'text-hacker-green', border: 'border-hacker-green/50', label: 'USER' },
  VIEWER: { bg: 'bg-hacker-blue/20', text: 'text-hacker-blue', border: 'border-hacker-blue/50', label: 'VIEWER' },
};

/**
 * User Avatar Component
 * Phase 3: Shows role badge instead of just ADMIN
 */
export function UserAvatar({ size = 'md' }) {
  const { user, logout, userRole, hasRole } = useAuth();

  if (!user) return null;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0]?.toUpperCase() || '?';

  const roleConfig = ROLE_BADGE_CONFIG[userRole] || ROLE_BADGE_CONFIG.USER;
  const isPrivileged = hasRole('ADMIN');

  return (
    <div className="relative group">
      <button
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-mono font-bold transition-colors ${
          isPrivileged
            ? `${roleConfig.bg} ${roleConfig.text} border ${roleConfig.border}`
            : 'bg-hacker-green/30 text-hacker-green border border-hacker-green/50'
        }`}
        title={`${user.name} (${user.email}) - ${roleConfig.label}`}
      >
        {initials}
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-hacker-surface border border-hacker-green/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="px-3 py-2 border-b border-hacker-green/10">
          <div className="font-mono text-sm text-hacker-text truncate">{user.name}</div>
          <div className="font-mono text-xs text-hacker-text-dim truncate">{user.email}</div>
          <span className={`inline-block mt-1 px-1.5 py-0.5 text-2xs ${roleConfig.bg} ${roleConfig.text} rounded font-mono`}>
            {roleConfig.label}
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-sm font-mono text-hacker-error hover:bg-hacker-error/10 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

/**
 * Permission Gate Component
 * Conditionally renders children based on RBAC permissions
 * Phase 3: Enterprise RBAC UI integration
 *
 * @param {string} requiredRole - Minimum role required (VIEWER, USER, ADMIN, SUPER_ADMIN)
 * @param {string} resource - Resource for permission check (e.g., 'docker')
 * @param {string} action - Action for permission check (e.g., 'view')
 * @param {string} ownerId - Owner ID for ownership check
 * @param {React.ReactNode} fallback - Content to show when access denied
 * @param {boolean} showLock - Show lock icon when access denied
 * @param {React.ReactNode} children - Content to render when access granted
 */
export function PermissionGate({
  requiredRole,
  resource,
  action,
  ownerId,
  fallback = null,
  showLock = false,
  children,
}) {
  const { hasRole, canAccess, canAccessResource } = useAuth();

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    return showLock ? (
      <div className="relative opacity-50 cursor-not-allowed" title="Insufficient permissions">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
          <svg className="w-4 h-4 text-hacker-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
    ) : fallback;
  }

  // Check resource/action permission
  if (resource && action && !canAccess(resource, action)) {
    return showLock ? (
      <div className="relative opacity-50 cursor-not-allowed" title="Action not permitted">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
          <svg className="w-4 h-4 text-hacker-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
    ) : fallback;
  }

  // Check ownership
  if (ownerId !== undefined && !canAccessResource(ownerId)) {
    return fallback;
  }

  return children;
}

/**
 * Role Badge Component
 * Displays the user's role as a styled badge
 */
export function RoleBadge({ role, size = 'sm' }) {
  const config = ROLE_BADGE_CONFIG[role] || ROLE_BADGE_CONFIG.USER;

  const sizeClasses = {
    xs: 'px-1 py-0.5 text-2xs',
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${config.bg} ${config.text} rounded font-mono font-medium`}>
      {config.label}
    </span>
  );
}

export default useAuth;

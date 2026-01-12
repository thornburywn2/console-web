/**
 * Authentication Hook
 * Manages Authentik SSO authentication state
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

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

  // Check if user is admin
  const isAdmin = user?.isAdmin || false;

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
 * User Avatar Component
 */
export function UserAvatar({ size = 'md' }) {
  const { user, logout, isAdmin } = useAuth();

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

  return (
    <div className="relative group">
      <button
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-mono font-bold transition-colors ${
          isAdmin
            ? 'bg-hacker-purple/30 text-hacker-purple border border-hacker-purple/50'
            : 'bg-hacker-green/30 text-hacker-green border border-hacker-green/50'
        }`}
        title={`${user.name} (${user.email})`}
      >
        {initials}
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-hacker-surface border border-hacker-green/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="px-3 py-2 border-b border-hacker-green/10">
          <div className="font-mono text-sm text-hacker-text truncate">{user.name}</div>
          <div className="font-mono text-xs text-hacker-text-dim truncate">{user.email}</div>
          {isAdmin && (
            <span className="inline-block mt-1 px-1.5 py-0.5 text-2xs bg-hacker-purple/20 text-hacker-purple rounded font-mono">
              ADMIN
            </span>
          )}
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

export default useAuth;

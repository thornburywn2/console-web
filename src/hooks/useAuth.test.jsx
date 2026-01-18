/**
 * useAuth Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth, RequireAuth, UserAvatar } from './useAuth';

// Helper component to test the hook
function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{auth.loading.toString()}</span>
      <span data-testid="authenticated">{auth.isAuthenticated.toString()}</span>
      <span data-testid="admin">{auth.isAdmin.toString()}</span>
      {auth.user && (
        <span data-testid="user-name">{auth.user.name}</span>
      )}
      {auth.error && (
        <span data-testid="error">{auth.error}</span>
      )}
      <button onClick={auth.login} data-testid="login-btn">Login</button>
      <button onClick={auth.logout} data-testid="logout-btn">Logout</button>
      <button onClick={() => auth.hasGroup('admins')} data-testid="check-group">Check Group</button>
    </div>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should show loading state initially', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('should set authenticated state when user is logged in', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
          isAdmin: false,
          groups: ['users'],
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Test User');
    expect(screen.getByTestId('admin').textContent).toBe('false');
  });

  it('should set admin state for admin users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Admin User',
          email: 'admin@example.com',
          isAdmin: true,
          groups: ['admins', 'users'],
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin').textContent).toBe('true');
    });
  });

  it('should handle unauthenticated state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: false,
        loginUrl: '/auth/login?redirect=/',
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
  });

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Network error');
    });
  });

  it('should handle non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Failed to check authentication');
    });
  });
});

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state while authenticating', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <RequireAuth>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>
      </AuthProvider>
    );

    expect(screen.getByText('AUTHENTICATING...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should show custom fallback while loading', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <RequireAuth fallback={<div>Custom Loading...</div>}>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>
      </AuthProvider>
    );

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
  });

  it('should show sign in prompt when not authenticated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: false,
        loginUrl: '/auth/login',
      }),
    });

    render(
      <AuthProvider>
        <RequireAuth>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('AUTHENTICATION REQUIRED')).toBeInTheDocument();
    });

    expect(screen.getByText('SIGN IN WITH AUTHENTIK')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should render children when authenticated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
          isAdmin: false,
          groups: [],
        },
      }),
    });

    render(
      <AuthProvider>
        <RequireAuth>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('should show access denied for non-admin on admin-only routes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
          isAdmin: false,
          groups: [],
        },
      }),
    });

    render(
      <AuthProvider>
        <RequireAuth adminOnly>
          <div data-testid="admin-content">Admin Only</div>
        </RequireAuth>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ACCESS DENIED')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('should render admin content for admin users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Admin User',
          email: 'admin@example.com',
          isAdmin: true,
          groups: ['admins'],
        },
      }),
    });

    render(
      <AuthProvider>
        <RequireAuth adminOnly>
          <div data-testid="admin-content">Admin Only</div>
        </RequireAuth>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });
  });
});

describe('UserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when user is null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: false,
        loginUrl: '/auth/login',
      }),
    });

    const { container } = render(
      <AuthProvider>
        <UserAvatar />
      </AuthProvider>
    );

    await waitFor(() => {
      // UserAvatar returns null when no user
      expect(container.firstChild).toBeNull();
    });
  });

  it('should render user initials', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          isAdmin: false,
          groups: [],
        },
      }),
    });

    render(
      <AuthProvider>
        <UserAvatar />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  it('should use email initial when name is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          email: 'admin@example.com',
          isAdmin: false,
          groups: [],
        },
      }),
    });

    render(
      <AuthProvider>
        <UserAvatar />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });

  it('should show ADMIN badge for admin users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Admin User',
          email: 'admin@example.com',
          isAdmin: true,
          groups: ['admins'],
          role: 'ADMIN', // Phase 3: Added role field
        },
      }),
    });

    render(
      <AuthProvider>
        <UserAvatar />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });
  });

  it('should show user info in dropdown', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          isAdmin: false,
          groups: [],
        },
      }),
    });

    render(
      <AuthProvider>
        <UserAvatar />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('should have Sign Out button', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
          isAdmin: false,
          groups: [],
        },
      }),
    });

    render(
      <AuthProvider>
        <UserAvatar />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  it('should render avatar button with user initials', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
          isAdmin: false,
          groups: [],
        },
      }),
    });

    render(
      <AuthProvider>
        <UserAvatar size="sm" />
      </AuthProvider>
    );

    await waitFor(() => {
      // Wait for auth to complete and avatar to render
      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    // Get all buttons (avatar button and sign out button)
    const buttons = screen.getAllByRole('button');
    // Avatar button should have size classes
    expect(buttons[0].className).toContain('rounded-full');
  });
});

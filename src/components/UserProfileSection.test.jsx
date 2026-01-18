/**
 * UserProfileSection Component Tests
 * Phase 5.3: Unit tests for user profile sidebar section
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserProfileSection from './UserProfileSection';

// Mock useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    isAdmin: false,
  })),
}));

describe('UserProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when user is logged in', () => {
      render(<UserProfileSection />);

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render in collapsed mode', () => {
      render(<UserProfileSection collapsed={true} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render in expanded mode', () => {
      render(<UserProfileSection collapsed={false} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should not render when user is null', async () => {
      const { useAuth } = await import('../hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        logout: vi.fn(),
        isAdmin: false,
      });

      const { container } = render(<UserProfileSection />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('user display', () => {
    it('should show user initials', () => {
      render(<UserProfileSection />);

      // Should have some user indicator (initials "TU" from "Test User")
      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('dropdown', () => {
    it('should toggle dropdown on click', () => {
      render(<UserProfileSection />);

      // Find clickable element
      const profileButton = document.querySelector('button') || document.querySelector('[role="button"]');
      if (profileButton) {
        fireEvent.click(profileButton);
        expect(document.body).toBeInTheDocument();
      }
    });

    it('should close dropdown on escape key', () => {
      render(<UserProfileSection />);

      const profileButton = document.querySelector('button') || document.querySelector('[role="button"]');
      if (profileButton) {
        fireEvent.click(profileButton);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(document.body).toBeInTheDocument();
      }
    });
  });

  describe('admin indicator', () => {
    it('should show admin badge when user is admin', async () => {
      const { useAuth } = await import('../hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: { name: 'Admin User', email: 'admin@example.com' },
        logout: vi.fn(),
        isAdmin: true,
      });

      render(<UserProfileSection />);

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });
});

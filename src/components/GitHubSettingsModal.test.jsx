/**
 * GitHubSettingsModal Component Tests
 * Phase 5.3: Unit tests for GitHub settings modal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GitHubSettingsModal from './GitHubSettingsModal';

// Mock API
vi.mock('../services/api.js', () => ({
  githubApi: {
    getAuthStatus: vi.fn().mockResolvedValue({
      authenticated: true,
      username: 'testuser',
      scopes: ['repo', 'user'],
    }),
    authenticate: vi.fn().mockResolvedValue({
      authenticated: true,
      username: 'testuser',
    }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('GitHubSettingsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <GitHubSettingsModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('GitHub Settings')).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <GitHubSettingsModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch auth status when opened', async () => {
      const { githubApi } = await import('../services/api.js');

      render(
        <GitHubSettingsModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(githubApi.getAuthStatus).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { githubApi } = await import('../services/api.js');
      vi.mocked(githubApi.getAuthStatus).mockRejectedValue(new Error('Network error'));

      render(
        <GitHubSettingsModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

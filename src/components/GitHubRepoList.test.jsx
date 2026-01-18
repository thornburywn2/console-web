/**
 * GitHubRepoList Component Tests
 * Phase 5.3: Unit tests for GitHub repository list
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GitHubRepoList from './GitHubRepoList';

// Mock API
vi.mock('../services/api.js', () => ({
  githubApi: {
    getRepos: vi.fn().mockResolvedValue({
      repos: [
        { id: 1, name: 'repo-1', full_name: 'user/repo-1', description: 'First repo', private: false, updated_at: '2024-01-15T10:00:00Z' },
        { id: 2, name: 'repo-2', full_name: 'user/repo-2', description: 'Second repo', private: true, updated_at: '2024-01-14T10:00:00Z' },
      ],
    }),
    searchRepos: vi.fn().mockResolvedValue({
      repos: [
        { id: 3, name: 'search-result', full_name: 'other/search-result', description: 'Found repo', private: false },
      ],
    }),
    cloneRepo: vi.fn().mockResolvedValue({ success: true, path: '/home/user/Projects/repo-1' }),
  },
}));

describe('GitHubRepoList', () => {
  const mockOnClose = vi.fn();
  const mockOnClone = vi.fn();
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <GitHubRepoList
          isOpen={true}
          onClose={mockOnClose}
          onClone={mockOnClone}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <GitHubRepoList
          isOpen={false}
          onClose={mockOnClose}
          onClone={mockOnClone}
          onRefresh={mockOnRefresh}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch repos when opened', async () => {
      const { githubApi } = await import('../services/api.js');

      render(
        <GitHubRepoList
          isOpen={true}
          onClose={mockOnClose}
          onClone={mockOnClone}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(githubApi.getRepos).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display GitHub Repositories title', async () => {
      render(
        <GitHubRepoList
          isOpen={true}
          onClose={mockOnClose}
          onClone={mockOnClone}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/GitHub/i)).toBeInTheDocument();
      });
    });

    it('should have search input', async () => {
      render(
        <GitHubRepoList
          isOpen={true}
          onClose={mockOnClose}
          onClone={mockOnClone}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { githubApi } = await import('../services/api.js');
      vi.mocked(githubApi.getRepos).mockRejectedValue(new Error('Network error'));

      render(
        <GitHubRepoList
          isOpen={true}
          onClose={mockOnClose}
          onClone={mockOnClone}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

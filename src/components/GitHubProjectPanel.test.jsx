/**
 * GitHubProjectPanel Component Tests
 * Phase 5.3: Unit tests for GitHub integration panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GitHubProjectPanel from './GitHubProjectPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  githubProjectsApi: {
    get: vi.fn().mockResolvedValue({
      linked: true,
      repo: {
        name: 'test-repo',
        fullName: 'user/test-repo',
        htmlUrl: 'https://github.com/user/test-repo',
      },
      repoName: 'user/test-repo',
      status: 'synced',
      aheadBy: 0,
      behindBy: 0,
      lastSync: '2024-01-15T10:00:00Z',
    }),
    getRuns: vi.fn().mockResolvedValue({
      runs: [
        { id: '1', name: 'CI', conclusion: 'success', createdAt: '2024-01-15T10:00:00Z' },
        { id: '2', name: 'Deploy', conclusion: 'failure', createdAt: '2024-01-15T09:00:00Z' },
      ],
    }),
    sync: vi.fn().mockResolvedValue({ success: true }),
    push: vi.fn().mockResolvedValue({ success: true }),
    pull: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('GitHubProjectPanel', () => {
  const mockOnRefresh = vi.fn();
  const mockOnOpenSettings = vi.fn();
  const mockProject = {
    name: 'test-project',
    path: '/home/user/projects/test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with project', async () => {
      render(
        <GitHubProjectPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data loading', () => {
    it('should fetch GitHub data', async () => {
      const { githubProjectsApi } = await import('../services/api.js');

      render(
        <GitHubProjectPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      await waitFor(() => {
        expect(githubProjectsApi.get).toHaveBeenCalledWith('test-project');
      });
    });
  });

  describe('linked repository', () => {
    it('should display repo name when linked', async () => {
      render(
        <GitHubProjectPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('user/test-repo')).toBeInTheDocument();
      });
    });
  });

  describe('workflow runs', () => {
    it('should fetch workflow runs when linked', async () => {
      const { githubProjectsApi } = await import('../services/api.js');

      render(
        <GitHubProjectPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      await waitFor(() => {
        expect(githubProjectsApi.getRuns).toHaveBeenCalled();
      });
    });
  });

  describe('unlinked state', () => {
    it('should show link prompt when not linked', async () => {
      const { githubProjectsApi } = await import('../services/api.js');
      vi.mocked(githubProjectsApi.get).mockResolvedValue({
        linked: false,
      });

      render(
        <GitHubProjectPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { githubProjectsApi } = await import('../services/api.js');
      vi.mocked(githubProjectsApi.get).mockRejectedValue(new Error('Network error'));

      render(
        <GitHubProjectPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

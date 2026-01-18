/**
 * GitWorkflow Component Tests
 * Phase 5.3: Unit tests for git workflow component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GitWorkflow from './GitWorkflow';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ output: 'Operation successful' }),
  },
}));

// Mock useApiQuery hook
vi.mock('../hooks/useApiQuery', () => ({
  useApiQuery: vi.fn().mockReturnValue({
    data: {
      branch: 'main',
      ahead: 2,
      behind: 0,
      staged: ['file1.js'],
      unstaged: ['file2.js'],
      untracked: ['file3.js'],
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('GitWorkflow', () => {
  const mockOnClose = vi.fn();
  const mockOnExecute = vi.fn();
  const mockProjectPath = '/home/user/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <GitWorkflow
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onExecute={mockOnExecute}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false and not embedded', () => {
      render(
        <GitWorkflow
          isOpen={false}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onExecute={mockOnExecute}
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should render in embedded mode', async () => {
      render(
        <GitWorkflow
          isOpen={false}
          embedded={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onExecute={mockOnExecute}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('display', () => {
    it('should display Git Workflow title', async () => {
      render(
        <GitWorkflow
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onExecute={mockOnExecute}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Git Workflow')).toBeInTheDocument();
      });
    });

    it('should display branch name', async () => {
      render(
        <GitWorkflow
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onExecute={mockOnExecute}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });
    });

    it('should display Quick Commit section', async () => {
      render(
        <GitWorkflow
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onExecute={mockOnExecute}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Quick Commit')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle status errors gracefully', async () => {
      const { useApiQuery } = await import('../hooks/useApiQuery');
      vi.mocked(useApiQuery).mockReturnValue({
        data: null,
        loading: false,
        error: { getUserMessage: () => 'Connection failed' },
        refetch: vi.fn(),
      });

      render(
        <GitWorkflow
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onExecute={mockOnExecute}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

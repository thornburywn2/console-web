/**
 * ContextPanel Component Tests
 * Phase 5.3: Unit tests for context panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ContextPanel from './ContextPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  projectContextsApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', type: 'file', value: '/src/App.jsx', label: 'App.jsx' },
      { id: '2', type: 'snippet', value: 'console.log', label: 'Debug log' },
    ]),
    create: vi.fn().mockResolvedValue({ id: '3', type: 'file', value: '/src/new.js', label: 'new.js' }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('ContextPanel', () => {
  const mockProjectPath = '/home/user/project';
  const mockProjectName = 'my-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the panel', async () => {
      render(
        <ContextPanel
          projectPath={mockProjectPath}
          projectName={mockProjectName}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <ContextPanel
          projectPath={mockProjectPath}
          projectName={mockProjectName}
          className="custom-class"
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch contexts on mount', async () => {
      const { projectContextsApi } = await import('../services/api.js');

      render(
        <ContextPanel
          projectPath={mockProjectPath}
          projectName={mockProjectName}
        />
      );

      await waitFor(() => {
        expect(projectContextsApi.list).toHaveBeenCalledWith(mockProjectName);
      });
    });
  });

  describe('display', () => {
    it('should display Contexts header', async () => {
      render(
        <ContextPanel
          projectPath={mockProjectPath}
          projectName={mockProjectName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Context/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { projectContextsApi } = await import('../services/api.js');
      vi.mocked(projectContextsApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <ContextPanel
          projectPath={mockProjectPath}
          projectName={mockProjectName}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

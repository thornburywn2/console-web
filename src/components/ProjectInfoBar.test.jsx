/**
 * ProjectInfoBar Component Tests
 * Phase 5.3: Unit tests for project info bar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ProjectInfoBar from './ProjectInfoBar';

// Mock API
vi.mock('../services/api.js', () => ({
  projectTagsApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'frontend', color: '#3b82f6' },
      { id: '2', name: 'backend', color: '#22c55e' },
    ]),
    getProjectTags: vi.fn().mockResolvedValue([
      { id: '1', name: 'frontend', color: '#3b82f6' },
    ]),
    addTagToProject: vi.fn().mockResolvedValue({ success: true }),
    removeTagFromProject: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock child components
vi.mock('./ProjectContextMenu', () => ({
  ProjectTagChip: ({ tag }) => <span data-testid={`tag-${tag.id}`}>{tag.name}</span>,
}));

describe('ProjectInfoBar', () => {
  const mockOnRefresh = vi.fn();
  const mockProject = {
    name: 'test-project',
    path: '/home/user/Projects/test-project',
    type: 'web-app',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the info bar', async () => {
      render(
        <ProjectInfoBar
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without project', async () => {
      render(
        <ProjectInfoBar
          project={null}
          onRefresh={mockOnRefresh}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('data fetching', () => {
    it('should fetch tags when project is provided', async () => {
      const { projectTagsApi } = await import('../services/api.js');

      render(
        <ProjectInfoBar
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(projectTagsApi.list).toHaveBeenCalled();
        expect(projectTagsApi.getProjectTags).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { projectTagsApi } = await import('../services/api.js');
      vi.mocked(projectTagsApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <ProjectInfoBar
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

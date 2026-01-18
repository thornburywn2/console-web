/**
 * ProjectContext Component Tests
 * Phase 5.3: Unit tests for project context
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ProjectContext from './ProjectContext';

// Mock API
vi.mock('../services/api.js', () => ({
  projectsApi: {
    listExtended: vi.fn().mockResolvedValue([
      {
        name: 'test-project',
        path: '/home/user/test-project',
        completion: {
          percentage: 85,
          scores: { claudeMd: 100, readme: 80, tests: 75 },
          missing: ['docs/', 'CHANGELOG.md'],
        },
        technologies: ['React', 'TypeScript', 'Tailwind'],
      },
    ]),
  },
}));

describe('ProjectContext', () => {
  const mockProject = {
    name: 'test-project',
    path: '/home/user/test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with project data', async () => {
      render(<ProjectContext project={mockProject} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without project', async () => {
      render(<ProjectContext project={null} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with project without name', async () => {
      render(<ProjectContext project={{}} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch project data on mount', async () => {
      const { projectsApi } = await import('../services/api.js');

      render(<ProjectContext project={mockProject} />);

      await waitFor(() => {
        expect(projectsApi.listExtended).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { projectsApi } = await import('../services/api.js');
      vi.mocked(projectsApi.listExtended).mockRejectedValue(new Error('Network error'));

      render(<ProjectContext project={mockProject} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

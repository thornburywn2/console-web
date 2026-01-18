/**
 * ProjectsTab Component Tests
 * Phase 5.3: Unit tests for the projects tab
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ProjectsTab } from './ProjectsTab';

// Mock the useApiQuery hook
vi.mock('../../../hooks/useApiQuery', () => ({
  useApiQuery: vi.fn(),
  useApiMutation: vi.fn(),
}));

import { useApiQuery, useApiMutation } from '../../../hooks/useApiQuery';

// Mock project data
const mockProjects = [
  {
    id: '1',
    name: 'project-alpha',
    description: 'A test project',
    hasActiveSession: true,
    hasGit: true,
    hasGithub: true,
    hasTests: true,
    hasDocker: true,
    hasClaudeMd: true,
    skipPermissions: false,
    technologies: ['TypeScript', 'React', 'Node.js'],
    lastModified: '2026-01-17T12:00:00Z',
    completion: {
      percentage: 85,
      missing: [],
      scores: {},
    },
  },
  {
    id: '2',
    name: 'project-beta',
    description: 'Another project',
    hasActiveSession: false,
    hasGit: true,
    hasGithub: false,
    hasTests: false,
    hasDocker: false,
    hasClaudeMd: false,
    skipPermissions: true,
    technologies: ['JavaScript'],
    lastModified: '2026-01-16T12:00:00Z',
    completion: {
      percentage: 45,
      missing: ['CLAUDE.md', 'Tests', 'Docker'],
      scores: {},
    },
  },
  {
    id: '3',
    name: 'project-gamma',
    hasActiveSession: false,
    hasGit: false,
    completion: {
      percentage: 20,
      missing: ['Git', 'CLAUDE.md', 'Tests', 'Docker', 'CI/CD'],
      scores: {},
    },
  },
];

describe('ProjectsTab', () => {
  const mockRefetch = vi.fn();
  const mockMutate = vi.fn();
  const mockOnEditClaudeMd = vi.fn();
  const mockOnCreateProject = vi.fn();
  const mockOnRenameProject = vi.fn();
  const mockOnDeleteProject = vi.fn();
  const mockOnComplianceCheck = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useApiQuery.mockReturnValue({
      data: mockProjects,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    useApiMutation.mockReturnValue({
      mutate: mockMutate,
      loading: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render project count in header', () => {
      render(<ProjectsTab />);

      expect(screen.getByText(/PROJECTS \[3\]/)).toBeInTheDocument();
    });

    it('should render all project cards', () => {
      render(<ProjectsTab />);

      expect(screen.getByText('project-alpha')).toBeInTheDocument();
      expect(screen.getByText('project-beta')).toBeInTheDocument();
      expect(screen.getByText('project-gamma')).toBeInTheDocument();
    });

    it('should display project completion percentages', () => {
      render(<ProjectsTab />);

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('should render summary stats', () => {
      render(<ProjectsTab />);

      // Total projects
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('TOTAL')).toBeInTheDocument();

      // Excellent (80%+)
      expect(screen.getByText('EXCELLENT (80%+)')).toBeInTheDocument();

      // Needs work (<40%)
      expect(screen.getByText('NEEDS WORK (<40%)')).toBeInTheDocument();
    });

    it('should show ACTIVE badge for active sessions', () => {
      render(<ProjectsTab />);

      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    it('should display project technologies', () => {
      render(<ProjectsTab />);

      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('should display missing items for incomplete projects', () => {
      render(<ProjectsTab />);

      // project-beta and project-gamma have missing items
      // Use getAllByText since multiple projects may have the same missing item
      const claudeMdMissing = screen.getAllByText('CLAUDE.md');
      expect(claudeMdMissing.length).toBeGreaterThan(0);

      const testsMissing = screen.getAllByText('Tests');
      expect(testsMissing.length).toBeGreaterThan(0);
    });
  });

  describe('loading state', () => {
    it('should show loading state on refresh button', () => {
      useApiQuery.mockReturnValue({
        data: mockProjects,
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProjectsTab />);

      expect(screen.getByText('[SCANNING...]')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message when fetch fails', () => {
      const mockError = {
        getUserMessage: () => 'Failed to load projects',
      };

      useApiQuery.mockReturnValue({
        data: [],
        loading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      render(<ProjectsTab />);

      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', () => {
      const mockError = {
        getUserMessage: () => 'Failed to load projects',
      };

      useApiQuery.mockReturnValue({
        data: [],
        loading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      render(<ProjectsTab />);

      fireEvent.click(screen.getByText('Retry'));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no projects', () => {
      useApiQuery.mockReturnValue({
        data: [],
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProjectsTab onCreateProject={mockOnCreateProject} />);

      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(screen.getByText('[+ CREATE FIRST PROJECT]')).toBeInTheDocument();
    });

    it('should call onCreateProject when create button is clicked in empty state', () => {
      useApiQuery.mockReturnValue({
        data: [],
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProjectsTab onCreateProject={mockOnCreateProject} />);

      fireEvent.click(screen.getByText('[+ CREATE FIRST PROJECT]'));

      expect(mockOnCreateProject).toHaveBeenCalled();
    });
  });

  describe('sorting', () => {
    it('should have sorting controls', () => {
      render(<ProjectsTab />);

      const sortSelect = screen.getByDisplayValue('Name');
      expect(sortSelect).toBeInTheDocument();
    });

    it('should change sort order when button clicked', () => {
      render(<ProjectsTab />);

      // Find and click the sort order toggle
      const sortButton = screen.getByTitle('Ascending');
      fireEvent.click(sortButton);

      expect(screen.getByTitle('Descending')).toBeInTheDocument();
    });

    it('should support sorting by completion', () => {
      render(<ProjectsTab />);

      const sortSelect = screen.getByDisplayValue('Name');
      fireEvent.change(sortSelect, { target: { value: 'completion' } });

      expect(screen.getByDisplayValue('Completion')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should call onCreateProject when new project button clicked', () => {
      render(<ProjectsTab onCreateProject={mockOnCreateProject} />);

      fireEvent.click(screen.getByText('[+ NEW PROJECT]'));

      expect(mockOnCreateProject).toHaveBeenCalled();
    });

    it('should call refetch when refresh button clicked', () => {
      render(<ProjectsTab />);

      fireEvent.click(screen.getByText('[REFRESH]'));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should call onEditClaudeMd when CLAUDE.MD button clicked', () => {
      render(<ProjectsTab onEditClaudeMd={mockOnEditClaudeMd} />);

      // Find the CLAUDE.MD button for project-alpha (which has CLAUDE.md)
      const claudeMdButtons = screen.getAllByText('CLAUDE.MD');
      fireEvent.click(claudeMdButtons[0]);

      expect(mockOnEditClaudeMd).toHaveBeenCalledWith('project-alpha');
    });

    it('should call onComplianceCheck when compliance button clicked', () => {
      render(<ProjectsTab onComplianceCheck={mockOnComplianceCheck} />);

      const complianceButtons = screen.getAllByText('COMPLIANCE');
      fireEvent.click(complianceButtons[0]);

      expect(mockOnComplianceCheck).toHaveBeenCalledWith(expect.objectContaining({
        name: 'project-alpha',
      }));
    });
  });

  describe('skip permissions toggle', () => {
    it('should display SKIP-PERMS for projects with skipPermissions true', () => {
      render(<ProjectsTab />);

      expect(screen.getByText('SKIP-PERMS')).toBeInTheDocument();
    });

    it('should display NORMAL for projects with skipPermissions false', () => {
      render(<ProjectsTab />);

      const normalButtons = screen.getAllByText('NORMAL');
      expect(normalButtons.length).toBeGreaterThan(0);
    });

    it('should call mutation when skip permissions toggled', async () => {
      mockMutate.mockResolvedValue({ success: true });

      render(<ProjectsTab />);

      // Click the NORMAL button to toggle to skip permissions
      const normalButtons = screen.getAllByText('NORMAL');
      fireEvent.click(normalButtons[0]);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.stringContaining('/projects/'),
          'PUT',
          expect.objectContaining({ skipPermissions: true })
        );
      });
    });
  });

  describe('project card details', () => {
    it('should show project description', () => {
      render(<ProjectsTab />);

      expect(screen.getByText('A test project')).toBeInTheDocument();
    });

    it('should show last modified date', () => {
      render(<ProjectsTab />);

      // The date format depends on locale, so just check for "Last modified:"
      const lastModified = screen.getAllByText(/Last modified:/);
      expect(lastModified.length).toBeGreaterThan(0);
    });

    it('should truncate long technology lists', () => {
      const projectWithManyTechs = {
        ...mockProjects[0],
        technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
      };

      useApiQuery.mockReturnValue({
        data: [projectWithManyTechs],
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProjectsTab />);

      // Should show +2 for extra techs (7 total, 5 shown)
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('average completion stats', () => {
    it('should calculate and display average completion', () => {
      render(<ProjectsTab />);

      // (85 + 45 + 20) / 3 = 50
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show active session count', () => {
      render(<ProjectsTab />);

      // Only project-alpha has an active session
      const activeStats = screen.getByText(/ACTIVE:/).closest('span');
      expect(activeStats).toHaveTextContent('1');
    });
  });

  describe('handles non-array data gracefully', () => {
    it('should handle null data', () => {
      useApiQuery.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProjectsTab />);

      expect(screen.getByText(/PROJECTS \[0\]/)).toBeInTheDocument();
    });

    it('should handle undefined data', () => {
      useApiQuery.mockReturnValue({
        data: undefined,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProjectsTab />);

      expect(screen.getByText(/PROJECTS \[0\]/)).toBeInTheDocument();
    });
  });
});

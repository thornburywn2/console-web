/**
 * LeftSidebar Component Tests
 * Phase 5.3: Unit tests for left sidebar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeftSidebar from './LeftSidebar';

// Mock child components
vi.mock('./WidgetDashboard', () => ({
  LeftSidebarWidgets: vi.fn(({ projects }) => (
    <div data-testid="widget-dashboard">
      {projects?.length || 0} projects
    </div>
  )),
}));

vi.mock('./UserProfileSection', () => ({
  default: vi.fn(({ collapsed }) => (
    <div data-testid="user-profile">
      User Profile {collapsed ? '(collapsed)' : '(expanded)'}
    </div>
  )),
}));

describe('LeftSidebar', () => {
  const mockOnSelectProject = vi.fn();
  const mockOnKillSession = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnOpenAdmin = vi.fn();
  const mockOnCreateProject = vi.fn();
  const mockOnOpenGitHubRepos = vi.fn();

  const mockProjects = [
    { name: 'project-1', path: '/path/to/project-1' },
    { name: 'project-2', path: '/path/to/project-2' },
  ];

  const defaultProps = {
    projects: mockProjects,
    selectedProject: null,
    onSelectProject: mockOnSelectProject,
    onKillSession: mockOnKillSession,
    onRefresh: mockOnRefresh,
    isLoading: false,
    onOpenAdmin: mockOnOpenAdmin,
    onCreateProject: mockOnCreateProject,
    onOpenGitHubRepos: mockOnOpenGitHubRepos,
    projectsDir: '/home/user/Projects',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('header', () => {
    it('should render PROJECTS title', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
    });

    it('should render folder icon in header', () => {
      const { container } = render(<LeftSidebar {...defaultProps} />);

      const folderIcon = container.querySelector('svg path[d*="M3 7v10"]');
      expect(folderIcon).toBeInTheDocument();
    });
  });

  describe('create project button', () => {
    it('should render create project button when onCreateProject is provided', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByTitle('Create new project')).toBeInTheDocument();
    });

    it('should not render create project button when onCreateProject is not provided', () => {
      render(<LeftSidebar {...defaultProps} onCreateProject={undefined} />);

      expect(screen.queryByTitle('Create new project')).not.toBeInTheDocument();
    });

    it('should call onCreateProject when clicked', () => {
      render(<LeftSidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new project'));

      expect(mockOnCreateProject).toHaveBeenCalled();
    });
  });

  describe('github repos button', () => {
    it('should render github repos button when onOpenGitHubRepos is provided', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByTitle('Browse GitHub repos')).toBeInTheDocument();
    });

    it('should not render github repos button when onOpenGitHubRepos is not provided', () => {
      render(<LeftSidebar {...defaultProps} onOpenGitHubRepos={undefined} />);

      expect(screen.queryByTitle('Browse GitHub repos')).not.toBeInTheDocument();
    });

    it('should call onOpenGitHubRepos when clicked', () => {
      render(<LeftSidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Browse GitHub repos'));

      expect(mockOnOpenGitHubRepos).toHaveBeenCalled();
    });
  });

  describe('refresh button', () => {
    it('should render refresh button', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByTitle('Refresh projects')).toBeInTheDocument();
    });

    it('should call onRefresh when clicked', () => {
      render(<LeftSidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Refresh projects'));

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('should disable refresh button when loading', () => {
      render(<LeftSidebar {...defaultProps} isLoading={true} />);

      const refreshButton = screen.getByTitle('Refresh projects');
      expect(refreshButton).toBeDisabled();
    });

    it('should show spinning animation when loading', () => {
      const { container } = render(<LeftSidebar {...defaultProps} isLoading={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show spinning animation when not loading', () => {
      const { container } = render(<LeftSidebar {...defaultProps} isLoading={false} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('widget dashboard', () => {
    it('should render LeftSidebarWidgets component', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByTestId('widget-dashboard')).toBeInTheDocument();
    });

    it('should pass projects to LeftSidebarWidgets', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByText('2 projects')).toBeInTheDocument();
    });
  });

  describe('user profile section', () => {
    it('should render UserProfileSection component', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    it('should pass collapsed=false to UserProfileSection', () => {
      render(<LeftSidebar {...defaultProps} />);

      expect(screen.getByText('User Profile (expanded)')).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should have correct sidebar width class', () => {
      const { container } = render(<LeftSidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-72');
    });

    it('should have glass-sidebar styling', () => {
      const { container } = render(<LeftSidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('glass-sidebar');
    });
  });
});

/**
 * RightSidebar Component Tests
 * Phase 5.3: Unit tests for right sidebar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RightSidebar from './RightSidebar';

// Mock child component
vi.mock('./WidgetDashboard', () => ({
  RightSidebarWidgets: vi.fn(({ selectedProject, onAction }) => (
    <div data-testid="widget-dashboard">
      {selectedProject?.name || 'No project selected'}
      <button onClick={() => onAction?.('admin')}>Open Admin</button>
      <button onClick={() => onAction?.('settings')}>Open Settings</button>
    </div>
  )),
}));

describe('RightSidebar', () => {
  const mockOnKillSession = vi.fn();
  const mockOnSelectProject = vi.fn();
  const mockOnOpenAdmin = vi.fn();
  const mockOnOpenCheckpoints = vi.fn();
  const mockOnOpenGitHubSettings = vi.fn();
  const mockOnRefresh = vi.fn();

  const mockProjects = [
    { name: 'project-1', path: '/path/to/project-1' },
    { name: 'project-2', path: '/path/to/project-2' },
  ];

  const mockSelectedProject = mockProjects[0];

  const defaultProps = {
    selectedProject: mockSelectedProject,
    projects: mockProjects,
    onKillSession: mockOnKillSession,
    onSelectProject: mockOnSelectProject,
    onOpenAdmin: mockOnOpenAdmin,
    onOpenCheckpoints: mockOnOpenCheckpoints,
    onOpenGitHubSettings: mockOnOpenGitHubSettings,
    onRefresh: mockOnRefresh,
    socket: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('header', () => {
    it('should render DASHBOARD title', () => {
      render(<RightSidebar {...defaultProps} />);

      expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
    });

    it('should render chart icon in header', () => {
      const { container } = render(<RightSidebar {...defaultProps} />);

      // Chart bar icon path
      const chartIcon = container.querySelector('svg path[d*="M9 19v-6"]');
      expect(chartIcon).toBeInTheDocument();
    });
  });

  describe('widget dashboard', () => {
    it('should render RightSidebarWidgets component', () => {
      render(<RightSidebar {...defaultProps} />);

      expect(screen.getByTestId('widget-dashboard')).toBeInTheDocument();
    });

    it('should pass selectedProject to RightSidebarWidgets', () => {
      render(<RightSidebar {...defaultProps} />);

      expect(screen.getByText('project-1')).toBeInTheDocument();
    });

    it('should show no project selected when no project is selected', () => {
      render(<RightSidebar {...defaultProps} selectedProject={null} />);

      expect(screen.getByText('No project selected')).toBeInTheDocument();
    });
  });

  describe('action handling', () => {
    it('should call onOpenAdmin when admin action is triggered', () => {
      render(<RightSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Open Admin'));

      expect(mockOnOpenAdmin).toHaveBeenCalled();
    });

    it('should call onOpenAdmin with settings when settings action is triggered', () => {
      render(<RightSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Open Settings'));

      expect(mockOnOpenAdmin).toHaveBeenCalledWith('settings');
    });
  });

  describe('layout', () => {
    it('should have correct sidebar width class', () => {
      const { container } = render(<RightSidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-72');
    });

    it('should have glass-sidebar-right styling', () => {
      const { container } = render(<RightSidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('glass-sidebar-right');
    });

    it('should have flex column layout', () => {
      const { container } = render(<RightSidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('flex');
      expect(sidebar).toHaveClass('flex-col');
    });
  });

  describe('scroll container', () => {
    it('should have overscroll-behavior contain', () => {
      const { container } = render(<RightSidebar {...defaultProps} />);

      const scrollContainer = container.querySelector('[style*="overscroll-behavior"]');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should have overflow-y-auto class', () => {
      const { container } = render(<RightSidebar {...defaultProps} />);

      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });
});

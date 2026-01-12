/**
 * Sidebar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Sidebar from './Sidebar';

// Mock child components
vi.mock('./SessionFolderTree', () => ({
  default: () => <div data-testid="folder-tree">SessionFolderTree</div>
}));

vi.mock('./TagManager', () => ({
  default: () => <div data-testid="tag-manager">TagManager</div>
}));

vi.mock('./PersonaSelector', () => ({
  default: ({ compact }) => (
    <div data-testid={compact ? "persona-selector-compact" : "persona-selector"}>
      PersonaSelector {compact ? '(compact)' : '(full)'}
    </div>
  )
}));

vi.mock('./RecentCommands', () => ({
  default: () => <div data-testid="recent-commands">RecentCommands</div>
}));

vi.mock('./AdminQuickAccess', () => ({
  default: () => <div data-testid="admin-quick-access">AdminQuickAccess</div>
}));

vi.mock('./UserProfileSection', () => ({
  default: () => <div data-testid="user-profile-section">UserProfileSection</div>
}));

vi.mock('./AgentStatusDashboard', () => ({
  default: () => <div data-testid="agent-status-dashboard">AgentStatusDashboard</div>
}));

describe('Sidebar', () => {
  const mockProjects = [
    { id: '1', name: 'Project Alpha', path: '/projects/alpha', hasActiveSession: true },
    { id: '2', name: 'Project Beta', path: '/projects/beta', hasActiveSession: false },
    { id: '3', name: 'Project Gamma', path: '/projects/gamma', hasActiveSession: true },
  ];

  const defaultProps = {
    projects: mockProjects,
    selectedProject: null,
    onSelectProject: vi.fn(),
    onKillSession: vi.fn(),
    onRefresh: vi.fn(),
    isLoading: false,
    collapsed: false,
    onToggleCollapse: vi.fn(),
    searchInputRef: { current: null },
    sessionManagement: {
      folders: [],
      selectedFolderId: null,
      setSelectedFolderId: vi.fn(),
      tags: [],
      selectedTags: [],
      toggleTagFilter: vi.fn(),
      createFolder: vi.fn(),
      renameFolder: vi.fn(),
      deleteFolder: vi.fn(),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      selectedSessions: new Set(),
      isMultiSelectMode: false,
      toggleSessionSelect: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the sidebar with projects heading', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('PROJECTS')).toBeInTheDocument();
  });

  it('should display project count in footer', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('3 projects')).toBeInTheDocument();
    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  it('should render all projects', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('Project Gamma')).toBeInTheDocument();
  });

  it('should call onSelectProject when a project is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Project Beta'));
    expect(defaultProps.onSelectProject).toHaveBeenCalledWith(mockProjects[1]);
  });

  it('should highlight selected project', () => {
    render(<Sidebar {...defaultProps} selectedProject={mockProjects[0]} />);
    const projectItem = screen.getByText('Project Alpha').closest('.sidebar-item');
    expect(projectItem.style.background).toContain('rgba(16, 185, 129');
  });

  it('should filter projects based on search query', () => {
    render(<Sidebar {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search projects...');

    fireEvent.change(searchInput, { target: { value: 'alpha' } });

    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
    expect(screen.queryByText('Project Gamma')).not.toBeInTheDocument();
  });

  it('should show "No matches" when search has no results', () => {
    render(<Sidebar {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search projects...');

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('should show "No projects" when projects array is empty', () => {
    render(<Sidebar {...defaultProps} projects={[]} />);
    expect(screen.getByText('No projects')).toBeInTheDocument();
  });

  it('should show loading spinner when loading and no projects', () => {
    render(<Sidebar {...defaultProps} projects={[]} isLoading={true} />);
    // The loading spinner is an SVG with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const refreshButton = screen.getByTitle('Refresh projects');
    fireEvent.click(refreshButton);
    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('should disable refresh button when loading', () => {
    render(<Sidebar {...defaultProps} isLoading={true} />);
    const refreshButton = screen.getByTitle('Refresh projects');
    expect(refreshButton).toBeDisabled();
  });

  // Collapse sidebar feature removed in current version
  it.skip('should call onToggleCollapse when collapse button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const collapseButton = screen.getByTitle('Collapse sidebar');
    fireEvent.click(collapseButton);
    expect(defaultProps.onToggleCollapse).toHaveBeenCalled();
  });

  it('should show kill button for projects with active sessions', () => {
    render(<Sidebar {...defaultProps} />);
    const alphaItem = screen.getByText('Project Alpha').closest('.sidebar-item');
    const killButton = within(alphaItem).getByTitle('Kill session');
    expect(killButton).toBeInTheDocument();
  });

  it('should not show kill button for projects without active sessions', () => {
    render(<Sidebar {...defaultProps} />);
    const betaItem = screen.getByText('Project Beta').closest('.sidebar-item');
    const killButton = within(betaItem).queryByTitle('Kill session');
    expect(killButton).not.toBeInTheDocument();
  });

  it('should require double click to kill session', () => {
    render(<Sidebar {...defaultProps} />);
    const alphaItem = screen.getByText('Project Alpha').closest('.sidebar-item');
    const killButton = within(alphaItem).getByTitle('Kill session');

    // First click - should show confirmation
    fireEvent.click(killButton);
    expect(defaultProps.onKillSession).not.toHaveBeenCalled();
    expect(within(alphaItem).getByTitle('Click again to confirm')).toBeInTheDocument();

    // Second click - should kill
    fireEvent.click(within(alphaItem).getByTitle('Click again to confirm'));
    expect(defaultProps.onKillSession).toHaveBeenCalledWith('/projects/alpha');
  });

  // Collapsed mode removed in current version
  it.skip('should hide content when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.queryByText('PROJECTS')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search projects...')).not.toBeInTheDocument();
  });

  it('should show sort menu when sort button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const sortButton = screen.getByTitle('Sort projects');
    fireEvent.click(sortButton);

    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Name (Z-A)')).toBeInTheDocument();
    expect(screen.getByText('Active First')).toBeInTheDocument();
    expect(screen.getByText('Pinned First')).toBeInTheDocument();
  });

  it('should sort projects by name A-Z', () => {
    render(<Sidebar {...defaultProps} />);

    // Open sort menu and select Name (A-Z)
    fireEvent.click(screen.getByTitle('Sort projects'));
    fireEvent.click(screen.getByText('Name (A-Z)'));

    const projectList = screen.getAllByRole('button').filter(
      btn => btn.textContent.includes('Project')
    );
    expect(projectList[0]).toHaveTextContent('Project Alpha');
    expect(projectList[1]).toHaveTextContent('Project Beta');
    expect(projectList[2]).toHaveTextContent('Project Gamma');
  });

  it('should handle keyboard navigation on project items', () => {
    render(<Sidebar {...defaultProps} />);
    const projectItem = screen.getByText('Project Alpha').closest('.sidebar-item');

    fireEvent.keyDown(projectItem, { key: 'Enter' });
    expect(defaultProps.onSelectProject).toHaveBeenCalledWith(mockProjects[0]);

    vi.clearAllMocks();

    fireEvent.keyDown(projectItem, { key: ' ' });
    expect(defaultProps.onSelectProject).toHaveBeenCalledWith(mockProjects[0]);
  });

  // Collapsible sections (Folders, Tags, AI Persona, Recent Commands) removed in current version
  describe.skip('Collapsible sections', () => {
    it('should toggle Folders section', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByTestId('folder-tree')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Folders'));
      expect(screen.queryByTestId('folder-tree')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Folders'));
      expect(screen.getByTestId('folder-tree')).toBeInTheDocument();
    });

    it('should toggle Tags section', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.queryByTestId('tag-manager')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Tags'));
      expect(screen.getByTestId('tag-manager')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Tags'));
      expect(screen.queryByTestId('tag-manager')).not.toBeInTheDocument();
    });

    it('should toggle AI Persona section', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByTestId('persona-selector')).toBeInTheDocument();
      expect(screen.queryByTestId('persona-selector-compact')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('AI Persona'));
      expect(screen.queryByTestId('persona-selector')).not.toBeInTheDocument();
      expect(screen.getByTestId('persona-selector-compact')).toBeInTheDocument();
      fireEvent.click(screen.getByText('AI Persona'));
      expect(screen.getByTestId('persona-selector')).toBeInTheDocument();
      expect(screen.queryByTestId('persona-selector-compact')).not.toBeInTheDocument();
    });

    it('should toggle Recent Commands section', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.queryByTestId('recent-commands')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Recent Commands'));
      expect(screen.getByTestId('recent-commands')).toBeInTheDocument();
    });
  });

  // Session management sections removed in current version
  describe.skip('Session management integration', () => {
    it('should show selected tags count badge', () => {
      const propsWithSelectedTags = {
        ...defaultProps,
        sessionManagement: {
          ...defaultProps.sessionManagement,
          selectedTags: ['tag1', 'tag2'],
        },
      };
      render(<Sidebar {...propsWithSelectedTags} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not show organization sections without sessionManagement', () => {
      const propsWithoutSession = { ...defaultProps, sessionManagement: null };
      render(<Sidebar {...propsWithoutSession} />);
      expect(screen.queryByText('Folders')).not.toBeInTheDocument();
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
      expect(screen.queryByText('AI Persona')).not.toBeInTheDocument();
      expect(screen.queryByText('Recent Commands')).not.toBeInTheDocument();
    });
  });

  describe('Sort persistence', () => {
    it('should call localStorage.setItem when sort is changed', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Sort projects'));
      fireEvent.click(screen.getByText('Name (A-Z)'));

      // Verify localStorage.setItem was called with the right values
      expect(localStorage.setItem).toHaveBeenCalledWith('ccm-sort-preference', 'name-asc');
    });

    it('should show sort menu with options', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Sort projects'));

      // Verify all sort options are available
      expect(screen.getByText('Recent')).toBeInTheDocument();
      expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
      expect(screen.getByText('Name (Z-A)')).toBeInTheDocument();
      expect(screen.getByText('Active First')).toBeInTheDocument();
      expect(screen.getByText('Pinned First')).toBeInTheDocument();
    });
  });
});

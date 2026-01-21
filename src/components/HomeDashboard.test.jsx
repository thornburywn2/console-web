/**
 * HomeDashboard Component Tests
 * Comprehensive tests for the home dashboard widget system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';

// Default mock data for most tests
const defaultMockData = {
  loading: false,
  data: {
    projectsExtended: [
      {
        id: 'proj-1',
        name: 'test-project',
        path: '/home/user/Projects/test-project',
        description: 'A test project',
        hasGit: true,
        completion: { percentage: 85 },
        technologies: ['React', 'Node.js'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
        port: 3000,
      },
      {
        id: 'proj-2',
        name: 'another-project',
        path: '/home/user/Projects/another-project',
        description: 'Another project',
        hasGit: true,
        completion: { percentage: 45 },
        technologies: ['Vue', 'Python'],
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-10T00:00:00Z',
        port: 5000,
      },
    ],
    system: { cpu: 50, memory: 60 },
    containers: [
      { id: 'container-1', name: '/test-project-web', state: 'running' },
      { id: 'container-2', name: '/test-project-db', state: 'running' },
      { id: 'container-3', name: '/another-project-api', state: 'exited' },
    ],
    dashboard: {
      gitStatuses: [
        { path: '/home/user/Projects/test-project', branch: 'main', staged: 2, unstaged: 1, untracked: 0 },
      ],
      shpoolSessions: ['sp-test-project'],
    },
  },
  refetchAll: vi.fn(),
};

const defaultRouteData = {
  data: {
    routes: [
      {
        hostname: 'test.example.com',
        subdomain: 'test',
        project: { name: 'test-project' },
        status: 'ACTIVE',
        localPort: 3000,
      },
    ],
  },
  refetch: vi.fn(),
};

// Mock the API hooks
vi.mock('../hooks/useApiQuery', () => ({
  useApiQueries: vi.fn(),
  useApiQuery: vi.fn(),
}));

// Mock the home-dashboard utils
vi.mock('./home-dashboard', () => ({
  LAST_ACCESSED_KEY: 'last-accessed',
  formatTimeAgo: vi.fn((date) => '5 days ago'),
  formatRelativeDate: vi.fn((date) => 'Jan 15'),
}));

// Import the mocked hooks for configuration
import { useApiQueries, useApiQuery } from '../hooks/useApiQuery';

describe('HomeDashboard', () => {
  const mockOnSelectProject = vi.fn();
  const mockOnCreateProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default data before each test
    vi.mocked(useApiQueries).mockReturnValue({ ...defaultMockData, refetchAll: vi.fn() });
    vi.mocked(useApiQuery).mockReturnValue({ ...defaultRouteData, refetch: vi.fn() });
  });

  describe('initial render', () => {
    it('should render the dashboard with projects table', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Projects')).toBeInTheDocument();
      });
    });

    it('should display the creation prompt', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('What would you like to create?')).toBeInTheDocument();
      });
    });

    it('should show the Create button', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      });
    });

    it('should display project names in the table', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument();
        expect(screen.getByText('another-project')).toBeInTheDocument();
      });
    });
  });

  describe('quick stats', () => {
    it('should display the total number of projects', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Projects:')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show active sessions count', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Active:')).toBeInTheDocument();
        // Find the Active: label and check its sibling has the count
        const activeLabel = screen.getByText('Active:');
        const activeValue = activeLabel.parentElement.querySelector('.text-emerald-500');
        expect(activeValue).toHaveTextContent('1');
      });
    });

    it('should display container counts', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Containers:')).toBeInTheDocument();
        expect(screen.getByText('2/3')).toBeInTheDocument(); // 2 running out of 3 total
      });
    });

    it('should display tunnel count', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Tunnels:')).toBeInTheDocument();
      });
    });
  });

  describe('table columns', () => {
    it('should display the Port column header', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Port')).toBeInTheDocument();
      });
    });

    it('should display port numbers for projects', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3000')).toBeInTheDocument();
        expect(screen.getByText('5000')).toBeInTheDocument();
      });
    });

    it('should display health column header', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Health')).toBeInTheDocument();
      });
    });

    it('should display health percentages', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('45%')).toBeInTheDocument();
      });
    });
  });

  describe('project selection', () => {
    it('should call onSelectProject when project row is clicked', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('test-project'));

      expect(mockOnSelectProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test-project' })
      );
    });
  });

  describe('project creation', () => {
    it('should call onCreateProject when Create button is clicked', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      expect(mockOnCreateProject).toHaveBeenCalled();
    });

    it('should call onCreateProject with prompt text when submitted', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      const input = screen.getByPlaceholderText('What would you like to create?');
      fireEvent.change(input, { target: { value: 'A new React app' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      expect(mockOnCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ initialPrompt: 'A new React app' })
      );
    });

    it('should clear input after submission', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      const input = screen.getByPlaceholderText('What would you like to create?');
      fireEvent.change(input, { target: { value: 'A new project' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should submit on Enter key press', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      const input = screen.getByPlaceholderText('What would you like to create?');
      fireEvent.change(input, { target: { value: 'Test app' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ initialPrompt: 'Test app' })
      );
    });
  });

  describe('filtering', () => {
    it('should have a filter input', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Filter projects...')).toBeInTheDocument();
      });
    });

    it('should filter projects by name', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      const filterInput = screen.getByPlaceholderText('Filter projects...');
      fireEvent.change(filterInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument();
        expect(screen.queryByText('another-project')).not.toBeInTheDocument();
      });
    });

    it('should show all projects when filter is cleared', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      const filterInput = screen.getByPlaceholderText('Filter projects...');

      // Apply filter
      fireEvent.change(filterInput, { target: { value: 'test' } });
      await waitFor(() => {
        expect(screen.queryByText('another-project')).not.toBeInTheDocument();
      });

      // Clear filter
      fireEvent.change(filterInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument();
        expect(screen.getByText('another-project')).toBeInTheDocument();
      });
    });
  });

  describe('sorting', () => {
    it('should have sortable Project column', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        const projectHeader = screen.getByText('Project');
        expect(projectHeader).toBeInTheDocument();
        expect(projectHeader.closest('th')).toHaveClass('cursor-pointer');
      });
    });

    it('should have sortable Health column', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        const healthHeader = screen.getByText('Health');
        expect(healthHeader).toBeInTheDocument();
        expect(healthHeader.closest('th')).toHaveClass('cursor-pointer');
      });
    });

    it('should toggle sort order when same column is clicked twice', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project')).toBeInTheDocument();
      });

      const projectHeader = screen.getByText('Project').closest('th');

      // Initial state - default is sortBy='name', sortOrder='asc' -> ↑ visible
      await waitFor(() => {
        expect(screen.getByText('↑')).toBeInTheDocument();
      });

      // First click - toggles to descending
      fireEvent.click(projectHeader);
      await waitFor(() => {
        expect(screen.getByText('↓')).toBeInTheDocument();
      });

      // Second click - toggles back to ascending
      fireEvent.click(projectHeader);
      await waitFor(() => {
        expect(screen.getByText('↑')).toBeInTheDocument();
      });
    });
  });

  describe('git status display', () => {
    it('should show git branch for projects with uncommitted changes', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });
    });

    it('should show staged changes count', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('+2')).toBeInTheDocument();
      });
    });

    it('should show unstaged changes count', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('~1')).toBeInTheDocument();
      });
    });

    it('should show clean status for projects without changes', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('clean')).toBeInTheDocument();
      });
    });
  });

  describe('cloudflare tunnel display', () => {
    it('should display tunnel subdomain for projects with routes', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
      });
    });

    it('should have link to tunnel hostname', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'https://test.example.com');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });
  });

  describe('refresh functionality', () => {
    it('should have a refresh button', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTitle('Refresh')).toBeInTheDocument();
      });
    });

    it('should call refetchAll when refresh is clicked', async () => {
      const mockRefetchAll = vi.fn();
      vi.mocked(useApiQueries).mockReturnValue({
        ...defaultMockData,
        refetchAll: mockRefetchAll,
      });

      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTitle('Refresh')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Refresh'));

      expect(mockRefetchAll).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading and no data', async () => {
      vi.mocked(useApiQueries).mockReturnValue({
        loading: true,
        data: {
          projectsExtended: [],
          system: null,
          containers: [],
          dashboard: null,
        },
        refetchAll: vi.fn(),
      });

      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should show empty message when no projects', async () => {
      vi.mocked(useApiQueries).mockReturnValue({
        loading: false,
        data: {
          projectsExtended: [],
          system: null,
          containers: [],
          dashboard: null,
        },
        refetchAll: vi.fn(),
      });

      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No projects found')).toBeInTheDocument();
      });
    });

    it('should show create button in empty state', async () => {
      vi.mocked(useApiQueries).mockReturnValue({
        loading: false,
        data: {
          projectsExtended: [],
          system: null,
          containers: [],
          dashboard: null,
        },
        refetchAll: vi.fn(),
      });

      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create your first project')).toBeInTheDocument();
      });
    });

    it('should show filter message when filter returns no results', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      const filterInput = screen.getByPlaceholderText('Filter projects...');
      fireEvent.change(filterInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No projects match your filter')).toBeInTheDocument();
      });
    });
  });

  describe('docker status display', () => {
    it('should show running container count for projects', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        // test-project has 2 running containers
        expect(screen.getByText('2/2')).toBeInTheDocument();
      });
    });
  });

  describe('session status display', () => {
    it('should show ACTIVE badge for projects with active sessions', async () => {
      render(
        <HomeDashboard
          onSelectProject={mockOnSelectProject}
          onCreateProject={mockOnCreateProject}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      });
    });
  });
});

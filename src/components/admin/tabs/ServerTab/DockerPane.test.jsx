/**
 * DockerPane Component Tests
 * Phase 5.3: Unit tests for Docker management pane
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DockerPane } from './DockerPane';

// Mock the useApiQuery hooks
vi.mock('../../../../hooks/useApiQuery', () => ({
  useApiQueries: vi.fn(),
  useApiMutation: vi.fn(),
}));

import { useApiQueries, useApiMutation } from '../../../../hooks/useApiQuery';

// Mock Docker data
const mockDockerSystem = {
  serverVersion: '24.0.7',
  operatingSystem: 'Ubuntu 22.04',
  architecture: 'x86_64',
  cpus: 8,
  memTotal: 34359738368, // 32 GB
  containers: {
    total: 5,
    running: 3,
    paused: 0,
    stopped: 2,
  },
  images: 15,
};

const mockContainers = [
  {
    id: 'abc123',
    fullId: 'abc123456789',
    name: 'web-server',
    image: 'nginx:latest',
    state: 'running',
    status: 'Up 2 days',
  },
  {
    id: 'def456',
    fullId: 'def456789012',
    name: 'database',
    image: 'postgres:15',
    state: 'running',
    status: 'Up 5 hours',
  },
  {
    id: 'ghi789',
    fullId: 'ghi789012345',
    name: 'redis-cache',
    image: 'redis:7',
    state: 'exited',
    status: 'Exited (0) 3 hours ago',
  },
];

const mockImages = [
  { Id: 'sha256:img1', RepoTags: ['nginx:latest'], Size: 142000000 },
  { Id: 'sha256:img2', RepoTags: ['postgres:15'], Size: 380000000 },
  { Id: 'sha256:img3', RepoTags: ['redis:7'], Size: 117000000 },
];

const mockVolumes = [
  { Name: 'postgres_data' },
  { Name: 'redis_data' },
];

const mockNetworks = [
  { Name: 'bridge' },
  { Name: 'host' },
  { Name: 'app_network' },
];

describe('DockerPane', () => {
  const mockRefetchAll = vi.fn();
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useApiQueries.mockReturnValue({
      loading: false,
      data: {
        system: mockDockerSystem,
        containers: mockContainers,
        images: mockImages,
        volumes: mockVolumes,
        networks: mockNetworks,
      },
      errors: {},
      hasErrors: false,
      refetchAll: mockRefetchAll,
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
    it('should render Docker stats cards', () => {
      render(<DockerPane />);

      expect(screen.getByText('CONTAINERS')).toBeInTheDocument();
      // RUNNING appears in both stats label and container badges
      const runningElements = screen.getAllByText('RUNNING');
      expect(runningElements.length).toBeGreaterThan(0);
      // IMAGES appears in both stats and section header
      const imagesElements = screen.getAllByText(/IMAGES/);
      expect(imagesElements.length).toBeGreaterThan(0);
      expect(screen.getByText('VOLUMES')).toBeInTheDocument();
    });

    it('should display container counts from system info', () => {
      render(<DockerPane />);

      // Total containers from dockerSystem
      expect(screen.getByText('5')).toBeInTheDocument();
      // Running count appears multiple times (stat card and images count)
      const threeElements = screen.getAllByText('3');
      expect(threeElements.length).toBeGreaterThan(0);
    });

    it('should display images count', () => {
      render(<DockerPane />);

      // Images array has 3 items
      const imagesCounts = screen.getAllByText('3');
      expect(imagesCounts.length).toBeGreaterThan(0);
    });

    it('should display volumes count', () => {
      render(<DockerPane />);

      // Volumes array has 2 items (may appear in multiple places)
      const twoElements = screen.getAllByText('2');
      expect(twoElements.length).toBeGreaterThan(0);
    });

    it('should render Docker engine info', () => {
      render(<DockerPane />);

      expect(screen.getByText('ENGINE')).toBeInTheDocument();
      expect(screen.getByText('24.0.7')).toBeInTheDocument();
      expect(screen.getByText('Ubuntu 22.04')).toBeInTheDocument();
      expect(screen.getByText('x86_64')).toBeInTheDocument();
    });

    it('should render Docker resources info', () => {
      render(<DockerPane />);

      expect(screen.getByText('RESOURCES')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // cpus
      expect(screen.getByText('32 GB')).toBeInTheDocument(); // memory
    });

    it('should render container counts section', () => {
      render(<DockerPane />);

      expect(screen.getByText('COUNTS')).toBeInTheDocument();
      expect(screen.getByText('paused')).toBeInTheDocument();
      expect(screen.getByText('stopped')).toBeInTheDocument();
    });

    it('should render container list header with count', () => {
      render(<DockerPane />);

      expect(screen.getByText(/CONTAINERS \[3\]/)).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<DockerPane />);

      expect(screen.getByText('[REFRESH]')).toBeInTheDocument();
    });
  });

  describe('containers list', () => {
    it('should display all containers', () => {
      render(<DockerPane />);

      expect(screen.getByText('web-server')).toBeInTheDocument();
      expect(screen.getByText('database')).toBeInTheDocument();
      expect(screen.getByText('redis-cache')).toBeInTheDocument();
    });

    it('should display container images', () => {
      render(<DockerPane />);

      expect(screen.getByText(/nginx:latest/)).toBeInTheDocument();
      expect(screen.getByText(/postgres:15/)).toBeInTheDocument();
      expect(screen.getByText(/redis:7/)).toBeInTheDocument();
    });

    it('should show RUNNING badge for running containers', () => {
      render(<DockerPane />);

      // RUNNING appears in stat label + 2 container badges = 3 total
      const runningBadges = screen.getAllByText('RUNNING');
      expect(runningBadges.length).toBe(3);
    });

    it('should show EXITED badge for stopped containers', () => {
      render(<DockerPane />);

      expect(screen.getByText('EXITED')).toBeInTheDocument();
    });

    it('should show STOP and RESTART buttons for running containers', () => {
      render(<DockerPane />);

      const stopButtons = screen.getAllByText('STOP');
      const restartButtons = screen.getAllByText('RESTART');
      expect(stopButtons.length).toBe(2);
      expect(restartButtons.length).toBe(2);
    });

    it('should show START button for stopped containers', () => {
      render(<DockerPane />);

      expect(screen.getByText('START')).toBeInTheDocument();
    });

    it('should show empty message when no containers', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: mockDockerSystem,
          containers: [],
          images: mockImages,
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      expect(screen.getByText('No containers found')).toBeInTheDocument();
    });
  });

  describe('images section', () => {
    it('should render images header with count', () => {
      render(<DockerPane />);

      expect(screen.getByText(/IMAGES \[3\]/)).toBeInTheDocument();
    });

    it('should display image names', () => {
      render(<DockerPane />);

      expect(screen.getByText('nginx')).toBeInTheDocument();
      expect(screen.getByText('postgres')).toBeInTheDocument();
      expect(screen.getByText('redis')).toBeInTheDocument();
    });

    it('should display image versions', () => {
      render(<DockerPane />);

      // Find version tags (e.g., "latest", "15", "7")
      expect(screen.getByText('latest')).toBeInTheDocument();
      // "15" may appear as postgres version and in system images count
      const fifteenElements = screen.getAllByText('15');
      expect(fifteenElements.length).toBeGreaterThan(0);
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should display image sizes', () => {
      render(<DockerPane />);

      // formatBytes adds decimal precision
      expect(screen.getByText(/135.*MB/)).toBeInTheDocument(); // nginx
      expect(screen.getByText(/362.*MB/)).toBeInTheDocument(); // postgres
      expect(screen.getByText(/111.*MB/)).toBeInTheDocument(); // redis
    });

    it('should show empty message when no images', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: mockDockerSystem,
          containers: mockContainers,
          images: [],
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      expect(screen.getByText('No images found')).toBeInTheDocument();
    });

    it('should show +X more when more than 12 images', () => {
      const manyImages = Array.from({ length: 15 }, (_, i) => ({
        Id: `sha256:img${i}`,
        RepoTags: [`app${i}:latest`],
        Size: 100000000,
      }));

      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: mockDockerSystem,
          containers: mockContainers,
          images: manyImages,
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      expect(screen.getByText('+3 more images')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show LOADING on refresh button', () => {
      useApiQueries.mockReturnValue({
        loading: true,
        data: {
          system: mockDockerSystem,
          containers: mockContainers,
          images: mockImages,
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      expect(screen.getByText('[LOADING...]')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('should show full error when all requests fail', () => {
      const mockError = {
        getUserMessage: () => 'Connection refused',
      };

      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: null,
          containers: null,
          images: null,
          volumes: null,
          networks: null,
        },
        errors: {
          system: mockError,
          containers: mockError,
          images: mockError,
          volumes: mockError,
          networks: mockError,
        },
        hasErrors: true,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      expect(screen.getByText('Docker Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to Docker. Is Docker daemon running?')).toBeInTheDocument();
      expect(screen.getByText('RETRY')).toBeInTheDocument();
    });

    it('should show partial error when some requests fail', () => {
      const mockError = {
        getUserMessage: () => 'Network timeout',
      };

      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: mockDockerSystem,
          containers: mockContainers,
          images: null,
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {
          images: mockError,
        },
        hasErrors: true,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      expect(screen.getByText('Partial Data Load')).toBeInTheDocument();
      expect(screen.getByText('images: Network timeout')).toBeInTheDocument();
    });

    it('should call refetchAll when retry button clicked', () => {
      const mockError = {
        getUserMessage: () => 'Connection refused',
      };

      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: null,
          containers: null,
          images: null,
          volumes: null,
          networks: null,
        },
        errors: {
          system: mockError,
          containers: mockError,
          images: mockError,
          volumes: mockError,
          networks: mockError,
        },
        hasErrors: true,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      fireEvent.click(screen.getByText('RETRY'));

      expect(mockRefetchAll).toHaveBeenCalled();
    });
  });

  describe('container actions', () => {
    it('should call stop action when STOP clicked', async () => {
      mockMutate.mockResolvedValue({ success: true });

      render(<DockerPane />);

      const stopButtons = screen.getAllByText('STOP');
      fireEvent.click(stopButtons[0]);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          '/docker/containers/abc123/stop',
          'POST'
        );
      });
    });

    it('should call start action when START clicked', async () => {
      mockMutate.mockResolvedValue({ success: true });

      render(<DockerPane />);

      fireEvent.click(screen.getByText('START'));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          '/docker/containers/ghi789/start',
          'POST'
        );
      });
    });

    it('should call restart action when RESTART clicked', async () => {
      mockMutate.mockResolvedValue({ success: true });

      render(<DockerPane />);

      const restartButtons = screen.getAllByText('RESTART');
      fireEvent.click(restartButtons[0]);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          '/docker/containers/abc123/restart',
          'POST'
        );
      });
    });

    it('should refresh data after successful action', async () => {
      mockMutate.mockResolvedValue({ success: true });

      render(<DockerPane />);

      fireEvent.click(screen.getByText('START'));

      await waitFor(() => {
        expect(mockRefetchAll).toHaveBeenCalled();
      });
    });

    it('should show action error on failure', async () => {
      mockMutate.mockResolvedValue({
        success: false,
        error: { getUserMessage: () => 'Container not found' },
      });

      render(<DockerPane />);

      fireEvent.click(screen.getByText('START'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to start container/)).toBeInTheDocument();
      });
    });

    it('should dismiss action error when DISMISS clicked', async () => {
      mockMutate.mockResolvedValue({
        success: false,
        error: { getUserMessage: () => 'Error occurred' },
      });

      render(<DockerPane />);

      fireEvent.click(screen.getByText('START'));

      await waitFor(() => {
        expect(screen.getByText('DISMISS')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('DISMISS'));

      await waitFor(() => {
        expect(screen.queryByText('DISMISS')).not.toBeInTheDocument();
      });
    });
  });

  describe('refresh functionality', () => {
    it('should call refetchAll when refresh button clicked', () => {
      render(<DockerPane />);

      fireEvent.click(screen.getByText('[REFRESH]'));

      expect(mockRefetchAll).toHaveBeenCalled();
    });

    it('should configure auto-refresh interval', () => {
      render(<DockerPane />);

      expect(useApiQueries).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          refetchInterval: 30000,
        })
      );
    });
  });

  describe('handles missing data gracefully', () => {
    it('should handle null system data', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: null,
          containers: mockContainers,
          images: mockImages,
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      // Should fallback to counting from arrays
      expect(screen.getByText(/CONTAINERS \[3\]/)).toBeInTheDocument();
    });

    it('should handle null containers array', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: mockDockerSystem,
          containers: null,
          images: mockImages,
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      expect(screen.getByText('No containers found')).toBeInTheDocument();
    });

    it('should handle undefined data', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {},
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      // Should show 0 for all counts and empty messages
      expect(screen.getByText('No containers found')).toBeInTheDocument();
      expect(screen.getByText('No images found')).toBeInTheDocument();
    });
  });

  describe('container without name', () => {
    it('should use truncated ID as fallback name', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          system: mockDockerSystem,
          containers: [
            {
              id: 'abc123456789',
              fullId: 'abc123456789abcdef',
              image: 'nginx:latest',
              state: 'running',
              status: 'Up 1 hour',
            },
          ],
          images: mockImages,
          volumes: mockVolumes,
          networks: mockNetworks,
        },
        errors: {},
        hasErrors: false,
        refetchAll: mockRefetchAll,
      });

      render(<DockerPane />);

      // Should show first 12 chars of ID
      expect(screen.getByText('abc123456789')).toBeInTheDocument();
    });
  });
});

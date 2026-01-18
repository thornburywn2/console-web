/**
 * ServicesPane Component Tests
 * Phase 5.3: Unit tests for systemd services management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServicesPane } from './ServicesPane';

// Mock the useApiQuery hooks
vi.mock('../../../../hooks/useApiQuery', () => ({
  useApiQueries: vi.fn(),
  useApiMutation: vi.fn(),
}));

import { useApiQueries, useApiMutation } from '../../../../hooks/useApiQuery';

// Mock server data
const mockServerStatus = {
  uptime: 432000, // 5 days
  network: [
    { name: 'eth0', address: '192.168.1.100' },
    { name: 'docker0', address: '172.17.0.1' },
    { name: 'lo', address: '127.0.0.1' },
  ],
};

const mockServices = [
  {
    unit: 'nginx.service',
    name: 'nginx',
    load: 'loaded',
    active: 'active',
    sub: 'running',
    description: 'A high performance web server',
  },
  {
    unit: 'postgresql.service',
    name: 'postgresql',
    load: 'loaded',
    active: 'active',
    sub: 'running',
    description: 'PostgreSQL database server',
  },
  {
    unit: 'redis-server.service',
    name: 'redis-server',
    load: 'loaded',
    active: 'inactive',
    sub: 'dead',
    description: 'Redis in-memory data store',
  },
];

const mockLogs = {
  logs: [
    'Jan 17 10:00:00 server systemd[1]: Started Nginx web server',
    'Jan 17 10:00:01 server nginx[1234]: Server listening on 0.0.0.0:80',
    'Jan 17 10:00:05 server postgresql[2345]: database system is ready',
  ],
};

describe('ServicesPane', () => {
  const mockRefetchAll = vi.fn();
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useApiQueries.mockReturnValue({
      loading: false,
      data: {
        status: mockServerStatus,
        services: mockServices,
        logs: mockLogs,
      },
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
    it('should render system controls section', () => {
      render(<ServicesPane />);

      expect(screen.getByText('SYSTEM CONTROLS')).toBeInTheDocument();
    });

    it('should render reboot button', () => {
      render(<ServicesPane />);

      expect(screen.getByText('[REBOOT SYSTEM]')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<ServicesPane />);

      expect(screen.getByText('[REFRESH]')).toBeInTheDocument();
    });

    it('should render services section with count', () => {
      render(<ServicesPane />);

      expect(screen.getByText(/SYSTEMD SERVICES \[3\]/)).toBeInTheDocument();
    });

    it('should render system logs section', () => {
      render(<ServicesPane />);

      expect(screen.getByText('SYSTEM LOGS')).toBeInTheDocument();
    });

    it('should render network interfaces section', () => {
      render(<ServicesPane />);

      expect(screen.getByText('NETWORK INTERFACES')).toBeInTheDocument();
    });
  });

  describe('services list', () => {
    it('should display all services', () => {
      render(<ServicesPane />);

      expect(screen.getByText('nginx')).toBeInTheDocument();
      expect(screen.getByText('postgresql')).toBeInTheDocument();
      expect(screen.getByText('redis-server')).toBeInTheDocument();
    });

    it('should display service descriptions', () => {
      render(<ServicesPane />);

      expect(screen.getByText('A high performance web server')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL database server')).toBeInTheDocument();
      expect(screen.getByText('Redis in-memory data store')).toBeInTheDocument();
    });

    it('should show running badge for active services', () => {
      render(<ServicesPane />);

      const runningBadges = screen.getAllByText('running');
      expect(runningBadges.length).toBe(2); // nginx and postgresql
    });

    it('should show dead badge for inactive services', () => {
      render(<ServicesPane />);

      expect(screen.getByText('dead')).toBeInTheDocument();
    });

    it('should show loading message when no services', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: mockServerStatus,
          services: [],
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('Loading services...')).toBeInTheDocument();
    });
  });

  describe('system logs', () => {
    it('should display log entries', () => {
      render(<ServicesPane />);

      expect(screen.getByText(/Started Nginx web server/)).toBeInTheDocument();
      expect(screen.getByText(/Server listening on/)).toBeInTheDocument();
      expect(screen.getByText(/database system is ready/)).toBeInTheDocument();
    });

    it('should show loading message when no logs', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: mockServerStatus,
          services: mockServices,
          logs: { logs: [] },
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
    });
  });

  describe('network interfaces', () => {
    it('should display all network interfaces', () => {
      render(<ServicesPane />);

      expect(screen.getByText('eth0')).toBeInTheDocument();
      expect(screen.getByText('docker0')).toBeInTheDocument();
      expect(screen.getByText('lo')).toBeInTheDocument();
    });

    it('should display IP addresses', () => {
      render(<ServicesPane />);

      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('172.17.0.1')).toBeInTheDocument();
      expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    });

    it('should not render network section when no interfaces', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: { ...mockServerStatus, network: [] },
          services: mockServices,
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.queryByText('NETWORK INTERFACES')).not.toBeInTheDocument();
    });

    it('should handle interface without IP address', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: {
            ...mockServerStatus,
            network: [{ name: 'tun0' }],
          },
          services: mockServices,
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('tun0')).toBeInTheDocument();
      expect(screen.getByText('No IP')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show LOADING on refresh button', () => {
      useApiQueries.mockReturnValue({
        loading: true,
        data: {
          status: mockServerStatus,
          services: mockServices,
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('[LOADING...]')).toBeInTheDocument();
    });
  });

  describe('reboot confirmation', () => {
    it('should show confirmation modal when reboot clicked', () => {
      render(<ServicesPane />);

      fireEvent.click(screen.getByText('[REBOOT SYSTEM]'));

      expect(screen.getByText('Confirm reboot')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to reboot/)).toBeInTheDocument();
    });

    it('should show confirm and cancel buttons in modal', () => {
      render(<ServicesPane />);

      fireEvent.click(screen.getByText('[REBOOT SYSTEM]'));

      expect(screen.getByText('[CONFIRM REBOOT]')).toBeInTheDocument();
      expect(screen.getByText('[CANCEL]')).toBeInTheDocument();
    });

    it('should close modal when cancel clicked', () => {
      render(<ServicesPane />);

      fireEvent.click(screen.getByText('[REBOOT SYSTEM]'));
      expect(screen.getByText('Confirm reboot')).toBeInTheDocument();

      fireEvent.click(screen.getByText('[CANCEL]'));

      expect(screen.queryByText('Confirm reboot')).not.toBeInTheDocument();
    });

    it('should call server action when confirm clicked', async () => {
      mockMutate.mockResolvedValue({ success: true });

      render(<ServicesPane />);

      fireEvent.click(screen.getByText('[REBOOT SYSTEM]'));
      fireEvent.click(screen.getByText('[CONFIRM REBOOT]'));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('/server/reboot', 'POST');
      });
    });

    it('should close modal after successful action', async () => {
      mockMutate.mockResolvedValue({ success: true });

      render(<ServicesPane />);

      fireEvent.click(screen.getByText('[REBOOT SYSTEM]'));
      fireEvent.click(screen.getByText('[CONFIRM REBOOT]'));

      await waitFor(() => {
        expect(screen.queryByText('Confirm reboot')).not.toBeInTheDocument();
      });
    });

    it('should show executing state in button', async () => {
      // Mock a slow action
      mockMutate.mockImplementation(() => new Promise(() => {}));

      render(<ServicesPane />);

      fireEvent.click(screen.getByText('[REBOOT SYSTEM]'));
      fireEvent.click(screen.getByText('[CONFIRM REBOOT]'));

      expect(screen.getByText('[EXECUTING...]')).toBeInTheDocument();
    });
  });

  describe('refresh functionality', () => {
    it('should call refetchAll when refresh clicked', () => {
      render(<ServicesPane />);

      fireEvent.click(screen.getByText('[REFRESH]'));

      expect(mockRefetchAll).toHaveBeenCalled();
    });

    it('should configure auto-refresh interval', () => {
      render(<ServicesPane />);

      expect(useApiQueries).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          refetchInterval: 15000,
        })
      );
    });
  });

  describe('handles missing data gracefully', () => {
    it('should handle null status', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: null,
          services: mockServices,
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      // Should not crash, network section should not render
      expect(screen.queryByText('NETWORK INTERFACES')).not.toBeInTheDocument();
    });

    it('should handle null services', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: mockServerStatus,
          services: null,
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('Loading services...')).toBeInTheDocument();
    });

    it('should handle null logs', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: mockServerStatus,
          services: mockServices,
          logs: null,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
    });

    it('should handle empty data object', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {},
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      // Should show loading states for services and logs
      expect(screen.getByText('Loading services...')).toBeInTheDocument();
      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
    });
  });

  describe('service without description', () => {
    it('should handle service with only unit name', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: mockServerStatus,
          services: [
            {
              unit: 'custom.service',
              active: 'active',
              sub: 'running',
            },
          ],
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('custom')).toBeInTheDocument();
    });

    it('should handle service with name instead of unit', () => {
      useApiQueries.mockReturnValue({
        loading: false,
        data: {
          status: mockServerStatus,
          services: [
            {
              name: 'my-app',
              active: 'active',
              sub: 'running',
              description: 'My Application',
            },
          ],
          logs: mockLogs,
        },
        refetchAll: mockRefetchAll,
      });

      render(<ServicesPane />);

      expect(screen.getByText('my-app')).toBeInTheDocument();
    });
  });
});

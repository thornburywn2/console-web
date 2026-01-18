/**
 * OverviewPane Component Tests
 * Phase 5.3: Unit tests for the server overview pane
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OverviewPane } from './OverviewPane';

// Mock the useApiQuery hook
vi.mock('../../../../hooks/useApiQuery', () => ({
  useApiQuery: vi.fn(),
}));

import { useApiQuery } from '../../../../hooks/useApiQuery';

// Mock system info data
const mockSystemInfo = {
  cpu: {
    model: 'Intel Core i7-10700K',
    count: 8,
    usage: 35.5,
  },
  memory: {
    total: 34359738368, // 32 GB
    used: 17179869184, // 16 GB
    free: 17179869184, // 16 GB
    usedPercent: 50,
  },
  disk: {
    total: 1099511627776, // 1 TB
    used: 549755813888, // 512 GB
    free: 549755813888, // 512 GB
    usedPercent: 50,
  },
  uptime: 432000, // 5 days
  loadAvg: [1.5, 2.0, 1.8],
  system: {
    hostname: 'dev-server',
    platform: 'linux',
    arch: 'x64',
  },
  process: {
    nodeVersion: 'v20.10.0',
  },
};

describe('OverviewPane', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useApiQuery.mockReturnValue({
      data: mockSystemInfo,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render CPU usage', () => {
      render(<OverviewPane />);

      expect(screen.getByText('36%')).toBeInTheDocument(); // Math.round(35.5)
      expect(screen.getByText('CPU USAGE')).toBeInTheDocument();
    });

    it('should render memory usage', () => {
      render(<OverviewPane />);

      // Memory and disk both show 50% in mock data, so use getAllByText
      const fiftyPercents = screen.getAllByText('50%');
      expect(fiftyPercents.length).toBeGreaterThanOrEqual(2);
      // MEMORY appears in both quick stats label and section header
      const memoryTexts = screen.getAllByText('MEMORY');
      expect(memoryTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should render disk usage', () => {
      render(<OverviewPane />);

      // DISK appears in both the quick stats header and the detail section
      const diskTexts = screen.getAllByText('DISK');
      expect(diskTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should render uptime', () => {
      render(<OverviewPane />);

      expect(screen.getByText('5d 0h 0m')).toBeInTheDocument();
      expect(screen.getByText('UPTIME')).toBeInTheDocument();
    });

    it('should render CPU info section', () => {
      render(<OverviewPane />);

      expect(screen.getByText('CPU')).toBeInTheDocument();
      expect(screen.getByText('Intel Core i7-10700K')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // cores
    });

    it('should render memory info section', () => {
      render(<OverviewPane />);

      // Multiple 'total' labels exist (memory, disk)
      const totalLabels = screen.getAllByText('total');
      expect(totalLabels.length).toBeGreaterThan(0);
      expect(screen.getByText('32 GB')).toBeInTheDocument();
      // 16 GB appears twice (used and free)
      const sixteenGb = screen.getAllByText('16 GB');
      expect(sixteenGb.length).toBe(2);
    });

    it('should render disk info section', () => {
      render(<OverviewPane />);

      expect(screen.getByText('1 TB')).toBeInTheDocument();
      // 512 GB appears twice (used and free)
      const fivetwelveGb = screen.getAllByText('512 GB');
      expect(fivetwelveGb.length).toBe(2);
    });

    it('should render system info section', () => {
      render(<OverviewPane />);

      expect(screen.getByText('SYSTEM INFO')).toBeInTheDocument();
      expect(screen.getByText('dev-server')).toBeInTheDocument();
      expect(screen.getByText('linux')).toBeInTheDocument();
      expect(screen.getByText('v20.10.0')).toBeInTheDocument();
      expect(screen.getByText('x64')).toBeInTheDocument();
    });

    it('should render load average section', () => {
      render(<OverviewPane />);

      expect(screen.getByText('LOAD AVERAGE')).toBeInTheDocument();
      expect(screen.getByText('1.50')).toBeInTheDocument();
      expect(screen.getByText('2.00')).toBeInTheDocument();
      expect(screen.getByText('1.80')).toBeInTheDocument();
      expect(screen.getByText('1 min')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
      expect(screen.getByText('15 min')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<OverviewPane />);

      expect(screen.getByText('[REFRESH]')).toBeInTheDocument();
    });

    it('should show last updated time', () => {
      render(<OverviewPane />);

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner on initial load', () => {
      useApiQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      // Look for the spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show REFRESHING on refresh button while loading', () => {
      useApiQuery.mockReturnValue({
        data: mockSystemInfo,
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      expect(screen.getByText('[REFRESHING...]')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state when no data and error', () => {
      const mockError = {
        getUserMessage: () => 'Failed to load system info',
      };

      useApiQuery.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      expect(screen.getByText('Failed to Load System Info')).toBeInTheDocument();
      expect(screen.getByText('Failed to load system info')).toBeInTheDocument();
      expect(screen.getByText('[RETRY]')).toBeInTheDocument();
    });

    it('should call refetch when retry button clicked', () => {
      const mockError = {
        getUserMessage: () => 'Failed to load system info',
      };

      useApiQuery.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      fireEvent.click(screen.getByText('[RETRY]'));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show error banner when refresh fails but have stale data', () => {
      const mockError = {
        getUserMessage: () => 'Refresh failed',
      };

      useApiQuery.mockReturnValue({
        data: mockSystemInfo,
        loading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      // Should still show data
      expect(screen.getByText('dev-server')).toBeInTheDocument();
      // Should show error banner
      expect(screen.getByText('Refresh failed')).toBeInTheDocument();
    });
  });

  describe('refresh functionality', () => {
    it('should call useApiQuery with correct endpoint', () => {
      render(<OverviewPane />);

      expect(useApiQuery).toHaveBeenCalledWith('/admin/system', expect.objectContaining({
        refetchInterval: 10000,
      }));
    });

    it('should call refetch when refresh button clicked', () => {
      render(<OverviewPane />);

      fireEvent.click(screen.getByText('[REFRESH]'));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('usage bars', () => {
    it('should show red color for high CPU usage', () => {
      useApiQuery.mockReturnValue({
        data: { ...mockSystemInfo, cpu: { ...mockSystemInfo.cpu, usage: 85 } },
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      // Check that high usage gets red styling (in the progress bar)
      // CSS colors may be converted to rgb() format
      const cpuSection = screen.getByText('CPU').closest('.hacker-card');
      const progressBar = cpuSection?.querySelector('.hacker-progress-bar');
      const bgColor = progressBar?.style.background;
      // Either hex or rgb format is acceptable
      const isRed = bgColor?.includes('ff3333') || bgColor?.includes('rgb(255, 51, 51)');
      expect(isRed).toBe(true);
    });

    it('should show green color for normal CPU usage', () => {
      render(<OverviewPane />);

      const cpuSection = screen.getByText('CPU').closest('.hacker-card');
      const progressBar = cpuSection?.querySelector('.hacker-progress-bar');
      const bgColor = progressBar?.style.background;
      // Either hex or rgb format is acceptable
      const isGreen = bgColor?.includes('00ff41') || bgColor?.includes('rgb(0, 255, 65)');
      expect(isGreen).toBe(true);
    });
  });

  describe('handles missing data gracefully', () => {
    it('should handle missing cpu data', () => {
      useApiQuery.mockReturnValue({
        data: { ...mockSystemInfo, cpu: null },
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      // Should show 0% for CPU usage
      expect(screen.getByText('0%')).toBeInTheDocument();
      // Multiple N/A for missing cpu model and cores
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });

    it('should handle missing loadAvg', () => {
      useApiQuery.mockReturnValue({
        data: { ...mockSystemInfo, loadAvg: null },
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      // Should not render load average section
      expect(screen.queryByText('LOAD AVERAGE')).not.toBeInTheDocument();
    });

    it('should handle missing system info', () => {
      useApiQuery.mockReturnValue({
        data: { ...mockSystemInfo, system: null },
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      // Should show N/A for system fields
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  describe('utility functions', () => {
    it('should format bytes correctly', () => {
      render(<OverviewPane />);

      // 32 GB memory total
      expect(screen.getByText('32 GB')).toBeInTheDocument();
      // 1 TB disk total
      expect(screen.getByText('1 TB')).toBeInTheDocument();
    });

    it('should format uptime correctly', () => {
      render(<OverviewPane />);

      // 432000 seconds = 5 days
      expect(screen.getByText('5d 0h 0m')).toBeInTheDocument();
    });

    it('should format uptime for hours only', () => {
      useApiQuery.mockReturnValue({
        data: { ...mockSystemInfo, uptime: 7200 }, // 2 hours
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      expect(screen.getByText('2h 0m')).toBeInTheDocument();
    });

    it('should format uptime for minutes only', () => {
      useApiQuery.mockReturnValue({
        data: { ...mockSystemInfo, uptime: 300 }, // 5 minutes
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OverviewPane />);

      expect(screen.getByText('5m')).toBeInTheDocument();
    });
  });
});

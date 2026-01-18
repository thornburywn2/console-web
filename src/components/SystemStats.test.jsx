/**
 * SystemStats Component Tests
 * Phase 5.3: Unit tests for system stats display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SystemStats from './SystemStats';

// Mock the API service
vi.mock('../services/api.js', () => ({
  systemApi: {
    getStats: vi.fn(),
  },
}));

import { systemApi } from '../services/api.js';

describe('SystemStats', () => {
  const mockStats = {
    cpu: {
      usage: 45,
      count: 8,
    },
    memory: {
      used: 8589934592, // 8 GB
      total: 17179869184, // 16 GB
      usedPercent: 50,
    },
    disk: {
      used: 214748364800, // 200 GB
      total: 536870912000, // 500 GB
      usedPercent: 40,
    },
    uptime: 345600, // 4 days
    loadAvg: [1.5, 1.2, 0.8],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('loading state', () => {
    it('should show loading spinner initially', () => {
      systemApi.getStats.mockImplementation(() => new Promise(() => {}));

      render(<SystemStats />);

      // Should show loading spinner (SVG with animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message on API failure', async () => {
      const mockError = { getUserMessage: () => 'Connection error' };
      systemApi.getStats.mockRejectedValue(mockError);

      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('Connection error')).toBeInTheDocument();
      });
    });

    it('should use fallback error message if getUserMessage not available', async () => {
      systemApi.getStats.mockRejectedValue(new Error('Network error'));

      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load stats')).toBeInTheDocument();
      });
    });
  });

  describe('stats display', () => {
    beforeEach(() => {
      systemApi.getStats.mockResolvedValue(mockStats);
    });

    it('should display CPU usage', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('CPU')).toBeInTheDocument();
        expect(screen.getByText('45%')).toBeInTheDocument();
      });
    });

    it('should display CPU core count', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('8 cores')).toBeInTheDocument();
      });
    });

    it('should display memory usage', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('MEM')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
    });

    it('should display memory details', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('8.0GB/16.0GB')).toBeInTheDocument();
      });
    });

    it('should display disk usage', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('DISK')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
      });
    });

    it('should display disk details', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('200.0GB/500.0GB')).toBeInTheDocument();
      });
    });

    it('should display load average', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('LOAD: 1.50 1.20 0.80')).toBeInTheDocument();
      });
    });

    it('should display uptime', async () => {
      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('UP: 4d 0h')).toBeInTheDocument();
      });
    });
  });

  describe('uptime formatting', () => {
    it('should format hours and minutes when less than a day', async () => {
      systemApi.getStats.mockResolvedValue({
        ...mockStats,
        uptime: 7260, // 2 hours, 1 minute
      });

      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('UP: 2h 1m')).toBeInTheDocument();
      });
    });

    it('should format only minutes when less than an hour', async () => {
      systemApi.getStats.mockResolvedValue({
        ...mockStats,
        uptime: 1800, // 30 minutes
      });

      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('UP: 30m')).toBeInTheDocument();
      });
    });

    it('should show N/A when uptime is not available', async () => {
      systemApi.getStats.mockResolvedValue({
        ...mockStats,
        uptime: null,
      });

      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('UP: N/A')).toBeInTheDocument();
      });
    });
  });

  describe('color coding', () => {
    it('should use green for low usage (< 70%)', async () => {
      systemApi.getStats.mockResolvedValue({
        ...mockStats,
        cpu: { usage: 50, count: 4 },
      });

      render(<SystemStats />);

      await waitFor(() => {
        const cpuBar = document.querySelector('.stat-bar-fill.green');
        expect(cpuBar).toBeInTheDocument();
      });
    });

    it('should use yellow for medium usage (70-89%)', async () => {
      systemApi.getStats.mockResolvedValue({
        ...mockStats,
        cpu: { usage: 75, count: 4 },
      });

      render(<SystemStats />);

      await waitFor(() => {
        const cpuBar = document.querySelector('.stat-bar-fill.yellow');
        expect(cpuBar).toBeInTheDocument();
      });
    });

    it('should use red for high usage (>= 90%)', async () => {
      systemApi.getStats.mockResolvedValue({
        ...mockStats,
        cpu: { usage: 95, count: 4 },
      });

      render(<SystemStats />);

      await waitFor(() => {
        const cpuBar = document.querySelector('.stat-bar-fill.red');
        expect(cpuBar).toBeInTheDocument();
      });
    });
  });

  describe('null handling', () => {
    it('should handle null stats gracefully', async () => {
      systemApi.getStats.mockResolvedValue({
        cpu: null,
        memory: null,
        disk: null,
        uptime: null,
        loadAvg: null,
      });

      render(<SystemStats />);

      await waitFor(() => {
        expect(screen.getByText('CPU')).toBeInTheDocument();
        expect(screen.getByText('MEM')).toBeInTheDocument();
        expect(screen.getByText('DISK')).toBeInTheDocument();
        // All should show 0% (multiple times)
        const zeroPercents = screen.getAllByText('0%');
        expect(zeroPercents.length).toBe(3);
        expect(screen.getByText('LOAD: N/A')).toBeInTheDocument();
      });
    });
  });

  describe('auto-refresh', () => {
    it('should refresh stats every 2 seconds', async () => {
      systemApi.getStats.mockResolvedValue(mockStats);

      render(<SystemStats />);

      await waitFor(() => {
        expect(systemApi.getStats).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 2 seconds
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(systemApi.getStats).toHaveBeenCalledTimes(2);
      });

      // Advance timer by 2 more seconds
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(systemApi.getStats).toHaveBeenCalledTimes(3);
      });
    });
  });
});

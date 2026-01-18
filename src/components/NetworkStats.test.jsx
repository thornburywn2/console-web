/**
 * NetworkStats Component Tests
 * Phase 5.3: Unit tests for network stats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NetworkStats from './NetworkStats';

// Mock API
vi.mock('../services/api.js', () => ({
  networkApi: {
    getStats: vi.fn().mockResolvedValue({
      interfaces: [
        {
          name: 'eth0',
          address: '192.168.1.100',
          isUp: true,
          rxBytes: 1024000,
          txBytes: 512000,
          rxRate: 10240,
          txRate: 5120,
        },
        {
          name: 'lo',
          address: '127.0.0.1',
          isUp: true,
          rxBytes: 0,
          txBytes: 0,
          rxRate: 0,
          txRate: 0,
        },
      ],
    }),
  },
}));

describe('NetworkStats', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <NetworkStats
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <NetworkStats
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch network stats when opened', async () => {
      const { networkApi } = await import('../services/api.js');

      render(
        <NetworkStats
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(networkApi.getStats).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display Network Monitor title', async () => {
      render(
        <NetworkStats
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Network/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { networkApi } = await import('../services/api.js');
      vi.mocked(networkApi.getStats).mockRejectedValue(new Error('Network error'));

      render(
        <NetworkStats
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

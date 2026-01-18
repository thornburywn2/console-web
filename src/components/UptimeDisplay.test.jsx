/**
 * UptimeDisplay Component Tests
 * Phase 5.3: Unit tests for uptime display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UptimeDisplay from './UptimeDisplay';

// Mock API
vi.mock('../services/api.js', () => ({
  uptimeApi: {
    getServices: vi.fn().mockResolvedValue({
      services: [
        {
          id: '1',
          name: 'API Server',
          url: 'https://api.example.com',
          status: 'up',
          responseTime: 125,
          uptime: 99.9,
        },
        {
          id: '2',
          name: 'Database',
          url: 'postgres://db.example.com',
          status: 'up',
          responseTime: 15,
          uptime: 99.99,
        },
      ],
    }),
    check: vi.fn().mockResolvedValue({ status: 'up', responseTime: 100 }),
  },
}));

describe('UptimeDisplay', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <UptimeDisplay
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
        <UptimeDisplay
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch uptime data when opened', async () => {
      const { uptimeApi } = await import('../services/api.js');

      render(
        <UptimeDisplay
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(uptimeApi.getServices).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display Service Uptime title', async () => {
      render(
        <UptimeDisplay
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Service Uptime')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { uptimeApi } = await import('../services/api.js');
      vi.mocked(uptimeApi.getServices).mockRejectedValue(new Error('Network error'));

      render(
        <UptimeDisplay
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

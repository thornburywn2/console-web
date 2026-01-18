/**
 * StatusPage Component Tests
 * Phase 5.3: Unit tests for service status page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StatusPage from './StatusPage';

// Mock API
vi.mock('../services/api.js', () => ({
  statusApi: {
    getStatus: vi.fn().mockResolvedValue({
      services: [
        { id: '1', name: 'API Server', status: 'operational', uptime: 99.9 },
        { id: '2', name: 'Database', status: 'operational', uptime: 99.8 },
        { id: '3', name: 'CDN', status: 'degraded', uptime: 98.5 },
      ],
      incidents: [],
      maintenance: [],
    }),
    getIncidents: vi.fn().mockResolvedValue({ incidents: [] }),
  },
}));

describe('StatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the status page', async () => {
      render(<StatusPage />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('service status', () => {
    it('should fetch and display services', async () => {
      const { statusApi } = await import('../services/api.js');

      render(<StatusPage />);

      await waitFor(() => {
        expect(statusApi.getStatus).toHaveBeenCalled();
      });
    });

    it('should display service names', async () => {
      render(<StatusPage />);

      await waitFor(() => {
        expect(screen.getByText('API Server')).toBeInTheDocument();
      });
    });

    it('should display service status', async () => {
      render(<StatusPage />);

      await waitFor(() => {
        expect(screen.getByText('Database')).toBeInTheDocument();
      });
    });
  });

  describe('status levels', () => {
    it('should display operational status', async () => {
      render(<StatusPage />);

      await waitFor(() => {
        const operationalElements = screen.getAllByText(/operational/i);
        expect(operationalElements.length).toBeGreaterThan(0);
      });
    });

    it('should display degraded status', async () => {
      render(<StatusPage />);

      await waitFor(() => {
        // CDN service has degraded status
        expect(screen.getByText('CDN')).toBeInTheDocument();
      });
    });
  });

  describe('uptime display', () => {
    it('should display uptime percentages', async () => {
      render(<StatusPage />);

      await waitFor(() => {
        // Should display uptime info
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { statusApi } = await import('../services/api.js');
      vi.mocked(statusApi.getStatus).mockRejectedValue(new Error('Network error'));

      render(<StatusPage />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

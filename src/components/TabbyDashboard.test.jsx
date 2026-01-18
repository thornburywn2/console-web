/**
 * TabbyDashboard Component Tests
 * Phase 5.3: Unit tests for Tabby dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { TabbyDashboard } from './TabbyDashboard';

// Mock API
vi.mock('../services/api.js', () => ({
  tabbyApi: {
    getStatus: vi.fn().mockResolvedValue({
      installed: true,
      running: true,
      version: '0.12.0',
    }),
    getModels: vi.fn().mockResolvedValue({
      available: ['StarCoder-1B', 'StarCoder-3B'],
      current: 'StarCoder-1B',
    }),
    getConfig: vi.fn().mockResolvedValue({
      model: 'StarCoder-1B',
      useGpu: false,
      port: 8080,
    }),
  },
}));

// Mock child components
vi.mock('./tabby-dashboard', () => ({
  DEFAULT_CONFIG: {
    model: 'StarCoder-1B',
    useGpu: false,
    port: 8080,
  },
}));

describe('TabbyDashboard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the dashboard', async () => {
      render(<TabbyDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch status on mount', async () => {
      const { tabbyApi } = await import('../services/api.js');

      render(<TabbyDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(tabbyApi.getStatus).toHaveBeenCalled();
      });
    });

    it('should fetch models on mount', async () => {
      const { tabbyApi } = await import('../services/api.js');

      render(<TabbyDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(tabbyApi.getModels).toHaveBeenCalled();
      });
    });

    it('should fetch config on mount', async () => {
      const { tabbyApi } = await import('../services/api.js');

      render(<TabbyDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(tabbyApi.getConfig).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { tabbyApi } = await import('../services/api.js');
      vi.mocked(tabbyApi.getStatus).mockRejectedValue(new Error('Network error'));

      render(<TabbyDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

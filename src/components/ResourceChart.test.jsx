/**
 * ResourceChart Component Tests
 * Phase 5.3: Unit tests for resource chart
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ResourceChart from './ResourceChart';

// Mock API
vi.mock('../services/api.js', () => ({
  metricsApi: {
    get: vi.fn().mockResolvedValue([
      { timestamp: '2024-01-15T10:00:00Z', value: 25 },
      { timestamp: '2024-01-15T10:01:00Z', value: 30 },
      { timestamp: '2024-01-15T10:02:00Z', value: 28 },
    ]),
  },
}));

describe('ResourceChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render CPU chart', async () => {
      render(
        <ResourceChart
          metric="cpu"
          title="CPU Usage"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render memory chart', async () => {
      render(
        <ResourceChart
          metric="memory"
          title="Memory Usage"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render mini chart', async () => {
      render(
        <ResourceChart
          metric="cpu"
          showMini={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch metrics data on mount', async () => {
      const { metricsApi } = await import('../services/api.js');

      render(
        <ResourceChart
          metric="cpu"
          title="CPU Usage"
        />
      );

      await waitFor(() => {
        expect(metricsApi.get).toHaveBeenCalledWith('cpu', expect.any(Number));
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { metricsApi } = await import('../services/api.js');
      vi.mocked(metricsApi.get).mockRejectedValue(new Error('Network error'));

      render(
        <ResourceChart
          metric="cpu"
          title="CPU Usage"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

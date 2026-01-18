/**
 * ContainerMetrics Component Tests
 * Phase 5.3: Unit tests for Docker container metrics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ContainerMetrics from './ContainerMetrics';

// Mock API
vi.mock('../services/api.js', () => ({
  dockerStatsApi: {
    getContainerStats: vi.fn().mockResolvedValue({
      containers: [
        { id: 'abc123', name: 'test-container', image: 'node:18', status: 'running', cpu: 25.5, memoryPercent: 48.2 },
        { id: 'def456', name: 'db-container', image: 'postgres:15', status: 'running', cpu: 10.1, memoryPercent: 32.5 },
      ],
    }),
  },
}));

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  scale: vi.fn(),
});

describe('ContainerMetrics', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', { value: 2 });
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <ContainerMetrics
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
        <ContainerMetrics
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should display container names', async () => {
      render(
        <ContainerMetrics
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('test-container')).toBeInTheDocument();
      });
    });
  });

  describe('metrics fetching', () => {
    it('should fetch container stats', async () => {
      const { dockerStatsApi } = await import('../services/api.js');

      render(
        <ContainerMetrics
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(dockerStatsApi.getContainerStats).toHaveBeenCalled();
      });
    });
  });

  describe('metrics display', () => {
    it('should display CPU column', async () => {
      render(
        <ContainerMetrics
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const cpuLabels = screen.getAllByText('CPU');
        expect(cpuLabels.length).toBeGreaterThan(0);
      });
    });

    it('should display MEM column', async () => {
      render(
        <ContainerMetrics
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const memLabels = screen.getAllByText('MEM');
        expect(memLabels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { dockerStatsApi } = await import('../services/api.js');
      vi.mocked(dockerStatsApi.getContainerStats).mockRejectedValue(new Error('Connection failed'));

      render(
        <ContainerMetrics
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

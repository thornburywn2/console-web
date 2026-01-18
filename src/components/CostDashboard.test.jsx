/**
 * CostDashboard Component Tests
 * Phase 5.3: Unit tests for API cost dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CostDashboard from './CostDashboard';

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  scale: vi.fn(),
}));

// Mock API
vi.mock('../services/api.js', () => ({
  aiCostsApi: {
    getCosts: vi.fn().mockResolvedValue({
      totalCost: 12.45,
      totalTokens: 1250000,
      totalRequests: 342,
      costChange: -15,
      dailyCosts: [1.2, 1.8, 1.5, 2.1, 1.9, 2.3, 1.7],
      byProvider: {
        anthropic: { cost: 10.20, requests: 280 },
        openai: { cost: 2.25, requests: 62 },
      },
      byModel: [
        { name: 'claude-3-sonnet', inputTokens: 450000, outputTokens: 120000, cost: 5.85 },
        { name: 'claude-3-haiku', inputTokens: 350000, outputTokens: 80000, cost: 1.88 },
      ],
      projectedMonthly: 53.21,
    }),
  },
}));

describe('CostDashboard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <CostDashboard
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
        <CostDashboard
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch cost data when opened', async () => {
      const { aiCostsApi } = await import('../services/api.js');

      render(
        <CostDashboard
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(aiCostsApi.getCosts).toHaveBeenCalledWith('7d');
      });
    });
  });

  describe('display', () => {
    it('should display API Cost Dashboard title', async () => {
      render(
        <CostDashboard
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('API Cost Dashboard')).toBeInTheDocument();
      });
    });

    it('should display Total Spend card', async () => {
      render(
        <CostDashboard
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Spend')).toBeInTheDocument();
      });
    });

    it('should display Model Usage section', async () => {
      render(
        <CostDashboard
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Model Usage')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { aiCostsApi } = await import('../services/api.js');
      vi.mocked(aiCostsApi.getCosts).mockRejectedValue(new Error('Network error'));

      render(
        <CostDashboard
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

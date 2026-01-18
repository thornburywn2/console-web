/**
 * SwarmDashboard Component Tests
 * Phase 5.3: Unit tests for swarm dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SwarmDashboard } from './SwarmDashboard';

// Mock API
vi.mock('../services/api.js', () => ({
  claudeFlowApi: {
    getStatus: vi.fn().mockResolvedValue({
      installed: true,
      version: '1.0.0',
    }),
    listSwarms: vi.fn().mockResolvedValue([]),
    getRoles: vi.fn().mockResolvedValue({
      architect: { name: 'Architect' },
      implementer: { name: 'Implementer' },
    }),
    getTemplates: vi.fn().mockResolvedValue({
      basic: { name: 'Basic Swarm' },
    }),
  },
}));

// Mock child components
vi.mock('./swarm-dashboard', () => ({
  DEFAULT_SWARM_CONFIG: {
    name: 'New Swarm',
    roles: [],
    maxAgents: 3,
  },
}));

describe('SwarmDashboard', () => {
  const mockOnClose = vi.fn();
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the dashboard', async () => {
      render(
        <SwarmDashboard
          projectPath="/home/user/project"
          socket={mockSocket}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without socket', async () => {
      render(
        <SwarmDashboard
          projectPath="/home/user/project"
          socket={null}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch status on mount', async () => {
      const { claudeFlowApi } = await import('../services/api.js');

      render(
        <SwarmDashboard
          projectPath="/home/user/project"
          socket={mockSocket}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(claudeFlowApi.getStatus).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { claudeFlowApi } = await import('../services/api.js');
      vi.mocked(claudeFlowApi.getStatus).mockRejectedValue(new Error('Network error'));

      render(
        <SwarmDashboard
          projectPath="/home/user/project"
          socket={mockSocket}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

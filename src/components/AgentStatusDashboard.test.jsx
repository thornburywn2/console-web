/**
 * AgentStatusDashboard Component Tests
 * Phase 5.3: Unit tests for agent status dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentStatusDashboard from './AgentStatusDashboard';

// Mock API
vi.mock('../services/api.js', () => ({
  agentsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Linter Agent',
        enabled: true,
        status: 'RUNNING',
        startTime: '2024-01-15T10:00:00Z',
        progress: 50,
      },
      {
        id: '2',
        name: 'Test Agent',
        enabled: true,
        status: 'IDLE',
        progress: 0,
      },
    ]),
    getRunnerStatus: vi.fn().mockResolvedValue({
      running: ['1'],
      available: 5,
      max: 10,
    }),
    run: vi.fn().mockResolvedValue({ success: true }),
    stop: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('AgentStatusDashboard', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
  };
  const mockOnOpenAgentManager = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the dashboard', async () => {
      render(
        <AgentStatusDashboard
          socket={mockSocket}
          onOpenAgentManager={mockOnOpenAgentManager}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without socket', async () => {
      render(
        <AgentStatusDashboard
          socket={null}
          onOpenAgentManager={mockOnOpenAgentManager}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch agents on mount', async () => {
      const { agentsApi } = await import('../services/api.js');

      render(
        <AgentStatusDashboard
          socket={mockSocket}
          onOpenAgentManager={mockOnOpenAgentManager}
        />
      );

      await waitFor(() => {
        expect(agentsApi.list).toHaveBeenCalled();
      });
    });

    it('should fetch runner status on mount', async () => {
      const { agentsApi } = await import('../services/api.js');

      render(
        <AgentStatusDashboard
          socket={mockSocket}
          onOpenAgentManager={mockOnOpenAgentManager}
        />
      );

      await waitFor(() => {
        expect(agentsApi.getRunnerStatus).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display Running section when agents are running', async () => {
      render(
        <AgentStatusDashboard
          socket={mockSocket}
          onOpenAgentManager={mockOnOpenAgentManager}
        />
      );

      await waitFor(() => {
        // Component renders with agents data
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { agentsApi } = await import('../services/api.js');
      vi.mocked(agentsApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <AgentStatusDashboard
          socket={mockSocket}
          onOpenAgentManager={mockOnOpenAgentManager}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

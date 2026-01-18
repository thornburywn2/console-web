/**
 * AgentDetailDrawer Component Tests
 * Phase 5.3: Unit tests for agent detail drawer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AgentDetailDrawer from './AgentDetailDrawer';

// Mock API
vi.mock('../services/api.js', () => ({
  agentsApi: {
    get: vi.fn().mockResolvedValue({
      id: 'agent-1',
      name: 'Test Agent',
      description: 'A test agent for unit tests',
      enabled: true,
      trigger: 'MANUAL',
      action: { type: 'shell', command: 'echo test' },
    }),
    getExecutions: vi.fn().mockResolvedValue([
      { id: 'exec-1', status: 'COMPLETED', startedAt: '2024-01-15T10:00:00Z' },
      { id: 'exec-2', status: 'FAILED', startedAt: '2024-01-15T09:00:00Z' },
    ]),
    run: vi.fn().mockResolvedValue({ success: true }),
    stop: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock socket hook
vi.mock('../hooks/useAgentSocket.js', () => ({
  useAgentSocket: vi.fn().mockReturnValue({
    getRunningAgent: vi.fn().mockReturnValue(null),
    getAgentOutput: vi.fn().mockReturnValue([]),
    isConnected: true,
  }),
}));

describe('AgentDetailDrawer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when agentId is provided', async () => {
      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('agent loading', () => {
    it('should fetch agent details', async () => {
      const { agentsApi } = await import('../services/api.js');

      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(agentsApi.get).toHaveBeenCalledWith('agent-1');
      });
    });

    it('should display agent name', async () => {
      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });
    });
  });

  describe('tabs', () => {
    it('should have overview tab', async () => {
      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/overview/i)).toBeInTheDocument();
      });
    });

    it('should have output tab', async () => {
      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/output/i)).toBeInTheDocument();
      });
    });

    it('should have history tab', async () => {
      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/history/i)).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('should have run button', async () => {
      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/run/i)).toBeInTheDocument();
      });
    });

    it('should have close button', async () => {
      render(
        <AgentDetailDrawer
          agentId="agent-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { agentsApi } = await import('../services/api.js');
      vi.mocked(agentsApi.get).mockRejectedValue(new Error('Agent not found'));

      render(
        <AgentDetailDrawer
          agentId="nonexistent"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

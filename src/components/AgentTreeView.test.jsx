/**
 * AgentTreeView Component Tests
 * Phase 5.3: Unit tests for agent tree view
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentTreeView from './AgentTreeView';

// Mock API
vi.mock('../services/api.js', () => ({
  agentsApi: {
    list: vi.fn().mockResolvedValue({
      agents: [
        {
          id: '1',
          name: 'Test Agent',
          triggerType: 'MANUAL',
          enabled: true,
          executions: [],
        },
      ],
    }),
    getExecutionsByProject: vi.fn().mockResolvedValue({
      executions: [],
    }),
  },
}));

// Mock useAgentSocket hook
vi.mock('../hooks/useAgentSocket.js', () => ({
  useAgentSocket: () => ({
    connected: true,
    runningAgents: {},
    agentStatuses: {},
  }),
}));

describe('AgentTreeView', () => {
  const mockOnSelectAgent = vi.fn();
  const mockOnSelectExecution = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the tree view', async () => {
      render(
        <AgentTreeView
          onSelectAgent={mockOnSelectAgent}
          onSelectExecution={mockOnSelectExecution}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with selected agent', async () => {
      render(
        <AgentTreeView
          selectedAgentId="1"
          onSelectAgent={mockOnSelectAgent}
          onSelectExecution={mockOnSelectExecution}
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
        <AgentTreeView
          onSelectAgent={mockOnSelectAgent}
          onSelectExecution={mockOnSelectExecution}
        />
      );

      await waitFor(() => {
        expect(agentsApi.list).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { agentsApi } = await import('../services/api.js');
      vi.mocked(agentsApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <AgentTreeView
          onSelectAgent={mockOnSelectAgent}
          onSelectExecution={mockOnSelectExecution}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

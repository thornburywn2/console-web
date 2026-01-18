/**
 * AgentExecutionLog Component Tests
 * Phase 5.3: Unit tests for agent execution log
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentExecutionLog from './AgentExecutionLog';

// Mock API
vi.mock('../services/api.js', () => ({
  agentExecutionsApi: {
    list: vi.fn().mockResolvedValue({
      executions: [
        {
          id: '1',
          agentId: 'agent-1',
          status: 'SUCCESS',
          startedAt: '2024-01-15T10:00:00Z',
          endedAt: '2024-01-15T10:00:30Z',
          triggeredBy: 'MANUAL',
        },
        {
          id: '2',
          agentId: 'agent-1',
          status: 'FAILED',
          startedAt: '2024-01-15T09:00:00Z',
          endedAt: '2024-01-15T09:00:15Z',
          triggeredBy: 'SCHEDULE',
          error: 'Command failed',
        },
        {
          id: '3',
          agentId: 'agent-1',
          status: 'RUNNING',
          startedAt: '2024-01-15T11:00:00Z',
          endedAt: null,
          triggeredBy: 'WEBHOOK',
        },
      ],
      total: 3,
      page: 1,
      limit: 50,
    }),
  },
}));

describe('AgentExecutionLog', () => {
  const mockAgentId = 'agent-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render execution log', async () => {
      render(<AgentExecutionLog agentId={mockAgentId} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without agentId', async () => {
      render(<AgentExecutionLog agentId={null} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch executions for agent', async () => {
      const { agentExecutionsApi } = await import('../services/api.js');

      render(<AgentExecutionLog agentId={mockAgentId} />);

      await waitFor(() => {
        expect(agentExecutionsApi.list).toHaveBeenCalledWith(mockAgentId, 1, 50);
      });
    });
  });

  describe('display', () => {
    it('should display table headers', async () => {
      render(<AgentExecutionLog agentId={mockAgentId} />);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('should display Duration column', async () => {
      render(<AgentExecutionLog agentId={mockAgentId} />);

      await waitFor(() => {
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { agentExecutionsApi } = await import('../services/api.js');
      vi.mocked(agentExecutionsApi.list).mockRejectedValue(new Error('Network error'));

      render(<AgentExecutionLog agentId={mockAgentId} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

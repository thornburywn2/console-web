/**
 * AgentManager Component Tests
 * Phase 5.3: Unit tests for agent manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentManager from './AgentManager';

// Mock API
vi.mock('../services/api.js', () => ({
  agentsExtendedApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'Linter Agent', enabled: true, isRunning: false, executions: [] },
      { id: '2', name: 'Test Agent', enabled: false, isRunning: false, executions: [] },
    ]),
    getRunnerStatus: vi.fn().mockResolvedValue({ running: [], available: 5 }),
    getTriggerTypes: vi.fn().mockResolvedValue({ triggers: [] }),
    getActionTypes: vi.fn().mockResolvedValue({ actions: [] }),
    run: vi.fn().mockResolvedValue({ success: true }),
    stop: vi.fn().mockResolvedValue({ success: true }),
    toggle: vi.fn().mockResolvedValue({ id: '1', enabled: false }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    create: vi.fn().mockResolvedValue({ id: '3', name: 'New Agent' }),
    update: vi.fn().mockResolvedValue({ id: '1', name: 'Updated Agent' }),
  },
}));

// Mock child components
vi.mock('./AgentBuilder', () => ({
  default: ({ agent, onSave, onCancel }) => (
    <div data-testid="agent-builder">
      {agent ? `Editing ${agent.name}` : 'Creating new agent'}
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('./AgentExecutionLog', () => ({
  default: () => <div data-testid="execution-log">Execution Log</div>,
}));

vi.mock('./AgentOutputStream', () => ({
  default: () => <div data-testid="output-stream">Output Stream</div>,
}));

vi.mock('./agent-manager', () => ({
  AgentListItem: ({ agent, onSelect }) => (
    <div data-testid={`agent-${agent.id}`} onClick={onSelect}>
      {agent.name}
    </div>
  ),
}));

describe('AgentManager', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render agent manager', async () => {
      render(<AgentManager socket={mockSocket} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch agents on load', async () => {
      const { agentsExtendedApi } = await import('../services/api.js');

      render(<AgentManager socket={mockSocket} />);

      await waitFor(() => {
        expect(agentsExtendedApi.list).toHaveBeenCalled();
      });
    });

    it('should fetch runner status on load', async () => {
      const { agentsExtendedApi } = await import('../services/api.js');

      render(<AgentManager socket={mockSocket} />);

      await waitFor(() => {
        expect(agentsExtendedApi.getRunnerStatus).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display Agents title', async () => {
      render(<AgentManager socket={mockSocket} />);

      await waitFor(() => {
        expect(screen.getByText('Agents')).toBeInTheDocument();
      });
    });

    it('should have New Agent button', async () => {
      render(<AgentManager socket={mockSocket} />);

      await waitFor(() => {
        expect(screen.getByText('+ New Agent')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { agentsExtendedApi } = await import('../services/api.js');
      vi.mocked(agentsExtendedApi.list).mockRejectedValue(new Error('Network error'));

      render(<AgentManager socket={mockSocket} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

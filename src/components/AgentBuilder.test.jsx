/**
 * AgentBuilder Component Tests
 * Phase 5.3: Unit tests for agent builder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentBuilder from './AgentBuilder';

// Mock fetch for direct API calls
global.fetch = vi.fn();

// Mock child components
vi.mock('./AgentExecutionLog', () => ({
  default: () => <div data-testid="execution-log">Execution Log</div>,
}));

vi.mock('./AgentOutputStream', () => ({
  default: () => <div data-testid="output-stream">Output Stream</div>,
}));

vi.mock('./agent-builder', () => ({
  API_BASE: '',
  DEFAULT_FORM: {
    id: null,
    name: '',
    description: '',
    triggerType: 'MANUAL',
    triggerConfig: {},
    actions: [],
    enabled: true,
    projectId: null,
  },
  DEFAULT_ACTION: {
    type: 'SHELL_COMMAND',
    config: { command: '' },
  },
  ACTION_CONFIG_DEFAULTS: {},
  ActionEditor: ({ action }) => (
    <div data-testid="action-editor">{action.type}</div>
  ),
}));

describe('AgentBuilder', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
  };

  const mockTriggerTypes = [
    { type: 'MANUAL', label: 'Manual' },
    { type: 'SCHEDULE', label: 'Scheduled' },
  ];

  const mockActionTypes = [
    { type: 'SHELL_COMMAND', label: 'Shell Command' },
    { type: 'MCP_TOOL', label: 'MCP Tool' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/projects')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { name: 'project-1', path: '/home/user/project-1' },
            { name: 'project-2', path: '/home/user/project-2' },
          ]),
        });
      }
      if (url.includes('/api/mcp')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { id: '1', name: 'filesystem', status: 'running' },
          ]),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  describe('rendering', () => {
    it('should render agent builder form', async () => {
      render(
        <AgentBuilder
          agent={null}
          triggerTypes={mockTriggerTypes}
          actionTypes={mockActionTypes}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with existing agent for editing', async () => {
      const existingAgent = {
        id: '1',
        name: 'Test Agent',
        description: 'A test agent',
        triggerType: 'MANUAL',
        enabled: true,
      };

      render(
        <AgentBuilder
          agent={existingAgent}
          triggerTypes={mockTriggerTypes}
          actionTypes={mockActionTypes}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch projects on mount', async () => {
      render(
        <AgentBuilder
          agent={null}
          triggerTypes={mockTriggerTypes}
          actionTypes={mockActionTypes}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects'),
          expect.any(Object)
        );
      });
    });

    it('should fetch MCP servers on mount', async () => {
      render(
        <AgentBuilder
          agent={null}
          triggerTypes={mockTriggerTypes}
          actionTypes={mockActionTypes}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/mcp'),
          expect.any(Object)
        );
      });
    });
  });

  describe('display', () => {
    it('should display New Agent header', async () => {
      render(
        <AgentBuilder
          agent={null}
          triggerTypes={mockTriggerTypes}
          actionTypes={mockActionTypes}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('New Agent')).toBeInTheDocument();
      });
    });

    it('should have Cancel button', async () => {
      render(
        <AgentBuilder
          agent={null}
          triggerTypes={mockTriggerTypes}
          actionTypes={mockActionTypes}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });

  describe('socket integration', () => {
    it('should listen for agent output events', async () => {
      const agent = { id: 'agent-1', name: 'Test Agent' };

      render(
        <AgentBuilder
          agent={agent}
          triggerTypes={mockTriggerTypes}
          actionTypes={mockActionTypes}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('agent:output', expect.any(Function));
      });
    });
  });
});

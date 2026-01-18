/**
 * CodePuppyDashboard Component Tests
 * Phase 5.3: Unit tests for Code Puppy dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CodePuppyDashboard } from './CodePuppyDashboard';

// Mock API
vi.mock('../services/api.js', () => ({
  codePuppyApi: {
    getStatus: vi.fn().mockResolvedValue({
      installed: true,
      version: '1.0.0',
      running: false,
    }),
    getSessions: vi.fn().mockResolvedValue([]),
    getAgents: vi.fn().mockResolvedValue({
      builtin: [{ name: 'code-puppy', description: 'Default agent' }],
      custom: [],
    }),
    getProviders: vi.fn().mockResolvedValue({
      anthropic: { models: ['claude-sonnet-4-20250514'] },
    }),
    getAvailableTools: vi.fn().mockResolvedValue([]),
    getConfig: vi.fn().mockResolvedValue({}),
    getMcpServers: vi.fn().mockResolvedValue({}),
    getCommands: vi.fn().mockResolvedValue({ builtin: [], custom: [] }),
  },
}));

// Mock child components
vi.mock('./code-puppy', () => ({
  TABS: {
    status: { label: 'Status', icon: '📊' },
    session: { label: 'Session', icon: '💻' },
    agents: { label: 'Agents', icon: '🤖' },
    models: { label: 'Models', icon: '🧠' },
    mcp: { label: 'MCP', icon: '🔌' },
    config: { label: 'Config', icon: '⚙️' },
    commands: { label: 'Commands', icon: '📝' },
  },
  StatusTab: () => <div data-testid="status-tab">Status Tab</div>,
  SessionTab: () => <div data-testid="session-tab">Session Tab</div>,
  AgentsTab: () => <div data-testid="agents-tab">Agents Tab</div>,
  ModelsTab: () => <div data-testid="models-tab">Models Tab</div>,
  McpTab: () => <div data-testid="mcp-tab">MCP Tab</div>,
  ConfigTab: () => <div data-testid="config-tab">Config Tab</div>,
  CommandsTab: () => <div data-testid="commands-tab">Commands Tab</div>,
}));

describe('CodePuppyDashboard', () => {
  const mockOnClose = vi.fn();
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  const mockProjects = [
    { name: 'project-1', path: '/home/user/project-1' },
    { name: 'project-2', path: '/home/user/project-2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the dashboard', async () => {
      render(
        <CodePuppyDashboard
          onClose={mockOnClose}
          socket={mockSocket}
          projects={mockProjects}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with empty projects', async () => {
      render(
        <CodePuppyDashboard
          onClose={mockOnClose}
          socket={mockSocket}
          projects={[]}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without socket', async () => {
      render(
        <CodePuppyDashboard
          onClose={mockOnClose}
          socket={null}
          projects={mockProjects}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch status on mount', async () => {
      const { codePuppyApi } = await import('../services/api.js');

      render(
        <CodePuppyDashboard
          onClose={mockOnClose}
          socket={mockSocket}
          projects={mockProjects}
        />
      );

      await waitFor(() => {
        expect(codePuppyApi.getStatus).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { codePuppyApi } = await import('../services/api.js');
      vi.mocked(codePuppyApi.getStatus).mockRejectedValue(new Error('Network error'));

      render(
        <CodePuppyDashboard
          onClose={mockOnClose}
          socket={mockSocket}
          projects={mockProjects}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

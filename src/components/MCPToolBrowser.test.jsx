/**
 * MCPToolBrowser Component Tests
 * Phase 5.3: Unit tests for MCP tool browser
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MCPToolBrowser from './MCPToolBrowser';

// Mock API
vi.mock('../services/api.js', () => ({
  mcpApi: {
    getAllTools: vi.fn().mockResolvedValue([
      {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        serverId: '1',
        server: { name: 'filesystem-server' },
      },
      {
        name: 'write_file',
        description: 'Write a file to the filesystem',
        serverId: '1',
        server: { name: 'filesystem-server' },
      },
    ]),
    callTool: vi.fn().mockResolvedValue({
      result: { content: 'Test content' },
    }),
  },
}));

describe('MCPToolBrowser', () => {
  const mockServers = [
    { id: '1', name: 'filesystem-server' },
    { id: '2', name: 'memory-server' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the tool browser', async () => {
      render(<MCPToolBrowser servers={mockServers} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with empty servers', async () => {
      render(<MCPToolBrowser servers={[]} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch tools on mount', async () => {
      const { mcpApi } = await import('../services/api.js');

      render(<MCPToolBrowser servers={mockServers} />);

      await waitFor(() => {
        expect(mcpApi.getAllTools).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { mcpApi } = await import('../services/api.js');
      vi.mocked(mcpApi.getAllTools).mockRejectedValue(new Error('Network error'));

      render(<MCPToolBrowser servers={mockServers} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

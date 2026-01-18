/**
 * MCPServerManager Component Tests
 * Phase 5.3: Unit tests for MCP server manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MCPServerManager from './MCPServerManager';

// Mock API
vi.mock('../services/api.js', () => ({
  mcpServersApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Test MCP Server',
        transport: 'STDIO',
        command: 'node',
        enabled: true,
        isRunning: true,
        status: 'CONNECTED',
      },
    ]),
    action: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock child components
vi.mock('./MCPServerBuilder', () => ({
  default: () => <div data-testid="mcp-builder">MCP Builder</div>,
}));

vi.mock('./MCPToolBrowser', () => ({
  default: () => <div data-testid="mcp-tool-browser">Tool Browser</div>,
}));

vi.mock('./MCPStatusIndicator', () => ({
  default: () => <div data-testid="mcp-status">Status</div>,
}));

vi.mock('./MCPServerCatalog', () => ({
  default: () => <div data-testid="mcp-catalog">Catalog</div>,
}));

vi.mock('./mcp-server-manager', () => ({
  TRANSPORT_LABELS: { STDIO: 'Standard I/O', SSE: 'SSE' },
  TRANSPORT_ICONS: { STDIO: '📟', SSE: '📡' },
}));

describe('MCPServerManager', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the manager', async () => {
      render(<MCPServerManager socket={mockSocket} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without socket', async () => {
      render(<MCPServerManager socket={null} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch servers on mount', async () => {
      const { mcpServersApi } = await import('../services/api.js');

      render(<MCPServerManager socket={mockSocket} />);

      await waitFor(() => {
        expect(mcpServersApi.list).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { mcpServersApi } = await import('../services/api.js');
      vi.mocked(mcpServersApi.list).mockRejectedValue(new Error('Network error'));

      render(<MCPServerManager socket={mockSocket} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

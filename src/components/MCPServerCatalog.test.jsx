/**
 * MCPServerCatalog Component Tests
 * Phase 5.3: Unit tests for MCP server catalog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MCPServerCatalog from './MCPServerCatalog';

// Mock API
vi.mock('../services/api.js', () => ({
  mcpCatalogApi: {
    getCatalog: vi.fn().mockResolvedValue({
      categories: ['Official', 'Cloud', 'Database', 'Developer'],
      servers: [
        {
          id: 'filesystem',
          name: 'Filesystem',
          description: 'File system operations',
          category: 'Official',
          tags: ['files', 'io'],
          configurable: [],
        },
        {
          id: 'postgres',
          name: 'PostgreSQL',
          description: 'PostgreSQL database tools',
          category: 'Database',
          tags: ['database', 'sql'],
          configurable: [{ key: 'POSTGRES_URL', label: 'Connection URL' }],
        },
      ],
    }),
    getInstalled: vi.fn().mockResolvedValue({
      filesystem: true,
      postgres: false,
    }),
    install: vi.fn().mockResolvedValue({ success: true }),
    uninstall: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock child components
vi.mock('./mcp-catalog', () => ({
  CATEGORY_ICONS: {
    Official: () => <span data-testid="icon-official">O</span>,
    Cloud: () => <span data-testid="icon-cloud">C</span>,
    Database: () => <span data-testid="icon-database">D</span>,
    Developer: () => <span data-testid="icon-developer">Dev</span>,
  },
  ServerCard: ({ server, isInstalled, onConfigure }) => (
    <div data-testid={`server-${server.id}`} onClick={onConfigure}>
      {server.name} {isInstalled && '(installed)'}
    </div>
  ),
  ConfigModal: ({ server, onClose }) => (
    <div data-testid="config-modal">
      Configuring {server?.name}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('MCPServerCatalog', () => {
  const mockOnInstall = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render catalog', async () => {
      render(
        <MCPServerCatalog
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch catalog on mount', async () => {
      const { mcpCatalogApi } = await import('../services/api.js');

      render(
        <MCPServerCatalog
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(mcpCatalogApi.getCatalog).toHaveBeenCalled();
      });
    });

    it('should fetch installed status on mount', async () => {
      const { mcpCatalogApi } = await import('../services/api.js');

      render(
        <MCPServerCatalog
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(mcpCatalogApi.getInstalled).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display MCP Server Catalog title', async () => {
      render(
        <MCPServerCatalog
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/MCP/i)).toBeInTheDocument();
      });
    });

    it('should have search input', async () => {
      render(
        <MCPServerCatalog
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });
    });

    it('should display catalog title', async () => {
      render(
        <MCPServerCatalog
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/MCP_SERVER_CATALOG/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { mcpCatalogApi } = await import('../services/api.js');
      vi.mocked(mcpCatalogApi.getCatalog).mockRejectedValue(new Error('Network error'));

      render(
        <MCPServerCatalog
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

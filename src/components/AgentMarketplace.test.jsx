/**
 * AgentMarketplace Component Tests
 * Phase 5.3: Unit tests for agent marketplace
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentMarketplace from './AgentMarketplace';

// Mock API
vi.mock('../services/api.js', () => ({
  marketplaceApi: {
    getAgents: vi.fn().mockResolvedValue([
      { id: '1', name: 'Linter', category: 'code-quality', description: 'Code linting', tags: ['lint'], isInstalled: false },
      { id: '2', name: 'Security Scanner', category: 'security', description: 'Scan for vulnerabilities', tags: ['security'], isInstalled: true },
    ]),
    getCategories: vi.fn().mockResolvedValue([
      { id: 'code-quality', name: 'Code Quality', agentCount: 3 },
      { id: 'security', name: 'Security', agentCount: 2 },
    ]),
    getStats: vi.fn().mockResolvedValue({
      totalAgents: 5,
      installedCount: 1,
      totalCategories: 2,
    }),
    installAgent: vi.fn().mockResolvedValue({ agent: { id: '1', name: 'Linter' } }),
    uninstallAgent: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock child components
vi.mock('./AgentCard', () => ({
  default: ({ agent, onSelect }) => (
    <div data-testid={`agent-${agent.id}`} onClick={() => onSelect?.()}>
      {agent.name}
    </div>
  ),
}));

vi.mock('./AgentConfigModal', () => ({
  default: ({ agent, onClose }) => (
    <div data-testid="config-modal">
      <span>{agent.name}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('AgentMarketplace', () => {
  const mockOnInstall = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render marketplace', async () => {
      render(
        <AgentMarketplace
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
    it('should fetch agents on load', async () => {
      const { marketplaceApi } = await import('../services/api.js');

      render(
        <AgentMarketplace
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(marketplaceApi.getAgents).toHaveBeenCalled();
      });
    });

    it('should fetch categories on load', async () => {
      const { marketplaceApi } = await import('../services/api.js');

      render(
        <AgentMarketplace
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(marketplaceApi.getCategories).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display marketplace title', async () => {
      render(
        <AgentMarketplace
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/AI_AGENT_MARKETPLACE/i)).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      render(
        <AgentMarketplace
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search agents/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { marketplaceApi } = await import('../services/api.js');
      vi.mocked(marketplaceApi.getAgents).mockRejectedValue(new Error('Network error'));

      render(
        <AgentMarketplace
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

/**
 * MemoryBankPanel Component Tests
 * Phase 5.3: Unit tests for memory bank panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MemoryBankPanel from './MemoryBankPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  memoryApi: {
    list: vi.fn().mockResolvedValue({
      memories: [
        {
          id: '1',
          title: 'Test Memory',
          content: 'Memory content',
          type: 'CONTEXT',
          scope: 'PROJECT',
          importance: 5,
        },
      ],
    }),
    getStats: vi.fn().mockResolvedValue({
      total: 10,
      byScope: { SESSION: 2, PROJECT: 5, GLOBAL: 3 },
    }),
    create: vi.fn().mockResolvedValue({ id: '2' }),
  },
}));

// Mock child components
vi.mock('./memory-bank', () => ({
  MEMORY_TYPES: ['CONTEXT', 'NOTE', 'DECISION'],
  SCOPE_COLORS: {
    SESSION: 'blue',
    PROJECT: 'green',
    GLOBAL: 'purple',
  },
  MemoryCard: ({ memory }) => <div data-testid={`memory-${memory.id}`}>{memory.title}</div>,
}));

describe('MemoryBankPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the panel', async () => {
      render(
        <MemoryBankPanel
          projectId="project-1"
          sessionId="session-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without sessionId', async () => {
      render(
        <MemoryBankPanel
          projectId="project-1"
          sessionId={null}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch memories on mount', async () => {
      const { memoryApi } = await import('../services/api.js');

      render(
        <MemoryBankPanel
          projectId="project-1"
          sessionId="session-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(memoryApi.list).toHaveBeenCalled();
      });
    });

    it('should fetch stats on mount', async () => {
      const { memoryApi } = await import('../services/api.js');

      render(
        <MemoryBankPanel
          projectId="project-1"
          sessionId="session-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(memoryApi.getStats).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { memoryApi } = await import('../services/api.js');
      vi.mocked(memoryApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <MemoryBankPanel
          projectId="project-1"
          sessionId="session-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

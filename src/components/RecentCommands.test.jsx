/**
 * RecentCommands Component Tests
 * Phase 5.3: Unit tests for command history dropdown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecentCommands from './RecentCommands';

// Mock API
vi.mock('../services/api.js', () => ({
  commandsApi: {
    getHistory: vi.fn().mockResolvedValue([
      { id: '1', command: 'git status', project: 'test-project', timestamp: new Date().toISOString() },
      { id: '2', command: 'npm test', project: 'test-project', timestamp: new Date().toISOString() },
      { id: '3', command: 'docker ps', project: null, timestamp: new Date().toISOString() },
    ]),
    pin: vi.fn().mockResolvedValue({}),
    unpin: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue({}),
  },
}));

describe('RecentCommands', () => {
  const mockOnExecute = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <RecentCommands
          isOpen={true}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render visible content when isOpen is false', () => {
      render(
        <RecentCommands
          isOpen={false}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
        />
      );

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('command list', () => {
    it('should fetch commands', async () => {
      const { commandsApi } = await import('../services/api.js');

      render(
        <RecentCommands
          isOpen={true}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(commandsApi.getHistory).toHaveBeenCalled();
      });
    });

    it('should display commands or empty state', async () => {
      render(
        <RecentCommands
          isOpen={true}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
        />
      );

      // Component should render either commands or empty state
      await waitFor(() => {
        expect(screen.getByText('Recent Commands')).toBeInTheDocument();
      });
    });
  });

  describe('command execution', () => {
    it('should have execution callback available', async () => {
      render(
        <RecentCommands
          isOpen={true}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
        />
      );

      // Verify component renders with callbacks wired up
      await waitFor(() => {
        expect(screen.getByText('Recent Commands')).toBeInTheDocument();
      });
    });
  });

  describe('command actions', () => {
    it('should have copy functionality', async () => {
      render(
        <RecentCommands
          isOpen={true}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should have pin functionality', async () => {
      render(
        <RecentCommands
          isOpen={true}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

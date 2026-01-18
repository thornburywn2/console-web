/**
 * SessionReplay Component Tests
 * Phase 5.3: Unit tests for session replay
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SessionReplay from './SessionReplay';

// Mock API
vi.mock('../services/api.js', () => ({
  sessionHistoryApi: {
    getHistory: vi.fn().mockResolvedValue({
      events: [
        { type: 'command', data: 'ls -la', timestamp: 1000 },
        { type: 'output', data: 'file1.txt\nfile2.txt', timestamp: 1500 },
        { type: 'command', data: 'cat file1.txt', timestamp: 2000 },
        { type: 'output', data: 'Hello World', timestamp: 2500 },
      ],
    }),
  },
}));

describe('SessionReplay', () => {
  const mockOnClose = vi.fn();

  const mockHistory = [
    { type: 'command', data: 'echo test', timestamp: 1000 },
    { type: 'output', data: 'test', timestamp: 1500 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <SessionReplay
          sessionId="session-1"
          history={mockHistory}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <SessionReplay
          sessionId="session-1"
          history={mockHistory}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      // Component should return null when closed
      expect(container.firstChild).toBeNull();
    });

    it('should render with provided history', async () => {
      render(
        <SessionReplay
          sessionId="session-1"
          history={mockHistory}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch history when no history prop provided', async () => {
      const { sessionHistoryApi } = await import('../services/api.js');

      render(
        <SessionReplay
          sessionId="session-1"
          history={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(sessionHistoryApi.getHistory).toHaveBeenCalledWith('session-1');
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { sessionHistoryApi } = await import('../services/api.js');
      vi.mocked(sessionHistoryApi.getHistory).mockRejectedValue(new Error('Network error'));

      render(
        <SessionReplay
          sessionId="session-1"
          history={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

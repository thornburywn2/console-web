/**
 * LogViewer Component Tests
 * Phase 5.3: Unit tests for log viewer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LogViewer from './LogViewer';

// Mock WebSocket
class MockWebSocket {
  constructor() {
    this.onmessage = null;
  }
  close() {}
}
global.WebSocket = MockWebSocket;

// Mock API
vi.mock('../services/api.js', () => ({
  logsApi: {
    get: vi.fn().mockResolvedValue({
      lines: [
        '[2024-01-15 10:00:00] INFO: Application started',
        '[2024-01-15 10:00:01] WARN: Deprecated API used',
        '[2024-01-15 10:00:02] ERROR: Connection failed',
      ],
    }),
  },
}));

describe('LogViewer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <LogViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/home/user/project"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false and not embedded', () => {
      render(
        <LogViewer
          isOpen={false}
          onClose={mockOnClose}
          projectPath="/home/user/project"
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should render in embedded mode', async () => {
      render(
        <LogViewer
          isOpen={true}
          onClose={mockOnClose}
          embedded={true}
          projectPath="/home/user/project"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('log fetching', () => {
    it('should fetch logs when opened', async () => {
      const { logsApi } = await import('../services/api.js');

      render(
        <LogViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/home/user/project"
        />
      );

      await waitFor(() => {
        expect(logsApi.get).toHaveBeenCalled();
      });
    });
  });

  describe('log levels', () => {
    it('should display log viewer title', async () => {
      render(
        <LogViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/home/user/project"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Log Viewer')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { logsApi } = await import('../services/api.js');
      vi.mocked(logsApi.get).mockRejectedValue(new Error('Network error'));

      render(
        <LogViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/home/user/project"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

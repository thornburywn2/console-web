/**
 * HistoryTab Component Tests
 * Phase 5.3: Unit tests for the history tab
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryTab } from './HistoryTab';

// Mock the api module
vi.mock('../../../services/api.js', () => ({
  adminApi: {
    getHistory: vi.fn(),
  },
}));

import { adminApi } from '../../../services/api.js';

// Mock history data
const mockHistoryData = {
  total: 3,
  entries: [
    {
      display: 'git status',
      timestamp: '2026-01-17T12:00:00Z',
      project: '/home/user/Projects/console-web',
      sessionId: 'abc12345-6789-0def-ghij-klmnopqrstuv',
    },
    {
      display: 'npm run build && npm run test',
      timestamp: '2026-01-17T11:30:00Z',
      project: '/home/user/Projects/api-server',
      sessionId: 'def12345-6789-0abc-ghij-klmnopqrstuv',
    },
    {
      display: 'A very long command that should be truncated because it exceeds 150 characters in length and we want to make sure the UI handles this gracefully without breaking the layout',
      timestamp: '2026-01-17T11:00:00Z',
      project: '/home/user/Projects/long-project-name',
      sessionId: 'ghi12345-6789-0abc-defj-klmnopqrstuv',
    },
  ],
};

describe('HistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getHistory.mockResolvedValue(mockHistoryData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render history header with total count', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText(/SESSION_HISTORY \[3\]/)).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText('[REFRESH]')).toBeInTheDocument();
      });
    });

    it('should display history entries', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText(/git status/)).toBeInTheDocument();
        expect(screen.getByText(/npm run build && npm run test/)).toBeInTheDocument();
      });
    });

    it('should display project names from path', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText('console-web')).toBeInTheDocument();
        expect(screen.getByText('api-server')).toBeInTheDocument();
      });
    });

    it('should display truncated session IDs', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText('#abc12345')).toBeInTheDocument();
        expect(screen.getByText('#def12345')).toBeInTheDocument();
      });
    });

    it('should truncate long commands', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        // The command should be truncated at 150 chars with ...
        const longEntry = screen.getByText(/A very long command/);
        expect(longEntry).toBeInTheDocument();
        expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state initially', () => {
      // Mock a slow response
      adminApi.getHistory.mockImplementation(() => new Promise(() => {}));

      render(<HistoryTab />);

      expect(screen.getByText('[LOADING...]')).toBeInTheDocument();
    });

    it('should disable refresh button while loading', () => {
      adminApi.getHistory.mockImplementation(() => new Promise(() => {}));

      render(<HistoryTab />);

      const refreshButton = screen.getByText('[LOADING...]');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adminApi.getHistory.mockRejectedValue(new Error('Network error'));

      render(<HistoryTab />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching history:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should still render header after error', async () => {
      adminApi.getHistory.mockRejectedValue(new Error('Network error'));

      render(<HistoryTab />);

      await waitFor(() => {
        // Should show 0 total on error (initial state)
        expect(screen.getByText(/SESSION_HISTORY \[0\]/)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should show empty state when no history', async () => {
      adminApi.getHistory.mockResolvedValue({ total: 0, entries: [] });

      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText('No session history found')).toBeInTheDocument();
      });
    });
  });

  describe('refresh functionality', () => {
    it('should call getHistory on mount', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(adminApi.getHistory).toHaveBeenCalledWith(50);
      });
    });

    it('should call getHistory when refresh clicked', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText('[REFRESH]')).toBeInTheDocument();
      });

      adminApi.getHistory.mockClear();
      fireEvent.click(screen.getByText('[REFRESH]'));

      await waitFor(() => {
        expect(adminApi.getHistory).toHaveBeenCalledWith(50);
      });
    });

    it('should update entries after refresh', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText(/git status/)).toBeInTheDocument();
      });

      // Mock new data for refresh
      const newData = {
        total: 1,
        entries: [
          {
            display: 'new command',
            timestamp: '2026-01-17T13:00:00Z',
            project: '/home/user/Projects/new-project',
            sessionId: 'new12345-6789-0abc-defj-klmnopqrstuv',
          },
        ],
      };
      adminApi.getHistory.mockResolvedValue(newData);

      fireEvent.click(screen.getByText('[REFRESH]'));

      await waitFor(() => {
        expect(screen.getByText(/new command/)).toBeInTheDocument();
        expect(screen.getByText(/SESSION_HISTORY \[1\]/)).toBeInTheDocument();
      });
    });
  });

  describe('timestamp formatting', () => {
    it('should format timestamps', async () => {
      render(<HistoryTab />);

      await waitFor(() => {
        // formatTime returns toLocaleString(), so we check for common date patterns
        // The exact format depends on locale, but it should contain some date/time
        const entries = screen.getAllByText(/\//); // Dates usually contain /
        expect(entries.length).toBeGreaterThan(0);
      });
    });
  });

  describe('handles entries without optional fields', () => {
    it('should handle entries without project', async () => {
      const dataWithoutProject = {
        total: 1,
        entries: [
          {
            display: 'ls -la',
            timestamp: '2026-01-17T12:00:00Z',
            sessionId: 'abc12345',
          },
        ],
      };
      adminApi.getHistory.mockResolvedValue(dataWithoutProject);

      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText(/ls -la/)).toBeInTheDocument();
        // Should not crash without project
      });
    });

    it('should handle entries without sessionId', async () => {
      const dataWithoutSession = {
        total: 1,
        entries: [
          {
            display: 'pwd',
            timestamp: '2026-01-17T12:00:00Z',
            project: '/home/user/Projects/test',
          },
        ],
      };
      adminApi.getHistory.mockResolvedValue(dataWithoutSession);

      render(<HistoryTab />);

      await waitFor(() => {
        expect(screen.getByText(/pwd/)).toBeInTheDocument();
        // Should not crash without sessionId
      });
    });
  });

  describe('handles malformed data', () => {
    it('should handle null entries array', async () => {
      adminApi.getHistory.mockResolvedValue({ total: 0, entries: null });

      render(<HistoryTab />);

      await waitFor(() => {
        // Should show empty state, not crash
        expect(screen.getByText('No session history found')).toBeInTheDocument();
      });
    });

    it('should handle undefined entries', async () => {
      adminApi.getHistory.mockResolvedValue({ total: 0 });

      render(<HistoryTab />);

      await waitFor(() => {
        // Should show empty state, not crash
        expect(screen.getByText('No session history found')).toBeInTheDocument();
      });
    });
  });
});

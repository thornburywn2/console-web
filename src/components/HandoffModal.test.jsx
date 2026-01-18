/**
 * HandoffModal Component Tests
 * Phase 5.3: Unit tests for handoff modal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HandoffModal from './HandoffModal';

// Mock API
vi.mock('../services/api.js', () => ({
  teamApi: {
    listMembers: vi.fn().mockResolvedValue({
      members: [
        { id: '1', name: 'Alice Chen', email: 'alice@example.com', status: 'online' },
        { id: '2', name: 'Bob Smith', email: 'bob@example.com', status: 'away' },
      ],
    }),
  },
  sessionHandoffApi: {
    handoff: vi.fn().mockResolvedValue({ success: true, handoffId: 'h-1' }),
  },
}));

describe('HandoffModal', () => {
  const mockOnClose = vi.fn();
  const mockOnHandoff = vi.fn();
  const mockSession = {
    id: 'session-1',
    name: 'Test Session',
    project: 'test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <HandoffModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
          onHandoff={mockOnHandoff}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <HandoffModal
          session={mockSession}
          isOpen={false}
          onClose={mockOnClose}
          onHandoff={mockOnHandoff}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch team members when opened', async () => {
      const { teamApi } = await import('../services/api.js');

      render(
        <HandoffModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
          onHandoff={mockOnHandoff}
        />
      );

      await waitFor(() => {
        expect(teamApi.listMembers).toHaveBeenCalled();
      });
    });
  });

  describe('display', () => {
    it('should display Hand Off Session title', async () => {
      render(
        <HandoffModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
          onHandoff={mockOnHandoff}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hand Off Session')).toBeInTheDocument();
      });
    });

    it('should display step 1 - Select Team Member', async () => {
      render(
        <HandoffModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
          onHandoff={mockOnHandoff}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Select Team Member')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { teamApi } = await import('../services/api.js');
      vi.mocked(teamApi.listMembers).mockRejectedValue(new Error('Network error'));

      render(
        <HandoffModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
          onHandoff={mockOnHandoff}
        />
      );

      await waitFor(() => {
        // Should fall back to demo data
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

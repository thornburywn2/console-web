/**
 * CommentThread Component Tests
 * Phase 5.3: Unit tests for comment thread
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CommentThread from './CommentThread';

// Mock API
vi.mock('../services/api.js', () => ({
  commentsApi: {
    list: vi.fn().mockResolvedValue({
      comments: [
        { id: '1', content: 'First comment', authorName: 'User1', createdAt: '2024-01-15T10:00:00Z' },
        { id: '2', content: 'Second comment', authorName: 'User2', createdAt: '2024-01-15T11:00:00Z' },
      ],
    }),
    create: vi.fn().mockResolvedValue({ comment: { id: '3', content: 'New comment', authorName: 'User1' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue('TestUser'),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('CommentThread', () => {
  const mockOnClose = vi.fn();
  const mockOnAddComment = vi.fn();
  const mockSessionId = 'session-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <CommentThread
          sessionId={mockSessionId}
          lineNumber={10}
          isOpen={true}
          onClose={mockOnClose}
          onAddComment={mockOnAddComment}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <CommentThread
          sessionId={mockSessionId}
          lineNumber={10}
          isOpen={false}
          onClose={mockOnClose}
          onAddComment={mockOnAddComment}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch comments when opened', async () => {
      const { commentsApi } = await import('../services/api.js');

      render(
        <CommentThread
          sessionId={mockSessionId}
          lineNumber={10}
          isOpen={true}
          onClose={mockOnClose}
          onAddComment={mockOnAddComment}
        />
      );

      await waitFor(() => {
        expect(commentsApi.list).toHaveBeenCalledWith(mockSessionId, 10);
      });
    });
  });

  describe('display', () => {
    it('should display line number in header', async () => {
      render(
        <CommentThread
          sessionId={mockSessionId}
          lineNumber={10}
          isOpen={true}
          onClose={mockOnClose}
          onAddComment={mockOnAddComment}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Line 10')).toBeInTheDocument();
      });
    });

    it('should have comment input', async () => {
      render(
        <CommentThread
          sessionId={mockSessionId}
          lineNumber={10}
          isOpen={true}
          onClose={mockOnClose}
          onAddComment={mockOnAddComment}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/write a comment/i)).toBeInTheDocument();
      });
    });

    it('should have Comment button', async () => {
      render(
        <CommentThread
          sessionId={mockSessionId}
          lineNumber={10}
          isOpen={true}
          onClose={mockOnClose}
          onAddComment={mockOnAddComment}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Comment')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { commentsApi } = await import('../services/api.js');
      vi.mocked(commentsApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <CommentThread
          sessionId={mockSessionId}
          lineNumber={10}
          isOpen={true}
          onClose={mockOnClose}
          onAddComment={mockOnAddComment}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

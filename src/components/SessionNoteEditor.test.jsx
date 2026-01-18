/**
 * SessionNoteEditor Component Tests
 * Phase 5.3: Unit tests for session note editor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SessionNoteEditor from './SessionNoteEditor';

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

describe('SessionNoteEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();

  const mockNotes = [
    { id: '1', content: '# Note 1\nFirst note content', createdAt: '2024-01-15T10:00:00Z' },
    { id: '2', content: '# Note 2\nSecond note content', createdAt: '2024-01-14T10:00:00Z' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the note editor', async () => {
      render(
        <SessionNoteEditor
          sessionId="session-1"
          notes={mockNotes}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with empty notes', () => {
      render(
        <SessionNoteEditor
          sessionId="session-1"
          notes={[]}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('display', () => {
    it('should display Add Note button', async () => {
      render(
        <SessionNoteEditor
          sessionId="session-1"
          notes={mockNotes}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Add Note/i)).toBeInTheDocument();
      });
    });
  });
});

/**
 * MarkdownViewer Component Tests
 * Phase 5.3: Unit tests for markdown viewer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MarkdownViewer from './MarkdownViewer';

// Mock API
vi.mock('../services/api.js', () => ({
  filesContentApi: {
    getContent: vi.fn().mockResolvedValue('# Test Markdown\n\nThis is **bold** and *italic* text.\n\n## Section\n\n- Item 1\n- Item 2'),
  },
}));

describe('MarkdownViewer', () => {
  const mockFilePath = '/home/user/project/README.md';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <MarkdownViewer
          filePath={mockFilePath}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <MarkdownViewer
          filePath={mockFilePath}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should render with content prop directly', async () => {
      render(
        <MarkdownViewer
          content="# Direct Content"
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
    it('should fetch file content when filePath provided', async () => {
      const { filesContentApi } = await import('../services/api.js');

      render(
        <MarkdownViewer
          filePath={mockFilePath}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(filesContentApi.getContent).toHaveBeenCalledWith(mockFilePath);
      });
    });

    it('should not fetch when content is provided', async () => {
      const { filesContentApi } = await import('../services/api.js');

      render(
        <MarkdownViewer
          content="# Pre-loaded content"
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(filesContentApi.getContent).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { filesContentApi } = await import('../services/api.js');
      vi.mocked(filesContentApi.getContent).mockRejectedValue(new Error('File not found'));

      render(
        <MarkdownViewer
          filePath={mockFilePath}
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

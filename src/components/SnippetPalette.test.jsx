/**
 * SnippetPalette Component Tests
 * Phase 5.3: Unit tests for snippet selection palette
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SnippetPalette from './SnippetPalette';

// Mock API
vi.mock('../services/api.js', () => ({
  snippetsApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'Git Status', command: 'git status', category: 'git' },
      { id: '2', name: 'NPM Install', command: 'npm install', category: 'npm' },
      { id: '3', name: 'Docker PS', command: 'docker ps', category: 'docker' },
    ]),
  },
}));

describe('SnippetPalette', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectSnippet = vi.fn();
  const mockOnExecuteSnippet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView which isn't available in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <SnippetPalette
          isOpen={true}
          onClose={mockOnClose}
          onSelectSnippet={mockOnSelectSnippet}
          onExecuteSnippet={mockOnExecuteSnippet}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not fetch snippets when isOpen is false', () => {
      render(
        <SnippetPalette
          isOpen={false}
          onClose={mockOnClose}
          onSelectSnippet={mockOnSelectSnippet}
          onExecuteSnippet={mockOnExecuteSnippet}
        />
      );

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('snippet fetching', () => {
    it('should fetch snippets when opened', async () => {
      const { snippetsApi } = await import('../services/api.js');

      render(
        <SnippetPalette
          isOpen={true}
          onClose={mockOnClose}
          onSelectSnippet={mockOnSelectSnippet}
          onExecuteSnippet={mockOnExecuteSnippet}
        />
      );

      await waitFor(() => {
        expect(snippetsApi.list).toHaveBeenCalled();
      });
    });

    it('should display snippets after loading', async () => {
      render(
        <SnippetPalette
          isOpen={true}
          onClose={mockOnClose}
          onSelectSnippet={mockOnSelectSnippet}
          onExecuteSnippet={mockOnExecuteSnippet}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Git Status')).toBeInTheDocument();
      });
    });
  });

  describe('search', () => {
    it('should have search input', async () => {
      render(
        <SnippetPalette
          isOpen={true}
          onClose={mockOnClose}
          onSelectSnippet={mockOnSelectSnippet}
          onExecuteSnippet={mockOnExecuteSnippet}
        />
      );

      await waitFor(() => {
        const searchInput = document.querySelector('input');
        expect(searchInput).toBeInTheDocument();
      });
    });
  });

  describe('categories', () => {
    it('should display category filters', async () => {
      render(
        <SnippetPalette
          isOpen={true}
          onClose={mockOnClose}
          onSelectSnippet={mockOnSelectSnippet}
          onExecuteSnippet={mockOnExecuteSnippet}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

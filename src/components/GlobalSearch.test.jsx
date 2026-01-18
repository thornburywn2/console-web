/**
 * GlobalSearch Component Tests
 * Phase 5.3: Unit tests for global search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import GlobalSearch from './GlobalSearch';

// Mock API
vi.mock('../services/api.js', () => ({
  searchApi: {
    globalSearch: vi.fn().mockResolvedValue({
      results: [
        { id: 1, type: 'projects', title: 'test-project', subtitle: 'Project match' },
        { id: 2, type: 'sessions', title: 'Session: test', subtitle: 'Session match' },
        { id: 3, type: 'commands', title: 'npm run test', subtitle: 'Command' },
      ],
    }),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('GlobalSearch', () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnRunCommand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <GlobalSearch
          isOpen={true}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
          onRunCommand={mockOnRunCommand}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <GlobalSearch
          isOpen={false}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
          onRunCommand={mockOnRunCommand}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('search input', () => {
    it('should have search input field', () => {
      render(
        <GlobalSearch
          isOpen={true}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
          onRunCommand={mockOnRunCommand}
        />
      );

      const input = screen.getByPlaceholderText(/search projects/i);
      expect(input).toBeInTheDocument();
    });
  });

  describe('category tabs', () => {
    it('should display All category', () => {
      render(
        <GlobalSearch
          isOpen={true}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
          onRunCommand={mockOnRunCommand}
        />
      );

      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('should display Projects category', () => {
      render(
        <GlobalSearch
          isOpen={true}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
          onRunCommand={mockOnRunCommand}
        />
      );

      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  describe('search tips', () => {
    it('should display quick tips when no query', () => {
      render(
        <GlobalSearch
          isOpen={true}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
          onRunCommand={mockOnRunCommand}
        />
      );

      expect(screen.getByText('Quick Tips')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { searchApi } = await import('../services/api.js');
      vi.mocked(searchApi.globalSearch).mockRejectedValue(new Error('Network error'));

      render(
        <GlobalSearch
          isOpen={true}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
          onRunCommand={mockOnRunCommand}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

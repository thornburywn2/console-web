/**
 * ChangelogWidget Component Tests
 * Phase 5.3: Unit tests for changelog/what's new widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChangelogWidget from './ChangelogWidget';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock the changelog-widget module
vi.mock('./changelog-widget', () => ({
  CHANGELOG_ENTRIES: [
    {
      version: '1.0.18',
      date: '2026-01-17',
      title: 'Nonce-Based CSP',
      changes: [
        { type: 'feat', text: 'Implement nonce-based CSP headers' },
        { type: 'fix', text: 'Fix security headers configuration' },
      ],
    },
    {
      version: '1.0.17',
      date: '2026-01-16',
      title: 'API Centralization',
      changes: [
        { type: 'refactor', text: 'Migrate fetch() to centralized API' },
        { type: 'feat', text: 'Add Zod validation' },
      ],
    },
    {
      version: '1.0.16',
      date: '2026-01-15',
      title: 'Observability',
      changes: [
        { type: 'feat', text: 'Add Prometheus metrics' },
      ],
    },
  ],
  ChangelogEntry: ({ entry, isExpanded, onToggle }) => (
    <div data-testid={`entry-${entry.version}`} onClick={onToggle}>
      <span>{entry.version}</span>
      <span>{entry.title}</span>
      {isExpanded && (
        <ul>
          {entry.changes.map((c, i) => (
            <li key={i}>{c.text}</li>
          ))}
        </ul>
      )}
    </div>
  ),
  ChangelogBadge: () => <span data-testid="changelog-badge">Badge</span>,
  ChangelogCompact: () => <div data-testid="changelog-compact">Compact</div>,
}));

describe('ChangelogWidget', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('1.0.18');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when closed', () => {
    it('should not render when isOpen is false', () => {
      render(<ChangelogWidget isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText("What's New")).not.toBeInTheDocument();
    });
  });

  describe('when open', () => {
    it('should render modal header', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("What's New")).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      const closeButton = document.querySelector('button svg path[d*="M6 18L18 6"]');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render all changelog entries', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('entry-1.0.18')).toBeInTheDocument();
      expect(screen.getByTestId('entry-1.0.17')).toBeInTheDocument();
      expect(screen.getByTestId('entry-1.0.16')).toBeInTheDocument();
    });

    it('should render version numbers', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('1.0.18')).toBeInTheDocument();
      expect(screen.getByText('1.0.17')).toBeInTheDocument();
      expect(screen.getByText('1.0.16')).toBeInTheDocument();
    });

    it('should render entry titles', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Nonce-Based CSP')).toBeInTheDocument();
      expect(screen.getByText('API Centralization')).toBeInTheDocument();
      expect(screen.getByText('Observability')).toBeInTheDocument();
    });

    it('should render Full Changelog link', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Full Changelog')).toBeInTheDocument();
    });

    it('should render version in footer', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Console.web v1.0.18')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button clicked', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      const closeButton = document.querySelector('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop clicked', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      const backdrop = document.querySelector('.bg-black\\/60');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should expand entry when clicked', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      // First entry is expanded by default
      expect(screen.getByText('Implement nonce-based CSP headers')).toBeInTheDocument();

      // Click on second entry to expand it
      fireEvent.click(screen.getByTestId('entry-1.0.17'));

      expect(screen.getByText('Migrate fetch() to centralized API')).toBeInTheDocument();
    });

    it('should collapse entry when clicked again', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      // First entry is expanded by default, click to collapse
      fireEvent.click(screen.getByTestId('entry-1.0.18'));

      // Changes should no longer be visible
      expect(screen.queryByText('Implement nonce-based CSP headers')).not.toBeInTheDocument();
    });
  });

  describe('localStorage integration', () => {
    it('should check localStorage for last seen version', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('changelog-last-seen');
    });

    it('should mark version as seen when opened with new content', () => {
      mockLocalStorage.getItem.mockReturnValue('1.0.16');

      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      // Should set the latest version as seen
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('changelog-last-seen', '1.0.18');
    });

    it('should not update localStorage when already seen latest', () => {
      mockLocalStorage.getItem.mockReturnValue('1.0.18');

      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      // Should not call setItem since version is already seen
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('default expansion', () => {
    it('should expand first entry by default', () => {
      render(<ChangelogWidget isOpen={true} onClose={mockOnClose} />);

      // First entry's changes should be visible
      expect(screen.getByText('Implement nonce-based CSP headers')).toBeInTheDocument();
      expect(screen.getByText('Fix security headers configuration')).toBeInTheDocument();
    });
  });
});

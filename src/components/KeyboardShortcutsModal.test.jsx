/**
 * KeyboardShortcutsModal Component Tests
 * Phase 5.3: Unit tests for keyboard shortcuts help modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

// Mock the useKeyboardShortcuts module
vi.mock('../hooks/useKeyboardShortcuts', () => ({
  getShortcutsByCategory: vi.fn(() => ({
    Navigation: [
      { keys: 'Ctrl+K', description: 'Open command palette' },
      { keys: 'Ctrl+/', description: 'Show keyboard shortcuts' },
    ],
    Terminal: [
      { keys: 'Ctrl+`', description: 'Toggle terminal' },
      { keys: 'Ctrl+Shift+T', description: 'New terminal' },
    ],
    Editor: [
      { keys: 'Ctrl+S', description: 'Save file' },
      { keys: 'Ctrl+Z', description: 'Undo' },
    ],
  })),
}));

describe('KeyboardShortcutsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when closed', () => {
    it('should not render when isOpen is false', () => {
      render(<KeyboardShortcutsModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('KEYBOARD SHORTCUTS')).not.toBeInTheDocument();
    });
  });

  describe('when open', () => {
    it('should render modal header', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('KEYBOARD SHORTCUTS')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should render all shortcut categories', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('NAVIGATION')).toBeInTheDocument();
      expect(screen.getByText('TERMINAL')).toBeInTheDocument();
      expect(screen.getByText('EDITOR')).toBeInTheDocument();
    });

    it('should render shortcuts with keys', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
      // Ctrl+/ appears twice - in shortcuts list and in footer
      const ctrlSlashElements = screen.getAllByText('Ctrl+/');
      expect(ctrlSlashElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Ctrl+`')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    });

    it('should render shortcut descriptions', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Open command palette')).toBeInTheDocument();
      expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Toggle terminal')).toBeInTheDocument();
      expect(screen.getByText('Save file')).toBeInTheDocument();
    });

    it('should render footer with help text', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/anytime to show this help/)).toBeInTheDocument();
      expect(screen.getByText(/to close/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button clicked', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop clicked', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      // Click on the outer container (backdrop area)
      const backdrop = screen.getByText('KEYBOARD SHORTCUTS').closest('.fixed');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content clicked', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      // Click on the modal content itself
      fireEvent.click(screen.getByText('KEYBOARD SHORTCUTS'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on close button', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('should use kbd elements for shortcut keys', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={mockOnClose} />);

      const kbdElements = document.querySelectorAll('kbd');
      // At least the shortcuts plus the footer kbd elements
      expect(kbdElements.length).toBeGreaterThan(5);
    });
  });
});

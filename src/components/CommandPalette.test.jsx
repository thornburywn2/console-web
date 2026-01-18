/**
 * CommandPalette Component Tests
 * Phase 5.3: Unit tests for command palette
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommandPalette from './CommandPalette';

// Mock Fuse.js
vi.mock('fuse.js', () => ({
  default: class MockFuse {
    constructor(list) {
      this.list = list;
    }
    search(query) {
      return this.list
        .filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        )
        .map(item => ({ item, score: 0.1 }));
    }
  }
}));

// Mock useKeyboardShortcuts hook
vi.mock('../hooks/useKeyboardShortcuts', () => ({
  getShortcutsByCategory: vi.fn(() => ({})),
  ACTION_DESCRIPTIONS: {},
}));

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

describe('CommandPalette', () => {
  const mockOnClose = vi.fn();
  const mockOnCommand = vi.fn();

  const mockProjects = [
    { name: 'project-1', path: '/home/user/projects/project-1' },
    { name: 'project-2', path: '/home/user/projects/project-2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('visibility', () => {
    it('should return null when not open', () => {
      const { container } = render(
        <CommandPalette
          isOpen={false}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when open', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
    });
  });

  describe('search input', () => {
    it('should focus input on open', async () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Advance timers for the setTimeout
      vi.advanceTimersByTime(50);

      const input = screen.getByPlaceholderText('Type a command...');
      expect(document.activeElement).toBe(input);
    });

    it('should clear query when reopened', () => {
      const { rerender } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      const input = screen.getByPlaceholderText('Type a command...');
      fireEvent.change(input, { target: { value: 'test query' } });

      // Close and reopen
      rerender(
        <CommandPalette
          isOpen={false}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      rerender(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByPlaceholderText('Type a command...')).toHaveValue('');
    });
  });

  describe('command display', () => {
    it('should display default commands', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('Toggle Left Sidebar')).toBeInTheDocument();
      expect(screen.getByText('New Session')).toBeInTheDocument();
      expect(screen.getByText('Change Theme')).toBeInTheDocument();
    });

    it('should display command categories', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Multiple commands may have the same category, so use getAllByText
      expect(screen.getAllByText('Navigation').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Sessions').length).toBeGreaterThan(0);
    });

    it('should display project commands', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
          projects={mockProjects}
        />
      );

      expect(screen.getByText('Switch to project-1')).toBeInTheDocument();
      expect(screen.getByText('Switch to project-2')).toBeInTheDocument();
    });

    it('should limit project commands to 9', () => {
      const manyProjects = Array.from({ length: 15 }, (_, i) => ({
        name: `project-${i}`,
        path: `/path/project-${i}`,
      }));

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
          projects={manyProjects}
        />
      );

      expect(screen.getByText('Switch to project-0')).toBeInTheDocument();
      expect(screen.getByText('Switch to project-8')).toBeInTheDocument();
      expect(screen.queryByText('Switch to project-9')).not.toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter commands based on search query', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      const input = screen.getByPlaceholderText('Type a command...');
      fireEvent.change(input, { target: { value: 'sidebar' } });

      expect(screen.getByText('Toggle Left Sidebar')).toBeInTheDocument();
      expect(screen.getByText('Toggle Right Sidebar')).toBeInTheDocument();
      expect(screen.queryByText('New Session')).not.toBeInTheDocument();
    });

    it('should show "No commands found" when no matches', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      const input = screen.getByPlaceholderText('Type a command...');
      fireEvent.change(input, { target: { value: 'xyznonexistent' } });

      expect(screen.getByText('No commands found')).toBeInTheDocument();
    });

    it('should display command count in footer', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Should show count of all commands
      expect(screen.getByText(/\d+ commands/)).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('should close on Escape key', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should select command on Enter key', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockOnCommand).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate down on ArrowDown', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // First command is initially selected
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveStyle('border-left: 2px solid var(--accent-primary)');

      // Press down arrow
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Second command should now be selected (button at index 1)
      expect(buttons[1]).toHaveStyle('border-left: 2px solid var(--accent-primary)');
    });

    it('should navigate up on ArrowUp', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Navigate down first
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Then navigate up
      fireEvent.keyDown(document, { key: 'ArrowUp' });

      const buttons = screen.getAllByRole('button');
      expect(buttons[1]).toHaveStyle('border-left: 2px solid var(--accent-primary)');
    });

    it('should not go below 0 on ArrowUp', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Try to navigate up from first item
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      fireEvent.keyDown(document, { key: 'ArrowUp' });

      // First command should still be selected
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveStyle('border-left: 2px solid var(--accent-primary)');
    });
  });

  describe('command selection', () => {
    it('should call onCommand with command id on click', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      fireEvent.click(screen.getByText('Toggle Left Sidebar'));

      expect(mockOnCommand).toHaveBeenCalledWith('toggleSidebar', undefined);
    });

    it('should call onCommand with project data for project commands', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
          projects={mockProjects}
        />
      );

      fireEvent.click(screen.getByText('Switch to project-1'));

      expect(mockOnCommand).toHaveBeenCalledWith(
        'selectProject:/home/user/projects/project-1',
        mockProjects[0]
      );
    });

    it('should close palette after command selection', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      fireEvent.click(screen.getByText('Toggle Left Sidebar'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('backdrop interaction', () => {
    it('should close on backdrop click', () => {
      const { container } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Click on the outer container (backdrop)
      const backdrop = container.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking inside the palette', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Click on the input
      fireEvent.click(screen.getByPlaceholderText('Type a command...'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('recent commands', () => {
    it('should prioritize recent commands', () => {
      const recentCommands = [{ id: 'openThemes' }];

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
          recentCommands={recentCommands}
        />
      );

      // When no query, recent commands should appear first
      const buttons = screen.getAllByRole('button');
      // The "Change Theme" command should be first
      expect(buttons[0]).toHaveTextContent('Change Theme');
    });
  });

  describe('UI elements', () => {
    it('should display ESC key hint', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    it('should display navigation hints in footer', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('navigate')).toBeInTheDocument();
      expect(screen.getByText('select')).toBeInTheDocument();
    });

    it('should display command prompt symbol', () => {
      const { container } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          onCommand={mockOnCommand}
        />
      );

      // Look for the prompt symbol specifically (large text-lg span)
      const promptSymbol = container.querySelector('.text-lg');
      expect(promptSymbol).toBeInTheDocument();
      expect(promptSymbol).toHaveTextContent('>');
    });
  });
});

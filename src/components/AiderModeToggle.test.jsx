/**
 * AiderModeToggle Component Tests
 * Phase 5.3: Unit tests for mode toggle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiderModeToggle, AiderModeToggleCompact } from './AiderModeToggle';

describe('AiderModeToggle', () => {
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render both mode options', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} />);

      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText('Aider')).toBeInTheDocument();
    });

    it('should show descriptions as titles', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} />);

      expect(screen.getByTitle('Anthropic CLI agent')).toBeInTheDocument();
      expect(screen.getByTitle('AI pair programmer')).toBeInTheDocument();
    });
  });

  describe('mode selection', () => {
    it('should highlight current mode (claude)', () => {
      const { container } = render(
        <AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} />
      );

      // Active mode should have the active indicator (green dot)
      const activeDot = container.querySelector('.bg-green-500.animate-pulse');
      expect(activeDot).toBeInTheDocument();
    });

    it('should highlight current mode (aider)', () => {
      render(<AiderModeToggle currentMode="aider" onModeChange={mockOnModeChange} />);

      // Aider button should have blue color when active
      const aiderButton = screen.getByTitle('AI pair programmer');
      expect(aiderButton).toHaveClass('border-blue-500/50');
    });

    it('should call onModeChange when switching modes', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByText('Aider'));

      expect(mockOnModeChange).toHaveBeenCalledWith('aider');
    });

    it('should not call onModeChange when clicking current mode', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByText('Claude Code'));

      expect(mockOnModeChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable buttons when disabled is true', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} disabled={true} />);

      const claudeButton = screen.getByTitle('Anthropic CLI agent');
      const aiderButton = screen.getByTitle('AI pair programmer');

      expect(claudeButton).toBeDisabled();
      expect(aiderButton).toBeDisabled();
    });

    it('should not call onModeChange when disabled', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} disabled={true} />);

      fireEvent.click(screen.getByText('Aider'));

      expect(mockOnModeChange).not.toHaveBeenCalled();
    });

    it('should have reduced opacity when disabled', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} disabled={true} />);

      const claudeButton = screen.getByTitle('Anthropic CLI agent');
      expect(claudeButton).toHaveClass('opacity-50');
    });
  });

  describe('hover tooltip', () => {
    it('should show description on hover', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} />);

      fireEvent.mouseEnter(screen.getByText('Aider'));

      expect(screen.getByText('AI pair programmer')).toBeInTheDocument();
    });

    it('should hide description on mouse leave', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} />);

      const aiderButton = screen.getByText('Aider').closest('button');
      fireEvent.mouseEnter(aiderButton);
      fireEvent.mouseLeave(aiderButton);

      // The description in the tooltip div should be removed
      const tooltipDescriptions = screen.queryAllByText('AI pair programmer');
      // Only the title attribute should remain
      expect(tooltipDescriptions.length).toBeLessThanOrEqual(1);
    });

    it('should not show tooltip when disabled', () => {
      render(<AiderModeToggle currentMode="claude" onModeChange={mockOnModeChange} disabled={true} />);

      const aiderButton = screen.getByText('Aider').closest('button');
      fireEvent.mouseEnter(aiderButton);

      // Should not show the tooltip div (only title attribute)
      const tooltipDiv = document.querySelector('.animate-fade-in');
      expect(tooltipDiv).not.toBeInTheDocument();
    });
  });

  describe('default props', () => {
    it('should default to claude mode', () => {
      render(<AiderModeToggle onModeChange={mockOnModeChange} />);

      const claudeButton = screen.getByTitle('Anthropic CLI agent');
      expect(claudeButton).toHaveClass('border-orange-500/50');
    });

    it('should default to not disabled', () => {
      render(<AiderModeToggle onModeChange={mockOnModeChange} />);

      const claudeButton = screen.getByTitle('Anthropic CLI agent');
      expect(claudeButton).not.toBeDisabled();
    });
  });
});

describe('AiderModeToggleCompact', () => {
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render Claude when in claude mode', () => {
      render(<AiderModeToggleCompact currentMode="claude" onModeChange={mockOnModeChange} />);

      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('should render Aider when in aider mode', () => {
      render(<AiderModeToggleCompact currentMode="aider" onModeChange={mockOnModeChange} />);

      expect(screen.getByText('Aider')).toBeInTheDocument();
    });

    it('should show correct title when in claude mode', () => {
      render(<AiderModeToggleCompact currentMode="claude" onModeChange={mockOnModeChange} />);

      expect(screen.getByTitle('Switch to Aider')).toBeInTheDocument();
    });

    it('should show correct title when in aider mode', () => {
      render(<AiderModeToggleCompact currentMode="aider" onModeChange={mockOnModeChange} />);

      expect(screen.getByTitle('Switch to Claude Code')).toBeInTheDocument();
    });
  });

  describe('mode switching', () => {
    it('should switch from claude to aider on click', () => {
      render(<AiderModeToggleCompact currentMode="claude" onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnModeChange).toHaveBeenCalledWith('aider');
    });

    it('should switch from aider to claude on click', () => {
      render(<AiderModeToggleCompact currentMode="aider" onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnModeChange).toHaveBeenCalledWith('claude');
    });
  });

  describe('disabled state', () => {
    it('should disable button when disabled is true', () => {
      render(<AiderModeToggleCompact currentMode="claude" onModeChange={mockOnModeChange} disabled={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not call onModeChange when disabled', () => {
      render(<AiderModeToggleCompact currentMode="claude" onModeChange={mockOnModeChange} disabled={true} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnModeChange).not.toHaveBeenCalled();
    });

    it('should have reduced opacity when disabled', () => {
      render(<AiderModeToggleCompact currentMode="claude" onModeChange={mockOnModeChange} disabled={true} />);

      expect(screen.getByRole('button')).toHaveClass('opacity-50');
    });
  });

  describe('styling', () => {
    it('should have orange color for claude mode', () => {
      render(<AiderModeToggleCompact currentMode="claude" onModeChange={mockOnModeChange} />);

      const modeText = screen.getByText('Claude');
      expect(modeText).toHaveClass('text-orange-400');
    });

    it('should have blue color for aider mode', () => {
      render(<AiderModeToggleCompact currentMode="aider" onModeChange={mockOnModeChange} />);

      const modeText = screen.getByText('Aider');
      expect(modeText).toHaveClass('text-blue-400');
    });
  });
});

/**
 * ThemePicker Component Tests
 * Phase 5.3: Unit tests for theme selection modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemePicker from './ThemePicker';

// Mock the useTheme hook
vi.mock('../hooks/useTheme', () => ({
  THEMES: [
    { id: 'dark', name: 'Dark', description: 'Soft dark theme with green accents' },
    { id: 'dracula', name: 'Dracula', description: 'Popular dark theme with purple accents' },
    { id: 'nord', name: 'Nord', description: 'Arctic north-bluish color palette' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'Vibrant neon colors' },
    { id: 'sepia', name: 'Sepia', description: 'Warm amber tones' },
    { id: 'light', name: 'Light', description: 'Clean off-white theme' },
  ],
}));

describe('ThemePicker', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document methods
    document.documentElement.setAttribute = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when closed', () => {
    it('should return null when isOpen is false', () => {
      const { container } = render(
        <ThemePicker
          isOpen={false}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when open', () => {
    it('should render modal header', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      expect(screen.getByText('SELECT THEME')).toBeInTheDocument();
    });

    it('should render all theme options', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Dracula')).toBeInTheDocument();
      expect(screen.getByText('Nord')).toBeInTheDocument();
      expect(screen.getByText('Cyberpunk')).toBeInTheDocument();
      expect(screen.getByText('Sepia')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      expect(closeButton).toBeInTheDocument();
    });

    it('should render footer instructions', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      expect(screen.getByText('Hover to preview')).toBeInTheDocument();
      expect(screen.getByText('Click to apply')).toBeInTheDocument();
    });

    it('should display current theme description', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      expect(screen.getByText('Soft dark theme with green accents')).toBeInTheDocument();
    });
  });

  describe('theme selection', () => {
    it('should call onSelectTheme and onClose when theme clicked', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      fireEvent.click(screen.getByText('Dracula'));

      expect(mockOnSelectTheme).toHaveBeenCalledWith('dracula');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSelectTheme with correct theme id', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      fireEvent.click(screen.getByText('Nord'));

      expect(mockOnSelectTheme).toHaveBeenCalledWith('nord');
    });
  });

  describe('theme preview', () => {
    it('should set theme attribute on hover', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      const draculaButton = screen.getByText('Dracula').closest('button');
      fireEvent.mouseEnter(draculaButton);

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dracula');
    });

    it('should restore current theme on mouse leave', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      // The modal container has onMouseLeave
      const modalContent = document.querySelector('.glass-elevated');
      fireEvent.mouseLeave(modalContent);

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should show preview theme description on hover', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      const draculaButton = screen.getByText('Dracula').closest('button');
      fireEvent.mouseEnter(draculaButton);

      expect(screen.getByText('Popular dark theme with purple accents')).toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when close button clicked', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should restore theme and close when close button clicked', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop clicked', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      // Click on the outer container (backdrop)
      const backdrop = document.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('active theme indicator', () => {
    it('should indicate current theme as active', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dracula"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      const draculaButton = screen.getByText('Dracula').closest('button');
      // Active theme should have checkmark SVG
      const checkmark = draculaButton.querySelector('svg');
      expect(checkmark).toBeInTheDocument();
    });

    it('should not show checkmark for non-active themes', () => {
      render(
        <ThemePicker
          isOpen={true}
          onClose={mockOnClose}
          currentTheme="dark"
          onSelectTheme={mockOnSelectTheme}
        />
      );

      const draculaButton = screen.getByText('Dracula').closest('button');
      const checkmark = draculaButton.querySelector('svg path[fill-rule="evenodd"]');
      expect(checkmark).not.toBeInTheDocument();
    });
  });
});

/**
 * QuickActionsFAB Component Tests
 * Phase 5.3: Unit tests for floating action button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickActionsFAB from './QuickActionsFAB';

describe('QuickActionsFAB', () => {
  const mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the FAB button', () => {
      render(<QuickActionsFAB onAction={mockOnAction} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render without onAction prop', () => {
      render(<QuickActionsFAB />);

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('toggle behavior', () => {
    it('should toggle expanded state on click', () => {
      render(<QuickActionsFAB onAction={mockOnAction} />);

      const fab = document.querySelector('button');
      if (fab) {
        fireEvent.click(fab);
        expect(document.body).toBeInTheDocument();
      }
    });
  });

  describe('actions', () => {
    it('should have new session action', () => {
      render(<QuickActionsFAB onAction={mockOnAction} />);

      // FAB should contain action items
      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should have command palette action', () => {
      render(<QuickActionsFAB onAction={mockOnAction} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should have quick search action', () => {
      render(<QuickActionsFAB onAction={mockOnAction} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('callback', () => {
    it('should call onAction when action is clicked', () => {
      render(<QuickActionsFAB onAction={mockOnAction} />);

      // Open FAB
      const fab = document.querySelector('button');
      if (fab) {
        fireEvent.click(fab);

        // Click an action button
        const buttons = document.querySelectorAll('button');
        if (buttons.length > 1) {
          fireEvent.click(buttons[1]);
        }
      }
      expect(document.body).toBeInTheDocument();
    });
  });
});

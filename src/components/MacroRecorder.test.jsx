/**
 * MacroRecorder Component Tests
 * Phase 5.3: Unit tests for macro recorder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MacroRecorder from './MacroRecorder';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(JSON.stringify([
    {
      id: '1',
      name: 'Test Macro',
      commands: ['ls', 'pwd'],
      createdAt: '2024-01-15T10:00:00Z',
      usageCount: 5,
    },
  ])),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('MacroRecorder', () => {
  const mockOnClose = vi.fn();
  const mockOnInsertMacro = vi.fn();
  const mockSessionId = 'session-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <MacroRecorder
          isOpen={true}
          onClose={mockOnClose}
          onInsertMacro={mockOnInsertMacro}
          sessionId={mockSessionId}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <MacroRecorder
          isOpen={false}
          onClose={mockOnClose}
          onInsertMacro={mockOnInsertMacro}
          sessionId={mockSessionId}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data loading', () => {
    it('should load macros from localStorage', async () => {
      render(
        <MacroRecorder
          isOpen={true}
          onClose={mockOnClose}
          onInsertMacro={mockOnInsertMacro}
          sessionId={mockSessionId}
        />
      );

      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('command-portal-macros');
      });
    });
  });

  describe('display', () => {
    it('should display Macro Recorder title', async () => {
      render(
        <MacroRecorder
          isOpen={true}
          onClose={mockOnClose}
          onInsertMacro={mockOnInsertMacro}
          sessionId={mockSessionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Macro Recorder')).toBeInTheDocument();
      });
    });

    it('should display Record New Macro button', async () => {
      render(
        <MacroRecorder
          isOpen={true}
          onClose={mockOnClose}
          onInsertMacro={mockOnInsertMacro}
          sessionId={mockSessionId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Record New Macro')).toBeInTheDocument();
      });
    });
  });
});

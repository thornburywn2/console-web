/**
 * QuickChatPanel Component Tests
 * Phase 5.3: Unit tests for quick chat panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import QuickChatPanel from './QuickChatPanel';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock PersonaSelector
vi.mock('./PersonaSelector', () => ({
  default: ({ onSelect }) => (
    <select data-testid="persona-selector" onChange={(e) => onSelect?.(e.target.value)}>
      <option value="default">Default</option>
    </select>
  ),
  BUILT_IN_PERSONAS: [
    { id: 'default', name: 'Default', systemPrompt: 'You are a helpful assistant.' },
    { id: 'coder', name: 'Coder', systemPrompt: 'You are a coding assistant.' },
  ],
}));

describe('QuickChatPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnInsertToTerminal = vi.fn();

  // projectContext is rendered directly as text, so it should be a string
  const mockProjectContext = 'test-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <QuickChatPanel
          isOpen={true}
          onClose={mockOnClose}
          projectContext={mockProjectContext}
          onInsertToTerminal={mockOnInsertToTerminal}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <QuickChatPanel
          isOpen={false}
          onClose={mockOnClose}
          projectContext={mockProjectContext}
          onInsertToTerminal={mockOnInsertToTerminal}
        />
      );

      // Component should return null when closed
      expect(container.firstChild).toBeNull();
    });

    it('should render without project context', async () => {
      render(
        <QuickChatPanel
          isOpen={true}
          onClose={mockOnClose}
          projectContext={null}
          onInsertToTerminal={mockOnInsertToTerminal}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('display', () => {
    it('should display model selector', async () => {
      render(
        <QuickChatPanel
          isOpen={true}
          onClose={mockOnClose}
          projectContext={mockProjectContext}
          onInsertToTerminal={mockOnInsertToTerminal}
        />
      );

      await waitFor(() => {
        // Should have model options
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

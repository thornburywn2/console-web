/**
 * ImportWizard Component Tests
 * Phase 5.3: Unit tests for import wizard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ImportWizard from './ImportWizard';

// Mock child components
vi.mock('./import-wizard', () => ({
  IMPORT_SOURCES: [
    { id: 'chatgpt', name: 'ChatGPT', parser: 'chatgpt', icon: '💬' },
    { id: 'claude', name: 'Claude', parser: 'claude', icon: '🤖' },
    { id: 'text', name: 'Plain Text', parser: 'text', icon: '📄' },
  ],
  parseChatGPT: vi.fn().mockReturnValue([
    { id: '1', title: 'Chat 1', messages: [] },
  ]),
  parseClaude: vi.fn().mockReturnValue([
    { id: '2', title: 'Claude Chat', messages: [] },
  ]),
  parseGeneric: vi.fn().mockReturnValue([]),
  parseText: vi.fn().mockReturnValue([
    { id: '3', title: 'Text Import', messages: [] },
  ]),
  parseTerminal: vi.fn().mockReturnValue([]),
  SourceCard: ({ source, isSelected, onSelect }) => (
    <div
      data-testid={`source-${source.id}`}
      onClick={onSelect}
      data-selected={isSelected}
    >
      {source.name}
    </div>
  ),
  ConversationPreview: ({ conversation }) => (
    <div data-testid={`preview-${conversation.id}`}>
      {conversation.title}
    </div>
  ),
}));

describe('ImportWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <ImportWizard
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <ImportWizard
          isOpen={false}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('display', () => {
    it('should display Import title', async () => {
      render(
        <ImportWizard
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Import/i)).toBeInTheDocument();
      });
    });

    it('should display source options', async () => {
      render(
        <ImportWizard
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('source-chatgpt')).toBeInTheDocument();
        expect(screen.getByTestId('source-claude')).toBeInTheDocument();
      });
    });

    it('should display Cancel button', async () => {
      render(
        <ImportWizard
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });
});

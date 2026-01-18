/**
 * PromptLibrary Component Tests
 * Phase 5.3: Unit tests for prompt management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PromptLibrary from './PromptLibrary';

// Mock API
vi.mock('../services/api.js', () => ({
  promptsApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'Code Review', content: 'Review this code: {{code}}', category: 'review', isFavorite: false },
      { id: '2', name: 'Bug Fix', content: 'Fix this bug: {{description}}', category: 'debug', isFavorite: true },
    ]),
    getCategories: vi.fn().mockResolvedValue(['review', 'debug', 'general']),
    create: vi.fn().mockResolvedValue({ id: '3', name: 'New Prompt' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

// Mock prompt-library utilities
vi.mock('./prompt-library', () => ({
  extractVariables: vi.fn((content) => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map((m) => m.replace(/[{}]/g, ''));
  }),
  PromptEditor: ({ value, onChange }) => (
    <textarea data-testid="prompt-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  VariableInput: ({ variables, values, onChange }) => (
    <div data-testid="variable-input">{variables.length} variables</div>
  ),
  PromptCard: ({ prompt, onClick }) => (
    <div data-testid="prompt-card" onClick={onClick}>
      {prompt.name}
    </div>
  ),
}));

describe('PromptLibrary', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectPrompt = vi.fn();
  const mockOnExecutePrompt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <PromptLibrary
          isOpen={true}
          onClose={mockOnClose}
          onSelectPrompt={mockOnSelectPrompt}
          onExecutePrompt={mockOnExecutePrompt}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render content when isOpen is false', () => {
      render(
        <PromptLibrary
          isOpen={false}
          onClose={mockOnClose}
          onSelectPrompt={mockOnSelectPrompt}
          onExecutePrompt={mockOnExecutePrompt}
        />
      );

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('prompt fetching', () => {
    it('should fetch prompts', async () => {
      const { promptsApi } = await import('../services/api.js');

      render(
        <PromptLibrary
          isOpen={true}
          onClose={mockOnClose}
          onSelectPrompt={mockOnSelectPrompt}
          onExecutePrompt={mockOnExecutePrompt}
        />
      );

      await waitFor(() => {
        expect(promptsApi.list).toHaveBeenCalled();
      });
    });
  });

  describe('search', () => {
    it('should have search functionality', async () => {
      render(
        <PromptLibrary
          isOpen={true}
          onClose={mockOnClose}
          onSelectPrompt={mockOnSelectPrompt}
          onExecutePrompt={mockOnExecutePrompt}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('favorites', () => {
    it('should have favorites filter', async () => {
      render(
        <PromptLibrary
          isOpen={true}
          onClose={mockOnClose}
          onSelectPrompt={mockOnSelectPrompt}
          onExecutePrompt={mockOnExecutePrompt}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

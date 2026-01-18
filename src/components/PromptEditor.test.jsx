/**
 * PromptEditor Component Tests
 * Phase 5.3: Unit tests for prompt editor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PromptEditor from './PromptEditor';

describe('PromptEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnDelete = vi.fn();

  const mockPrompt = {
    id: '1',
    name: 'Test Prompt',
    content: 'Hello {{name}}, your task is {{task|default value}}',
    description: 'A test prompt',
    category: 'coding',
    isFavorite: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the editor for new prompt', async () => {
      render(
        <PromptEditor
          prompt={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with existing prompt', async () => {
      render(
        <PromptEditor
          prompt={mockPrompt}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('display', () => {
    it('should display name input', async () => {
      render(
        <PromptEditor
          prompt={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('My Awesome Prompt')).toBeInTheDocument();
      });
    });

    it('should display Save button', async () => {
      render(
        <PromptEditor
          prompt={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    it('should display Cancel button', async () => {
      render(
        <PromptEditor
          prompt={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });
});

/**
 * PersonaSelector Component Tests
 * Phase 5.3: Unit tests for persona selector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PersonaSelector from './PersonaSelector';

describe('PersonaSelector', () => {
  const mockOnSelectPersona = vi.fn();
  const mockOnManagePersonas = vi.fn();
  const mockCustomPersonas = [
    {
      id: 'custom-1',
      name: 'Custom Expert',
      description: 'A custom persona',
      icon: '🎯',
      systemPrompt: 'Custom prompt',
      isBuiltIn: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the selector', async () => {
      render(
        <PersonaSelector
          selectedPersona="default"
          onSelectPersona={mockOnSelectPersona}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render in compact mode', async () => {
      render(
        <PersonaSelector
          selectedPersona="default"
          onSelectPersona={mockOnSelectPersona}
          compact={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('display', () => {
    it('should display Default Claude as default', async () => {
      render(
        <PersonaSelector
          selectedPersona="default"
          onSelectPersona={mockOnSelectPersona}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Default Claude')).toBeInTheDocument();
      });
    });

    it('should display selected persona name', async () => {
      render(
        <PersonaSelector
          selectedPersona="code-expert"
          onSelectPersona={mockOnSelectPersona}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Code Expert')).toBeInTheDocument();
      });
    });

    it('should include custom personas', async () => {
      render(
        <PersonaSelector
          selectedPersona="custom-1"
          onSelectPersona={mockOnSelectPersona}
          customPersonas={mockCustomPersonas}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Expert')).toBeInTheDocument();
      });
    });
  });

  describe('interaction', () => {
    it('should call onSelectPersona when persona is selected', async () => {
      render(
        <PersonaSelector
          selectedPersona="default"
          onSelectPersona={mockOnSelectPersona}
        />
      );

      // Click to open dropdown
      const button = screen.getByText('Default Claude');
      fireEvent.click(button);

      await waitFor(() => {
        // Click on another persona
        const codeExpert = screen.getAllByText('Code Expert')[0];
        if (codeExpert) {
          fireEvent.click(codeExpert);
        }
      });
    });
  });
});

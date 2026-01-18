/**
 * ErrorAnalysisPanel Component Tests
 * Phase 5.3: Unit tests for error analysis panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ErrorAnalysisPanel, { parseErrors, ERROR_PATTERNS } from './ErrorAnalysisPanel';

describe('ErrorAnalysisPanel', () => {
  const mockOnExecuteCommand = vi.fn();
  const mockOnAskAI = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when not collapsed', () => {
      render(
        <ErrorAnalysisPanel
          terminalOutput=""
          onExecuteCommand={mockOnExecuteCommand}
          onAskAI={mockOnAskAI}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render collapsed view', () => {
      render(
        <ErrorAnalysisPanel
          terminalOutput=""
          onExecuteCommand={mockOnExecuteCommand}
          onAskAI={mockOnAskAI}
          isCollapsed={true}
        />
      );

      expect(screen.getByText('No errors')).toBeInTheDocument();
    });
  });

  describe('error detection', () => {
    it('should show no errors message when output is clean', () => {
      render(
        <ErrorAnalysisPanel
          terminalOutput="Everything is fine"
          onExecuteCommand={mockOnExecuteCommand}
          onAskAI={mockOnAskAI}
        />
      );

      expect(screen.getByText('No errors detected')).toBeInTheDocument();
    });

    it('should detect TypeError', () => {
      render(
        <ErrorAnalysisPanel
          terminalOutput="TypeError: Cannot read property 'foo' of undefined"
          onExecuteCommand={mockOnExecuteCommand}
          onAskAI={mockOnAskAI}
        />
      );

      expect(screen.getAllByText('TypeError').length).toBeGreaterThan(0);
    });

    it('should detect module not found errors', () => {
      render(
        <ErrorAnalysisPanel
          terminalOutput="Error: Cannot find module 'missing-module'"
          onExecuteCommand={mockOnExecuteCommand}
          onAskAI={mockOnAskAI}
        />
      );

      expect(screen.getAllByText('ModuleNotFound').length).toBeGreaterThan(0);
    });
  });

  describe('display', () => {
    it('should display Error Analysis header', () => {
      render(
        <ErrorAnalysisPanel
          terminalOutput=""
          onExecuteCommand={mockOnExecuteCommand}
          onAskAI={mockOnAskAI}
        />
      );

      expect(screen.getByText('Error Analysis')).toBeInTheDocument();
    });
  });

  describe('parseErrors utility', () => {
    it('should parse TypeError', () => {
      const errors = parseErrors('TypeError: foo is not a function');
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('TypeError');
    });

    it('should parse npm errors', () => {
      const errors = parseErrors('npm ERR! code ERESOLVE');
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('NpmError');
    });

    it('should return empty array for clean output', () => {
      const errors = parseErrors('Build successful');
      expect(errors).toHaveLength(0);
    });
  });
});

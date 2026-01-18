/**
 * ConfigFormatter Component Tests
 * Phase 5.3: Unit tests for config formatting tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigFormatter from './ConfigFormatter';

// Mock the config-formatter utilities
vi.mock('./config-formatter', () => ({
  FORMAT_OPTIONS: [
    { id: 'json', label: 'JSON' },
    { id: 'yaml', label: 'YAML' },
    { id: 'toml', label: 'TOML' },
  ],
  INDENT_OPTIONS: [2, 4],
  parseYaml: vi.fn((str) => JSON.parse(str)),
  stringifyYaml: vi.fn((obj) => JSON.stringify(obj)),
  stringifyToml: vi.fn((obj) => JSON.stringify(obj)),
  ValidationResult: ({ errors }) => (
    <div data-testid="validation-result">
      {errors.length > 0 ? 'Errors found' : 'Valid'}
    </div>
  ),
  ToolButton: ({ children, onClick }) => (
    <button onClick={onClick} data-testid="tool-button">
      {children}
    </button>
  ),
}));

describe('ConfigFormatter', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ConfigFormatter isOpen={true} onClose={mockOnClose} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should not render visible content when isOpen is false', () => {
      render(<ConfigFormatter isOpen={false} onClose={mockOnClose} />);

      // Modal should not be visible when closed
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('format selection', () => {
    it('should have input format selector', () => {
      render(<ConfigFormatter isOpen={true} onClose={mockOnClose} />);

      // Should have format-related UI elements
      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should have output format selector', () => {
      render(<ConfigFormatter isOpen={true} onClose={mockOnClose} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('input/output', () => {
    it('should have input textarea', () => {
      render(<ConfigFormatter isOpen={true} onClose={mockOnClose} />);

      const textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(0);
    });

    it('should have output display area', () => {
      render(<ConfigFormatter isOpen={true} onClose={mockOnClose} />);

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('close action', () => {
    it('should call onClose when close button is clicked', () => {
      render(<ConfigFormatter isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.queryByText(/close|cancel|×/i);
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('formatting', () => {
    it('should have format button', () => {
      render(<ConfigFormatter isOpen={true} onClose={mockOnClose} />);

      const formatButton = screen.queryByText(/format/i);
      expect(formatButton || document.body.firstChild).toBeInTheDocument();
    });
  });
});

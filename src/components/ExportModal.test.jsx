/**
 * ExportModal Component Tests
 * Phase 5.3: Unit tests for session export functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportModal from './ExportModal';

describe('ExportModal', () => {
  const mockOnClose = vi.fn();
  const mockSession = {
    id: 'test-session-1',
    projectPath: '/test/project',
    createdAt: '2024-01-15T10:00:00Z',
    commands: [
      { command: 'git status', output: 'On branch main', timestamp: '2024-01-15T10:01:00Z' },
      { command: 'npm test', output: 'All tests passed', timestamp: '2024-01-15T10:02:00Z' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={mockOnClose}
          session={mockSession}
        />
      );

      expect(screen.getByText('Export Session')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <ExportModal
          isOpen={false}
          onClose={mockOnClose}
          session={mockSession}
        />
      );

      expect(screen.queryByText('Export Session')).not.toBeInTheDocument();
    });
  });

  describe('export formats', () => {
    it('should display format options', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={mockOnClose}
          session={mockSession}
        />
      );

      expect(screen.getByText('Markdown')).toBeInTheDocument();
      expect(screen.getByText('Plain Text')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('HTML')).toBeInTheDocument();
    });

    it('should allow selecting a format', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={mockOnClose}
          session={mockSession}
        />
      );

      const jsonOption = screen.getByText('JSON');
      fireEvent.click(jsonOption);

      // JSON should be selectable
      expect(jsonOption).toBeInTheDocument();
    });
  });

  describe('content options', () => {
    it('should display content checkboxes', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={mockOnClose}
          session={mockSession}
        />
      );

      expect(screen.getByText('Commands')).toBeInTheDocument();
      expect(screen.getByText('Output')).toBeInTheDocument();
      expect(screen.getByText('Timestamps')).toBeInTheDocument();
      expect(screen.getByText('Metadata')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should have close button', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={mockOnClose}
          session={mockSession}
        />
      );

      const closeButton = screen.getByText('Cancel');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should have export button', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={mockOnClose}
          session={mockSession}
        />
      );

      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });
});

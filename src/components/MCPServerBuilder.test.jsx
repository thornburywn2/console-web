/**
 * MCPServerBuilder Component Tests
 * Phase 5.3: Unit tests for MCP server builder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MCPServerBuilder from './MCPServerBuilder';

describe('MCPServerBuilder', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockServer = {
    id: '1',
    name: 'Test Server',
    transport: 'STDIO',
    command: 'node',
    args: ['server.js'],
    env: { NODE_ENV: 'production' },
    enabled: true,
    isGlobal: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the builder form', () => {
      render(
        <MCPServerBuilder
          server={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render with existing server data', async () => {
      render(
        <MCPServerBuilder
          server={mockServer}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Server')).toBeInTheDocument();
      });
    });

    it('should render transport options', () => {
      render(
        <MCPServerBuilder
          server={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Standard I/O')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onCancel when cancel is clicked', async () => {
      render(
        <MCPServerBuilder
          server={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});

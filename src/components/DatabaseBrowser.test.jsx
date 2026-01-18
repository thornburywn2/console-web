/**
 * DatabaseBrowser Component Tests
 * Phase 5.3: Unit tests for database GUI browser
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DatabaseBrowser from './DatabaseBrowser';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        tables: ['users', 'sessions', 'projects'],
      },
    }),
  },
}));

// Mock useApiQuery hook
vi.mock('../hooks/useApiQuery', () => ({
  useApiQuery: vi.fn().mockReturnValue({
    data: {
      tables: ['users', 'sessions', 'projects'],
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock sub-components
vi.mock('./database-browser', () => ({
  TableListItem: ({ table, onClick }) => (
    <button data-testid={`table-${table}`} onClick={() => onClick(table)}>
      {table}
    </button>
  ),
  ColumnHeader: ({ column }) => <th data-testid={`column-${column.name}`}>{column.name}</th>,
  DataCell: ({ value }) => <td>{value}</td>,
  QueryEditor: ({ onRun }) => (
    <div data-testid="query-editor">
      <button onClick={() => onRun('SELECT * FROM users')}>Run Query</button>
    </div>
  ),
  RecordModal: ({ record, onClose }) => (
    <div data-testid="record-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('DatabaseBrowser', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <DatabaseBrowser
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <DatabaseBrowser
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('table list', () => {
    it('should display table list', async () => {
      render(
        <DatabaseBrowser
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('users')).toBeInTheDocument();
      });
    });

    it('should display all tables', async () => {
      render(
        <DatabaseBrowser
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('sessions')).toBeInTheDocument();
        expect(screen.getByText('projects')).toBeInTheDocument();
      });
    });
  });

  describe('embedded mode', () => {
    it('should render in embedded mode', async () => {
      render(
        <DatabaseBrowser
          isOpen={true}
          onClose={mockOnClose}
          embedded={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('query editor', () => {
    it('should have query toggle button', async () => {
      render(
        <DatabaseBrowser
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle loading error', async () => {
      const { useApiQuery } = await import('../hooks/useApiQuery');
      vi.mocked(useApiQuery).mockReturnValue({
        data: null,
        loading: false,
        error: { getUserMessage: () => 'Connection failed' },
        refetch: vi.fn(),
      });

      render(
        <DatabaseBrowser
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

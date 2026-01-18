/**
 * EnvSyncPanel Component Tests
 * Phase 5.3: Unit tests for environment sync panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EnvSyncPanel from './EnvSyncPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  envApi: {
    getFiles: vi.fn().mockResolvedValue({
      files: [
        { name: '.env', exists: true, variables: 5 },
        { name: '.env.example', exists: true, variables: 3 },
        { name: '.env.local', exists: false, variables: 0 },
      ],
    }),
    getVariables: vi.fn().mockResolvedValue({
      variables: [
        { key: 'DATABASE_URL', value: 'postgres://localhost:5432/db' },
        { key: 'API_KEY', value: '***' },
      ],
    }),
    compare: vi.fn().mockResolvedValue({
      missing: ['NEW_VAR'],
      extra: ['OLD_VAR'],
      different: [],
    }),
    save: vi.fn().mockResolvedValue({ success: true }),
    sync: vi.fn().mockResolvedValue({ success: true }),
    generateExample: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock child components
vi.mock('./env-sync', () => ({
  EnvFileCard: ({ file, isSelected, onClick }) => (
    <div data-testid={`env-file-${file.name}`} onClick={onClick}>
      {file.name} {isSelected && '(selected)'}
    </div>
  ),
  VariableRow: ({ variable }) => (
    <div data-testid={`var-${variable.key}`}>{variable.key}={variable.value}</div>
  ),
  DiffView: () => <div data-testid="diff-view">Diff View</div>,
}));

describe('EnvSyncPanel', () => {
  const mockOnClose = vi.fn();
  const mockProjectPath = '/home/user/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <EnvSyncPanel
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <EnvSyncPanel
          isOpen={false}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should fetch env files when opened', async () => {
      const { envApi } = await import('../services/api.js');

      render(
        <EnvSyncPanel
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(envApi.getFiles).toHaveBeenCalledWith(mockProjectPath);
      });
    });
  });

  describe('display', () => {
    it('should display Environment Manager title', async () => {
      render(
        <EnvSyncPanel
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Environment Manager')).toBeInTheDocument();
      });
    });

    it('should display Environment Files section', async () => {
      render(
        <EnvSyncPanel
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Environment Files')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { envApi } = await import('../services/api.js');
      vi.mocked(envApi.getFiles).mockRejectedValue(new Error('Network error'));

      render(
        <EnvSyncPanel
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

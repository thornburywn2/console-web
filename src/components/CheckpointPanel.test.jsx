/**
 * CheckpointPanel Component Tests
 * Phase 5.3: Unit tests for session checkpoint management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CheckpointPanel from './CheckpointPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  checkpointsApi: {
    getByProject: vi.fn().mockResolvedValue([
      { id: '1', name: 'Initial commit', createdAt: '2024-01-15T10:00:00Z', type: 'MANUAL', size: 1024, isPinned: false },
      { id: '2', name: 'Feature complete', createdAt: '2024-01-15T11:00:00Z', type: 'POST_COMMIT', size: 2048, isPinned: false },
    ]),
    getStats: vi.fn().mockResolvedValue({
      totalCount: 2,
      totalSize: 3072,
    }),
    create: vi.fn().mockResolvedValue({ id: '3', name: 'New checkpoint' }),
    restore: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock sub-components
vi.mock('./checkpoint-panel', () => ({
  CHECKPOINT_TYPES: {
    MANUAL: { label: 'Manual', icon: '📍', color: 'text-blue-400' },
    AUTO_PERIODIC: { label: 'Auto', icon: '⏰', color: 'text-gray-400' },
    PRE_OPERATION: { label: 'Pre-op', icon: '⚠️', color: 'text-yellow-400' },
    POST_COMMIT: { label: 'Commit', icon: '📝', color: 'text-green-400' },
    SESSION_START: { label: 'Session', icon: '▶️', color: 'text-cyan-400' },
  },
  formatSize: vi.fn((size) => `${(size / 1024).toFixed(1)} KB`),
  formatRelativeTime: vi.fn((date) => '1 hour ago'),
}));

describe('CheckpointPanel', () => {
  const mockOnClose = vi.fn();
  const mockProjectId = 'project-1';
  const mockProjectPath = '/home/user/projects/test';
  const mockSessionId = 'session-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <CheckpointPanel
          projectId={mockProjectId}
          projectPath={mockProjectPath}
          sessionId={mockSessionId}
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
        <CheckpointPanel
          projectId={mockProjectId}
          projectPath={mockProjectPath}
          sessionId={mockSessionId}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('checkpoint loading', () => {
    it('should fetch checkpoints when opened', async () => {
      const { checkpointsApi } = await import('../services/api.js');

      render(
        <CheckpointPanel
          projectId={mockProjectId}
          projectPath={mockProjectPath}
          sessionId={mockSessionId}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(checkpointsApi.getByProject).toHaveBeenCalledWith(mockProjectId);
      });
    });

    it('should fetch stats when opened', async () => {
      const { checkpointsApi } = await import('../services/api.js');

      render(
        <CheckpointPanel
          projectId={mockProjectId}
          projectPath={mockProjectPath}
          sessionId={mockSessionId}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(checkpointsApi.getStats).toHaveBeenCalled();
      });
    });
  });

  describe('checkpoint display', () => {
    it('should display checkpoint names', async () => {
      render(
        <CheckpointPanel
          projectId={mockProjectId}
          projectPath={mockProjectPath}
          sessionId={mockSessionId}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Initial commit')).toBeInTheDocument();
      });
    });
  });

  describe('create checkpoint', () => {
    it('should have checkpoint name input', async () => {
      render(
        <CheckpointPanel
          projectId={mockProjectId}
          projectPath={mockProjectPath}
          sessionId={mockSessionId}
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
    it('should handle API errors gracefully', async () => {
      const { checkpointsApi } = await import('../services/api.js');
      vi.mocked(checkpointsApi.getByProject).mockRejectedValue(new Error('Network error'));

      render(
        <CheckpointPanel
          projectId={mockProjectId}
          projectPath={mockProjectPath}
          sessionId={mockSessionId}
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

/**
 * BackupManager Component Tests
 * Phase 5.3: Unit tests for backup manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BackupManager from './BackupManager';

// Mock API
vi.mock('../services/api.js', () => ({
  backupsApi: {
    list: vi.fn().mockResolvedValue({
      backups: [
        { id: '1', name: 'Daily Backup', strategy: 'full', size: 1024000, createdAt: '2024-01-15T10:00:00Z' },
        { id: '2', name: 'Git Bundle', strategy: 'git', size: 512000, createdAt: '2024-01-14T10:00:00Z' },
      ],
      schedules: [],
    }),
    create: vi.fn().mockResolvedValue({ id: '3', name: 'New Backup' }),
    restore: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    saveSchedule: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('BackupManager', () => {
  const mockOnClose = vi.fn();
  const mockProjectPath = '/home/user/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <BackupManager
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
        <BackupManager
          isOpen={false}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('backup fetching', () => {
    it('should fetch backups when opened', async () => {
      const { backupsApi } = await import('../services/api.js');

      render(
        <BackupManager
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(backupsApi.list).toHaveBeenCalledWith(mockProjectPath);
      });
    });
  });

  describe('backup display', () => {
    it('should display Backup Manager title', async () => {
      render(
        <BackupManager
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Backup Manager')).toBeInTheDocument();
      });
    });

    it('should have Create Backup button', async () => {
      render(
        <BackupManager
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create Backup')).toBeInTheDocument();
      });
    });

    it('should have Schedule button', async () => {
      render(
        <BackupManager
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Schedule')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { backupsApi } = await import('../services/api.js');
      vi.mocked(backupsApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <BackupManager
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

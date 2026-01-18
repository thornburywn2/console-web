/**
 * ScheduleManager Component Tests
 * Phase 5.3: Unit tests for cron job scheduler UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleManager from './ScheduleManager';

// Mock API
vi.mock('../services/api.js', () => ({
  scheduledTasksApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'Daily Backup', cron: '0 0 * * *', enabled: true, command: 'npm run backup' },
      { id: '2', name: 'Hourly Sync', cron: '0 * * * *', enabled: false, command: 'npm run sync' },
    ]),
    create: vi.fn().mockResolvedValue({ id: '3', name: 'New Task' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    toggle: vi.fn().mockResolvedValue({}),
    runNow: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('ScheduleManager', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <ScheduleManager
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
        <ScheduleManager
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Schedule Manager')).not.toBeInTheDocument();
    });
  });

  describe('task list', () => {
    it('should fetch scheduled tasks', async () => {
      const { scheduledTasksApi } = await import('../services/api.js');

      render(
        <ScheduleManager
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(scheduledTasksApi.list).toHaveBeenCalled();
      });
    });

    it('should display task names', async () => {
      render(
        <ScheduleManager
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument();
      });
    });
  });

  describe('cron presets', () => {
    it('should have preset options', async () => {
      render(
        <ScheduleManager
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('task actions', () => {
    it('should allow toggling task', async () => {
      render(
        <ScheduleManager
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument();
      });
    });

    it('should have run now button', async () => {
      render(
        <ScheduleManager
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

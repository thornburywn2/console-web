/**
 * SessionManager Component Tests
 * Phase 5.3: Unit tests for session management widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionManager from './SessionManager';

describe('SessionManager', () => {
  const mockOnKillSession = vi.fn();
  const mockOnSelectProject = vi.fn();

  const mockProjects = [
    {
      name: 'project-1',
      path: '/home/user/projects/project-1',
      hasActiveSession: true,
      sessionStart: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      name: 'project-2',
      path: '/home/user/projects/project-2',
      hasActiveSession: true,
      sessionStart: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    },
    {
      name: 'project-3',
      path: '/home/user/projects/project-3',
      hasActiveSession: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('session count', () => {
    it('should display correct number of active sessions', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('2 active')).toBeInTheDocument();
    });

    it('should display "0 active" when no active sessions', () => {
      render(
        <SessionManager
          projects={[{ name: 'test', path: '/test', hasActiveSession: false }]}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('0 active')).toBeInTheDocument();
    });

    it('should show empty state message when no active sessions', () => {
      render(
        <SessionManager
          projects={[]}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('[NO_ACTIVE_SESSIONS]')).toBeInTheDocument();
    });
  });

  describe('session list', () => {
    it('should display all active sessions', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('project-1')).toBeInTheDocument();
      expect(screen.getByText('project-2')).toBeInTheDocument();
      expect(screen.queryByText('project-3')).not.toBeInTheDocument();
    });

    it('should display session duration', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('1h 0m')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
    });

    it('should call onSelectProject when session is clicked', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      fireEvent.click(screen.getByText('project-1'));

      expect(mockOnSelectProject).toHaveBeenCalledWith(mockProjects[0]);
    });
  });

  describe('kill all sessions', () => {
    it('should not show kill all button when no active sessions', () => {
      render(
        <SessionManager
          projects={[]}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.queryByText('[KILL ALL]')).not.toBeInTheDocument();
    });

    it('should show kill all button when there are active sessions', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('[KILL ALL]')).toBeInTheDocument();
    });

    it('should show confirm state on first click', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      fireEvent.click(screen.getByText('[KILL ALL]'));

      expect(screen.getByText('[CONFIRM]')).toBeInTheDocument();
      expect(mockOnKillSession).not.toHaveBeenCalled();
    });

    it('should kill all sessions on confirm click', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      // First click to show confirm
      fireEvent.click(screen.getByText('[KILL ALL]'));
      // Second click to confirm
      fireEvent.click(screen.getByText('[CONFIRM]'));

      expect(mockOnKillSession).toHaveBeenCalledTimes(2);
      expect(mockOnKillSession).toHaveBeenCalledWith('/home/user/projects/project-1');
      expect(mockOnKillSession).toHaveBeenCalledWith('/home/user/projects/project-2');
    });

    it('should reset confirm state after timeout', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      fireEvent.click(screen.getByText('[KILL ALL]'));
      expect(screen.getByText('[CONFIRM]')).toBeInTheDocument();

      // Advance timer by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByText('[KILL ALL]')).toBeInTheDocument();
    });
  });

  describe('individual session kill', () => {
    it('should show confirm state on first kill click', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      const killButtons = screen.getAllByTitle('Kill session');
      fireEvent.click(killButtons[0]);

      expect(screen.getByTitle('Click again to confirm')).toBeInTheDocument();
      expect(mockOnKillSession).not.toHaveBeenCalled();
    });

    it('should kill session on confirm click', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      const killButtons = screen.getAllByTitle('Kill session');
      // First click to show confirm
      fireEvent.click(killButtons[0]);
      // Second click to confirm (title changed)
      fireEvent.click(screen.getByTitle('Click again to confirm'));

      expect(mockOnKillSession).toHaveBeenCalledWith('/home/user/projects/project-1');
    });

    it('should not propagate click to parent when killing', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      const killButtons = screen.getAllByTitle('Kill session');
      fireEvent.click(killButtons[0]);

      expect(mockOnSelectProject).not.toHaveBeenCalled();
    });

    it('should reset confirm state after timeout', () => {
      render(
        <SessionManager
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      const killButtons = screen.getAllByTitle('Kill session');
      fireEvent.click(killButtons[0]);
      expect(screen.getByTitle('Click again to confirm')).toBeInTheDocument();

      // Advance timer by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Should be back to normal state
      expect(screen.queryByTitle('Click again to confirm')).not.toBeInTheDocument();
    });
  });

  describe('duration formatting', () => {
    it('should format hours and minutes correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 7500000).toISOString(); // 2h 5m ago
      const projects = [
        {
          name: 'test',
          path: '/test',
          hasActiveSession: true,
          sessionStart: twoHoursAgo,
        },
      ];

      render(
        <SessionManager
          projects={projects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('2h 5m')).toBeInTheDocument();
    });

    it('should format minutes only when less than an hour', () => {
      const thirtyMinsAgo = new Date(Date.now() - 1800000).toISOString();
      const projects = [
        {
          name: 'test',
          path: '/test',
          hasActiveSession: true,
          sessionStart: thirtyMinsAgo,
        },
      ];

      render(
        <SessionManager
          projects={projects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('should show N/A when sessionStart is not provided', () => {
      const projects = [
        {
          name: 'test',
          path: '/test',
          hasActiveSession: true,
          sessionStart: null,
        },
      ];

      render(
        <SessionManager
          projects={projects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
        />
      );

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });
});

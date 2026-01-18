/**
 * SessionSearch Component Tests
 * Phase 5.3: Unit tests for session search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SessionSearch from './SessionSearch';

describe('SessionSearch', () => {
  const mockOnSearch = vi.fn();
  const mockOnSelectProject = vi.fn();
  const mockOnSelectSession = vi.fn();
  const mockOnToggleTag = vi.fn();

  const mockProjects = [
    { name: 'project-1', path: '/home/user/project-1' },
    { name: 'project-2', path: '/home/user/project-2' },
  ];

  const mockSessions = [
    { id: '1', sessionName: 'session-1', displayName: 'Session 1', status: 'ACTIVE' },
    { id: '2', sessionName: 'session-2', displayName: 'Session 2', status: 'INACTIVE' },
  ];

  const mockTags = [
    { id: '1', name: 'important', color: '#ef4444' },
    { id: '2', name: 'work', color: '#3b82f6' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search component', async () => {
      render(
        <SessionSearch
          projects={mockProjects}
          sessions={mockSessions}
          tags={mockTags}
          onSearch={mockOnSearch}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with empty data', () => {
      render(
        <SessionSearch
          projects={[]}
          sessions={[]}
          tags={[]}
          onSearch={mockOnSearch}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('display', () => {
    it('should display search input with placeholder', async () => {
      render(
        <SessionSearch
          projects={mockProjects}
          sessions={mockSessions}
          placeholder="Search projects..."
          onSearch={mockOnSearch}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
      });
    });

    it('should display custom placeholder', async () => {
      render(
        <SessionSearch
          projects={mockProjects}
          sessions={mockSessions}
          placeholder="Custom placeholder"
          onSearch={mockOnSearch}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
      });
    });
  });
});

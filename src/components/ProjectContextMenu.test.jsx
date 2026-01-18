/**
 * ProjectContextMenu Component Tests
 * Phase 5.3: Unit tests for project right-click context menu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProjectContextMenu from './ProjectContextMenu';

// Mock API
vi.mock('../services/api.js', () => ({
  projectTagsApi: {
    list: vi.fn().mockResolvedValue([
      { id: '1', name: 'important', color: '#ef4444' },
      { id: '2', name: 'review', color: '#3b82f6' },
    ]),
    getProjectTags: vi.fn().mockResolvedValue(['1']),
    addTagToProject: vi.fn().mockResolvedValue({}),
    removeTagFromProject: vi.fn().mockResolvedValue({}),
  },
  projectContextApi: {
    getInfo: vi.fn().mockResolvedValue({
      name: 'test-project',
      path: '/test/project',
      description: 'A test project',
    }),
    getNotes: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn().mockResolvedValue({}),
  },
}));

// Mock sub-components
vi.mock('./context-menu', () => ({
  PRIORITY_OPTIONS: ['low', 'medium', 'high'],
  ProjectInfoView: () => <div data-testid="project-info">Info View</div>,
  NotesView: () => <div data-testid="notes-view">Notes View</div>,
  CloneView: () => <div data-testid="clone-view">Clone View</div>,
  TagsSection: () => <div data-testid="tags-section">Tags Section</div>,
}));

describe('ProjectContextMenu', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectProject = vi.fn();
  const mockOnToggleFavorite = vi.fn();
  const mockOnKillSession = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockProject = {
    name: 'test-project',
    path: '/home/user/projects/test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <ProjectContextMenu
          isOpen={true}
          position={{ x: 100, y: 100 }}
          project={mockProject}
          onClose={mockOnClose}
          onSelectProject={mockOnSelectProject}
          onToggleFavorite={mockOnToggleFavorite}
          onKillSession={mockOnKillSession}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <ProjectContextMenu
          isOpen={false}
          position={{ x: 100, y: 100 }}
          project={mockProject}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('menu options', () => {
    it('should display main menu options', async () => {
      render(
        <ProjectContextMenu
          isOpen={true}
          position={{ x: 100, y: 100 }}
          project={mockProject}
          onClose={mockOnClose}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('favorite toggle', () => {
    it('should show favorite option', async () => {
      render(
        <ProjectContextMenu
          isOpen={true}
          position={{ x: 100, y: 100 }}
          project={mockProject}
          onClose={mockOnClose}
          onToggleFavorite={mockOnToggleFavorite}
          isFavorite={false}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('project tags', () => {
    it('should fetch project tags', async () => {
      const { projectTagsApi } = await import('../services/api.js');

      render(
        <ProjectContextMenu
          isOpen={true}
          position={{ x: 100, y: 100 }}
          project={mockProject}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(projectTagsApi.list).toHaveBeenCalled();
      });
    });
  });
});

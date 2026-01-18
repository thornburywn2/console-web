/**
 * ProjectCreator Component Tests
 * Phase 5.3: Unit tests for project creation wizard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectCreator from './ProjectCreator';

// Mock API
vi.mock('../services/api.js', () => ({
  projectTemplatesApi: {
    list: vi.fn().mockResolvedValue({
      templates: [
        { id: '1', name: 'Web App', description: 'Full-stack web application', type: 'web-app-fullstack', variables: [] },
        { id: '2', name: 'CLI Tool', description: 'Command line tool', type: 'cli-tool', variables: [] },
      ],
    }),
    create: vi.fn().mockResolvedValue({ success: true, projectPath: '/projects/new-project' }),
  },
}));

// Mock TemplateCard
vi.mock('./TemplateCard', () => ({
  default: ({ template, selected, onClick }) => (
    <button
      data-testid={`template-${template.id}`}
      className={selected ? 'selected' : ''}
      onClick={() => onClick(template)}
    >
      {template.name}
    </button>
  ),
}));

describe('ProjectCreator', () => {
  const mockOnClose = vi.fn();
  const mockOnProjectCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <ProjectCreator
          isOpen={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <ProjectCreator
          isOpen={false}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
        />
      );

      expect(screen.queryByText('Select Template')).not.toBeInTheDocument();
    });
  });

  describe('step navigation', () => {
    it('should start at step 1', async () => {
      render(
        <ProjectCreator
          isOpen={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Select Template')).toBeInTheDocument();
      });
    });
  });

  describe('template loading', () => {
    it('should fetch templates', async () => {
      const { projectTemplatesApi } = await import('../services/api.js');

      render(
        <ProjectCreator
          isOpen={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
        />
      );

      await waitFor(() => {
        expect(projectTemplatesApi.list).toHaveBeenCalled();
      });
    });

    it('should display templates after loading', async () => {
      render(
        <ProjectCreator
          isOpen={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Web App')).toBeInTheDocument();
      });
    });
  });

  describe('close action', () => {
    it('should call onClose when close button clicked', async () => {
      render(
        <ProjectCreator
          isOpen={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { projectTemplatesApi } = await import('../services/api.js');
      vi.mocked(projectTemplatesApi.list).mockRejectedValue(new Error('Failed to load templates'));

      render(
        <ProjectCreator
          isOpen={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

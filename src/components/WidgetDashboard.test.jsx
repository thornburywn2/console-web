/**
 * WidgetDashboard Component Tests
 * Phase 5.3: Unit tests for widget dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import WidgetDashboard from './WidgetDashboard';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock child components
vi.mock('./SystemStats', () => ({
  default: () => <div data-testid="system-stats">System Stats</div>,
}));

vi.mock('./ProjectContext', () => ({
  default: () => <div data-testid="project-context">Project Context</div>,
}));

vi.mock('./PortWizard', () => ({
  default: () => <div data-testid="port-wizard">Port Wizard</div>,
}));

vi.mock('./SessionManager', () => ({
  default: () => <div data-testid="session-manager">Session Manager</div>,
}));

vi.mock('./GitHubProjectPanel', () => ({
  default: () => <div data-testid="github-panel">GitHub Panel</div>,
}));

vi.mock('./CloudflarePublishPanel', () => ({
  default: () => <div data-testid="cloudflare-panel">Cloudflare Panel</div>,
}));

vi.mock('./AgentDetailDrawer', () => ({
  default: () => <div data-testid="agent-drawer">Agent Drawer</div>,
}));

vi.mock('./widgets', () => ({
  WIDGET_TYPES: {
    SYSTEM: 'system',
    PROJECTS: 'projects',
    DOCKER: 'docker',
    AGENTS: 'agents',
  },
  HEIGHT_SNAPS: {
    S: 150,
    M: 250,
    L: 400,
    F: 'fill',
  },
  DEFAULT_WIDGETS: [
    { id: 'system', type: 'system', height: 250 },
    { id: 'projects', type: 'projects', height: 'fill' },
  ],
  SIDEBAR_DEFAULTS: [],
  LEFT_SIDEBAR_DEFAULTS: [],
  DockerWidget: () => <div data-testid="docker-widget">Docker Widget</div>,
  ProjectsWidget: () => <div data-testid="projects-widget">Projects Widget</div>,
  AgentsWidget: () => <div data-testid="agents-widget">Agents Widget</div>,
  DraggableWidget: ({ children }) => <div data-testid="draggable-widget">{children}</div>,
  AddWidgetModal: () => <div data-testid="add-widget-modal">Add Widget Modal</div>,
  NoProjectSelected: () => <div data-testid="no-project">No Project Selected</div>,
}));

describe('WidgetDashboard', () => {
  const mockOnKillSession = vi.fn();
  const mockOnSelectProject = vi.fn();
  const mockOnOpenAdmin = vi.fn();
  const mockOnOpenCheckpoints = vi.fn();
  const mockOnOpenGitHubSettings = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnAction = vi.fn();

  const mockProjects = [
    { name: 'project-1', path: '/home/user/project-1' },
    { name: 'project-2', path: '/home/user/project-2' },
  ];

  const mockSelectedProject = {
    name: 'project-1',
    path: '/home/user/project-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('rendering', () => {
    it('should render the dashboard', async () => {
      render(
        <WidgetDashboard
          selectedProject={mockSelectedProject}
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
          onOpenAdmin={mockOnOpenAdmin}
          onOpenCheckpoints={mockOnOpenCheckpoints}
          onOpenGitHubSettings={mockOnOpenGitHubSettings}
          onRefresh={mockOnRefresh}
          onAction={mockOnAction}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render in sidebar mode', async () => {
      render(
        <WidgetDashboard
          selectedProject={mockSelectedProject}
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
          onOpenAdmin={mockOnOpenAdmin}
          sidebarMode={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render in left sidebar mode', async () => {
      render(
        <WidgetDashboard
          selectedProject={mockSelectedProject}
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
          onOpenAdmin={mockOnOpenAdmin}
          leftSidebarMode={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without selected project', async () => {
      render(
        <WidgetDashboard
          selectedProject={null}
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
          onOpenAdmin={mockOnOpenAdmin}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with toolbar hidden', async () => {
      render(
        <WidgetDashboard
          selectedProject={mockSelectedProject}
          projects={mockProjects}
          onKillSession={mockOnKillSession}
          onSelectProject={mockOnSelectProject}
          onOpenAdmin={mockOnOpenAdmin}
          hideToolbar={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

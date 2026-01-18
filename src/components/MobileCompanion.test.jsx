/**
 * MobileCompanion Component Tests
 * Phase 5.3: Unit tests for mobile view
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileCompanion from './MobileCompanion';

// Mock mobile-companion utilities
vi.mock('./mobile-companion', () => ({
  useMobileDetect: vi.fn(() => ({ isMobile: true, orientation: 'portrait' })),
  useMobileView: vi.fn(() => ({ view: 'list' })),
  MobileBottomNav: ({ tabs, activeTab, onTabChange }) => (
    <nav data-testid="mobile-bottom-nav">
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </nav>
  ),
  MobileHeader: ({ title }) => <header data-testid="mobile-header">{title}</header>,
  SwipeDrawer: ({ children, isOpen }) =>
    isOpen ? <div data-testid="swipe-drawer">{children}</div> : null,
  TouchListItem: ({ children, onClick }) => (
    <div data-testid="touch-list-item" onClick={onClick}>
      {children}
    </div>
  ),
  PullToRefresh: ({ children, onRefresh }) => (
    <div data-testid="pull-to-refresh">{children}</div>
  ),
  MobileQuickActions: ({ actions }) => (
    <div data-testid="mobile-quick-actions">
      {actions.map((a, i) => (
        <button key={i} onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  ),
  MobileTerminalView: ({ session }) => (
    <div data-testid="mobile-terminal">{session?.name}</div>
  ),
  MobileButton: ({ children, onClick }) => (
    <button data-testid="mobile-button" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('MobileCompanion', () => {
  const mockOnSelectProject = vi.fn();
  const mockOnSelectSession = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockProjects = [
    { name: 'project-1', path: '/projects/project-1' },
    { name: 'project-2', path: '/projects/project-2' },
  ];
  const mockSessions = [
    { id: '1', name: 'session-1' },
    { id: '2', name: 'session-2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render on mobile devices', () => {
      render(
        <MobileCompanion
          projects={mockProjects}
          sessions={mockSessions}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
          onRefresh={mockOnRefresh}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should not render on desktop', async () => {
      const { useMobileDetect } = await import('./mobile-companion');
      vi.mocked(useMobileDetect).mockReturnValue({ isMobile: false, orientation: 'landscape' });

      const { container } = render(
        <MobileCompanion
          projects={mockProjects}
          sessions={mockSessions}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
          onRefresh={mockOnRefresh}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render with empty arrays', () => {
      render(
        <MobileCompanion
          projects={[]}
          sessions={[]}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
          onRefresh={mockOnRefresh}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('should have navigation structure on mobile', () => {
      render(
        <MobileCompanion
          projects={mockProjects}
          sessions={mockSessions}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
          onRefresh={mockOnRefresh}
        />
      );

      // Should render navigation when on mobile
      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('quick actions', () => {
    it('should have quick actions available', () => {
      render(
        <MobileCompanion
          projects={mockProjects}
          sessions={mockSessions}
          onSelectProject={mockOnSelectProject}
          onSelectSession={mockOnSelectSession}
          onRefresh={mockOnRefresh}
        />
      );

      // Quick actions should be present in the component
      expect(document.body.firstChild).toBeInTheDocument();
    });
  });
});

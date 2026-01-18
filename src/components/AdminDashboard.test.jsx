/**
 * AdminDashboard Component Tests
 * Phase 5.3: Unit tests for the main admin dashboard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

// Mock all the child components to simplify testing
vi.mock('./admin/tabs/ProjectsTab', () => ({
  default: () => <div data-testid="projects-tab">ProjectsTab</div>,
}));

vi.mock('./admin/tabs/SettingsTab', () => ({
  default: () => <div data-testid="settings-tab">SettingsTab</div>,
}));

vi.mock('./admin/tabs/AutomationTab', () => ({
  default: () => <div data-testid="automation-tab">AutomationTab</div>,
}));

vi.mock('./admin/tabs/ServerTab', () => ({
  default: () => <div data-testid="server-tab">ServerTab</div>,
}));

vi.mock('./admin/tabs/SecurityTab', () => ({
  default: () => <div data-testid="security-tab">SecurityTab</div>,
}));

vi.mock('./admin/tabs/HistoryTab', () => ({
  default: () => <div data-testid="history-tab">HistoryTab</div>,
}));

vi.mock('./TabbyDashboard', () => ({
  default: () => <div data-testid="tabby-dashboard">TabbyDashboard</div>,
}));

vi.mock('./SwarmDashboard', () => ({
  default: () => <div data-testid="swarm-dashboard">SwarmDashboard</div>,
}));

vi.mock('./CodePuppyDashboard', () => ({
  default: () => <div data-testid="code-puppy-dashboard">CodePuppyDashboard</div>,
}));

vi.mock('./ApiTester', () => ({
  default: () => <div data-testid="api-tester">ApiTester</div>,
}));

vi.mock('./DatabaseBrowser', () => ({
  default: () => <div data-testid="database-browser">DatabaseBrowser</div>,
}));

vi.mock('./DiffViewer', () => ({
  default: () => <div data-testid="diff-viewer">DiffViewer</div>,
}));

vi.mock('./FileBrowser', () => ({
  default: () => <div data-testid="file-browser">FileBrowser</div>,
}));

vi.mock('./LogViewer', () => ({
  default: () => <div data-testid="log-viewer">LogViewer</div>,
}));

vi.mock('./DependencyDashboard', () => ({
  default: () => <div data-testid="dependency-dashboard">DependencyDashboard</div>,
}));

vi.mock('./GitWorkflow', () => ({
  default: () => <div data-testid="git-workflow">GitWorkflow</div>,
}));

vi.mock('./ProjectCreator', () => ({
  default: () => <div data-testid="project-creator">ProjectCreator</div>,
}));

vi.mock('./ComplianceChecker', () => ({
  default: () => <div data-testid="compliance-checker">ComplianceChecker</div>,
}));

// Mock useAuth hook
const mockHasRole = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    hasRole: mockHasRole,
    userRole: 'ADMIN',
    isAuthenticated: true,
  }),
}));

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AdminDashboard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(true); // Allow all roles by default
  });

  describe('tab navigation', () => {
    it('should render the main tab buttons', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('PROJECTS')).toBeInTheDocument();
      expect(screen.getByText('SETTINGS')).toBeInTheDocument();
      expect(screen.getByText('AUTOMATION')).toBeInTheDocument();
      expect(screen.getByText('HISTORY')).toBeInTheDocument();
    });

    it('should show PROJECTS tab content by default', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
    });

    it('should switch to SETTINGS tab when clicked', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('SETTINGS'));

      await waitFor(() => {
        expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
      });
    });

    it('should switch to AUTOMATION tab when clicked', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('AUTOMATION'));

      await waitFor(() => {
        expect(screen.getByTestId('automation-tab')).toBeInTheDocument();
      });
    });

    it('should switch to HISTORY tab when clicked', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('HISTORY'));

      await waitFor(() => {
        expect(screen.getByTestId('history-tab')).toBeInTheDocument();
      });
    });
  });

  describe('RBAC tab visibility', () => {
    it('should show SERVER tab when user has admin role', () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('SERVER')).toBeInTheDocument();
    });

    it('should show SECURITY tab when user has admin role', () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('SECURITY')).toBeInTheDocument();
    });

    it('should hide SERVER tab when user lacks admin role', () => {
      mockHasRole.mockImplementation((role) => role !== 'ADMIN' && role !== 'SUPERADMIN');
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.queryByText('SERVER')).not.toBeInTheDocument();
    });

    it('should hide SECURITY tab when user lacks admin role', () => {
      mockHasRole.mockImplementation((role) => role !== 'ADMIN' && role !== 'SUPERADMIN');
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.queryByText('SECURITY')).not.toBeInTheDocument();
    });
  });

  describe('admin-only tabs content', () => {
    it('should show SERVER tab content when user has permission', async () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('SERVER'));

      await waitFor(() => {
        expect(screen.getByTestId('server-tab')).toBeInTheDocument();
      });
    });

    it('should show SECURITY tab content when user has permission', async () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('SECURITY'));

      await waitFor(() => {
        expect(screen.getByTestId('security-tab')).toBeInTheDocument();
      });
    });
  });

  describe('header', () => {
    it('should display the Command Portal title', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Command Portal')).toBeInTheDocument();
    });

    it('should display the close button', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('[ESC]')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('[ESC]'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('footer', () => {
    it('should display the version number', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('v1.0.24')).toBeInTheDocument();
    });

    it('should display the system label', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('CP://SYSTEM')).toBeInTheDocument();
    });

    it('should display the current date', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      const today = new Date().toLocaleDateString();
      expect(screen.getByText(today)).toBeInTheDocument();
    });
  });

  describe('active tab indicator', () => {
    it('should show PROJECTS as the initial active tab in footer', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('TAB: PROJECTS')).toBeInTheDocument();
    });

    it('should update footer when switching tabs', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('SETTINGS'));

      await waitFor(() => {
        expect(screen.getByText('TAB: SETTINGS')).toBeInTheDocument();
      });
    });
  });
});

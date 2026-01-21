/**
 * AdminDashboard Component Tests
 * Phase 5.3: Unit tests for the main admin dashboard
 * Updated for refactored AdminNav sidebar navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    // Mock localStorage for AdminNav section states
    Storage.prototype.getItem = vi.fn(() => '{}');
    Storage.prototype.setItem = vi.fn();
  });

  describe('sidebar navigation', () => {
    it('should render the main navigation items', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      // Navigation sidebar items are title-case in AdminNav
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('should render automation section items', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });

    it('should show PROJECTS tab content by default', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
    });

    it('should switch to SETTINGS tab when clicked', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Settings'));

      await waitFor(() => {
        expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
      });
    });

    it('should switch to HISTORY tab when clicked', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('History'));

      await waitFor(() => {
        expect(screen.getByTestId('history-tab')).toBeInTheDocument();
      });
    });

    it('should switch to AUTOMATION/Agents tab when clicked', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Agents'));

      await waitFor(() => {
        expect(screen.getByTestId('automation-tab')).toBeInTheDocument();
      });
    });
  });

  describe('RBAC tab visibility', () => {
    it('should show Server section header when user has admin role', () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      // Server section header should be visible (items are in collapsed section)
      expect(screen.getByText('Server')).toBeInTheDocument();
    });

    it('should show Server section items when expanded', async () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      // Click on Server section to expand it
      fireEvent.click(screen.getByText('Server'));

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Services')).toBeInTheDocument();
        expect(screen.getByText('Docker')).toBeInTheDocument();
      });
    });

    it('should show Security section header when user has admin role', () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      // Security section header should be visible
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('should show Security section items when expanded', async () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      // Click on Security section to expand it
      fireEvent.click(screen.getByText('Security'));

      await waitFor(() => {
        expect(screen.getByText('Scans')).toBeInTheDocument();
        expect(screen.getByText('Firewall')).toBeInTheDocument();
      });
    });

    it('should hide Server section when user lacks admin role', () => {
      mockHasRole.mockImplementation((role) => role !== 'ADMIN' && role !== 'SUPERADMIN');
      render(<AdminDashboard onClose={mockOnClose} />);

      // Server section should not be visible at all
      expect(screen.queryByText('Server')).not.toBeInTheDocument();
    });

    it('should hide Security section when user lacks admin role', () => {
      mockHasRole.mockImplementation((role) => role !== 'ADMIN' && role !== 'SUPERADMIN');
      render(<AdminDashboard onClose={mockOnClose} />);

      // Security section should not be visible at all
      expect(screen.queryByText('Security')).not.toBeInTheDocument();
    });
  });

  describe('admin-only tabs content', () => {
    it('should show SERVER tab content when user has permission', async () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      // First expand the Server section
      fireEvent.click(screen.getByText('Server'));
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      // Then click on Overview
      fireEvent.click(screen.getByText('Overview'));

      await waitFor(() => {
        expect(screen.getByTestId('server-tab')).toBeInTheDocument();
      });
    });

    it('should show SECURITY tab content when user has permission', async () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      // First expand the Security section
      fireEvent.click(screen.getByText('Security'));
      await waitFor(() => {
        expect(screen.getByText('Scans')).toBeInTheDocument();
      });

      // Then click on Scans
      fireEvent.click(screen.getByText('Scans'));

      await waitFor(() => {
        expect(screen.getByTestId('security-tab')).toBeInTheDocument();
      });
    });
  });

  describe('header', () => {
    it('should display the active tab name in header', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      // Header shows the active tab name (PROJECTS by default)
      const header = screen.getByRole('heading', { level: 1 });
      expect(header).toHaveTextContent(/projects/i);
    });

    it('should display the close button', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Close'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('sidebar header', () => {
    it('should display ADMIN label', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });
  });

  describe('version display', () => {
    it('should display the version number in sidebar', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('v1.0.27')).toBeInTheDocument();
    });
  });

  describe('header updates on tab change', () => {
    it('should update header when switching tabs', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Settings'));

      await waitFor(() => {
        const header = screen.getByRole('heading', { level: 1 });
        expect(header).toHaveTextContent(/settings/i);
      });
    });

    it('should update header when switching to History', async () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('History'));

      await waitFor(() => {
        const header = screen.getByRole('heading', { level: 1 });
        expect(header).toHaveTextContent(/history/i);
      });
    });
  });

  describe('navigation sections', () => {
    it('should have Main section with Projects, Settings, History', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('should have Automation section with Agents and MCP Servers', () => {
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Automation')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });

    it('should have Server section for admin users', () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Server')).toBeInTheDocument();
    });

    it('should have Security section for admin users', () => {
      mockHasRole.mockReturnValue(true);
      render(<AdminDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Security')).toBeInTheDocument();
    });
  });
});

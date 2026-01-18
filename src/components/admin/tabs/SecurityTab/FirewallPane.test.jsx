/**
 * FirewallPane Component Tests
 * Phase 5.3: Unit tests for UFW firewall management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FirewallPane } from './FirewallPane';

// Mock the firewallExtendedApi
vi.mock('../../../../services/api.js', () => ({
  firewallExtendedApi: {
    getStatus: vi.fn(),
    getLogs: vi.fn(),
    getProjectPorts: vi.fn(),
    enableFirewall: vi.fn(),
    disableFirewall: vi.fn(),
    addRule: vi.fn(),
    deleteRule: vi.fn(),
    syncProjectPorts: vi.fn(),
  },
}));

import { firewallExtendedApi } from '../../../../services/api.js';

// Mock data
const mockFirewallStatus = {
  status: { active: true },
  rules: [
    { number: 1, action: 'ALLOW', port: '22', protocol: 'tcp', from: 'Anywhere', comment: 'SSH' },
    { number: 2, action: 'ALLOW', port: '80', protocol: 'tcp', from: 'Anywhere', comment: 'HTTP' },
    { number: 3, action: 'ALLOW', port: '443', protocol: 'tcp', from: 'Anywhere', comment: 'HTTPS' },
    { number: 4, action: 'DENY', port: '8080', protocol: 'tcp', from: '10.0.0.0/8' },
  ],
  apps: [],
};

const mockLogs = {
  logs: [
    'Jan 17 10:00:00 server kernel: [UFW BLOCK] IN=eth0 OUT= SRC=1.2.3.4',
    'Jan 17 10:00:01 server kernel: [UFW ALLOW] IN=eth0 OUT= SRC=5.6.7.8',
  ],
};

const mockProjectPorts = {
  ports: [
    { port: 3000, project: 'web-app' },
    { port: 5432, service: 'postgresql' },
    { port: 6379, project: 'redis' },
  ],
};

describe('FirewallPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    firewallExtendedApi.getStatus.mockResolvedValue(mockFirewallStatus);
    firewallExtendedApi.getLogs.mockResolvedValue(mockLogs);
    firewallExtendedApi.getProjectPorts.mockResolvedValue(mockProjectPorts);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render firewall status card', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
        expect(screen.getByText('STATUS')).toBeInTheDocument();
      });
    });

    it('should render rules count', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('RULES')).toBeInTheDocument();
      });
    });

    it('should render project ports count', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('PROJECT PORTS')).toBeInTheDocument();
      });
    });

    it('should render disable button when active', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('DISABLE')).toBeInTheDocument();
      });
    });

    it('should render enable button when inactive', async () => {
      firewallExtendedApi.getStatus.mockResolvedValue({
        ...mockFirewallStatus,
        status: { active: false },
      });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('INACTIVE')).toBeInTheDocument();
        expect(screen.getByText('ENABLE')).toBeInTheDocument();
      });
    });

    it('should render firewall rules header', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('FIREWALL RULES')).toBeInTheDocument();
      });
    });
  });

  describe('rules list', () => {
    it('should display all rules', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('22')).toBeInTheDocument();
        expect(screen.getByText('80')).toBeInTheDocument();
        expect(screen.getByText('443')).toBeInTheDocument();
        expect(screen.getByText('8080')).toBeInTheDocument();
      });
    });

    it('should show ALLOW badges', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        const allowBadges = screen.getAllByText('ALLOW');
        expect(allowBadges.length).toBe(3);
      });
    });

    it('should show DENY badge', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('DENY')).toBeInTheDocument();
      });
    });

    it('should show SSH PROTECTED badge for port 22', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('SSH PROTECTED')).toBeInTheDocument();
      });
    });

    it('should show rule comments', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('// SSH')).toBeInTheDocument();
        expect(screen.getByText('// HTTP')).toBeInTheDocument();
        expect(screen.getByText('// HTTPS')).toBeInTheDocument();
      });
    });

    it('should show from IP for non-Anywhere rules', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('from 10.0.0.0/8')).toBeInTheDocument();
      });
    });

    it('should not show DELETE button for SSH rule', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        // There should be 3 DELETE buttons (for non-SSH rules)
        const deleteButtons = screen.getAllByText('DELETE');
        expect(deleteButtons.length).toBe(3);
      });
    });

    it('should show empty message when no rules', async () => {
      firewallExtendedApi.getStatus.mockResolvedValue({
        status: { active: true },
        rules: [],
        apps: [],
      });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('No firewall rules configured')).toBeInTheDocument();
      });
    });
  });

  describe('add rule form', () => {
    it('should show add rule button', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('+ ADD RULE')).toBeInTheDocument();
      });
    });

    it('should show form when add rule clicked', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('+ ADD RULE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ ADD RULE'));

      expect(screen.getByPlaceholderText('Port (e.g., 80, 443)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('From (any or IP)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Comment')).toBeInTheDocument();
    });

    it('should hide form when cancel clicked', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('+ ADD RULE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ ADD RULE'));
      expect(screen.getByPlaceholderText('Port (e.g., 80, 443)')).toBeInTheDocument();

      fireEvent.click(screen.getByText('CANCEL'));

      expect(screen.queryByPlaceholderText('Port (e.g., 80, 443)')).not.toBeInTheDocument();
    });

    it('should call addRule API when form submitted', async () => {
      firewallExtendedApi.addRule.mockResolvedValue({ success: true });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('+ ADD RULE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ ADD RULE'));

      // Fill in port
      fireEvent.change(screen.getByPlaceholderText('Port (e.g., 80, 443)'), {
        target: { value: '3000' },
      });

      // Submit - the form has an "ADD RULE" button inside
      const addButtons = screen.getAllByText('ADD RULE');
      const submitButton = addButtons[addButtons.length - 1]; // The one in the form
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(firewallExtendedApi.addRule).toHaveBeenCalledWith(
          expect.objectContaining({
            port: '3000',
            action: 'allow',
            protocol: 'tcp',
          })
        );
      });
    });

    it('should show success message after adding rule', async () => {
      firewallExtendedApi.addRule.mockResolvedValue({ success: true });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('+ ADD RULE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ ADD RULE'));
      fireEvent.change(screen.getByPlaceholderText('Port (e.g., 80, 443)'), {
        target: { value: '3000' },
      });

      const addButtons = screen.getAllByText('ADD RULE');
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/Rule added successfully/)).toBeInTheDocument();
      });
    });
  });

  describe('delete rule', () => {
    it('should confirm before deleting', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getAllByText('DELETE').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('DELETE');
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Delete this firewall rule?');
    });

    it('should call deleteRule API', async () => {
      firewallExtendedApi.deleteRule.mockResolvedValue({ success: true });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getAllByText('DELETE').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('DELETE');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(firewallExtendedApi.deleteRule).toHaveBeenCalled();
      });
    });

    it('should show success message after deletion', async () => {
      firewallExtendedApi.deleteRule.mockResolvedValue({ success: true });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getAllByText('DELETE').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('DELETE');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Rule deleted/)).toBeInTheDocument();
      });
    });

    it('should show SSH protection error when deleting SSH rule', async () => {
      const error = new Error('Cannot delete SSH rule');
      error.details = { protected: true };
      firewallExtendedApi.deleteRule.mockRejectedValue(error);

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getAllByText('DELETE').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('DELETE');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/SSH rules cannot be deleted/)).toBeInTheDocument();
      });
    });
  });

  describe('toggle firewall', () => {
    it('should call disableFirewall when active and disable clicked', async () => {
      firewallExtendedApi.disableFirewall.mockResolvedValue({ success: true });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('DISABLE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('DISABLE'));

      await waitFor(() => {
        expect(firewallExtendedApi.disableFirewall).toHaveBeenCalled();
      });
    });

    it('should call enableFirewall when inactive and enable clicked', async () => {
      firewallExtendedApi.getStatus.mockResolvedValue({
        ...mockFirewallStatus,
        status: { active: false },
      });
      firewallExtendedApi.enableFirewall.mockResolvedValue({ success: true });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('ENABLE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('ENABLE'));

      await waitFor(() => {
        expect(firewallExtendedApi.enableFirewall).toHaveBeenCalled();
      });
    });

    it('should show success message after toggle', async () => {
      firewallExtendedApi.disableFirewall.mockResolvedValue({ success: true });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('DISABLE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('DISABLE'));

      await waitFor(() => {
        expect(screen.getByText(/Firewall disabled/)).toBeInTheDocument();
      });
    });
  });

  describe('sync project ports', () => {
    it('should render sync button', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('SYNC PROJECTS')).toBeInTheDocument();
      });
    });

    it('should call syncProjectPorts API', async () => {
      firewallExtendedApi.syncProjectPorts.mockResolvedValue({
        summary: {
          sshStatus: 'protected',
          portsAdded: 5,
          portsSkipped: 2,
        },
      });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('SYNC PROJECTS')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('SYNC PROJECTS'));

      await waitFor(() => {
        expect(firewallExtendedApi.syncProjectPorts).toHaveBeenCalled();
      });
    });

    it('should show syncing state', async () => {
      firewallExtendedApi.syncProjectPorts.mockImplementation(
        () => new Promise(() => {})
      );

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('SYNC PROJECTS')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('SYNC PROJECTS'));

      expect(screen.getByText('SYNCING...')).toBeInTheDocument();
    });

    it('should show success message with summary', async () => {
      firewallExtendedApi.syncProjectPorts.mockResolvedValue({
        summary: {
          sshStatus: 'protected',
          portsAdded: 5,
          portsSkipped: 2,
        },
      });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('SYNC PROJECTS')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('SYNC PROJECTS'));

      await waitFor(() => {
        expect(screen.getByText(/Firewall synced/)).toBeInTheDocument();
        expect(screen.getByText(/Added: 5 ports/)).toBeInTheDocument();
      });
    });
  });

  describe('firewall logs', () => {
    it('should render logs section', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('RECENT FIREWALL LOGS')).toBeInTheDocument();
      });
    });

    it('should display log entries', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText(/UFW BLOCK/)).toBeInTheDocument();
        expect(screen.getByText(/UFW ALLOW/)).toBeInTheDocument();
      });
    });

    it('should not render logs section when empty', async () => {
      firewallExtendedApi.getLogs.mockResolvedValue({ logs: [] });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('FIREWALL RULES')).toBeInTheDocument();
      });

      expect(screen.queryByText('RECENT FIREWALL LOGS')).not.toBeInTheDocument();
    });
  });

  describe('project ports', () => {
    it('should render project ports section', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText(/PROJECT PORTS \[3\]/)).toBeInTheDocument();
      });
    });

    it('should display port entries', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('3000')).toBeInTheDocument();
        expect(screen.getByText('web-app')).toBeInTheDocument();
        expect(screen.getByText('5432')).toBeInTheDocument();
        expect(screen.getByText('postgresql')).toBeInTheDocument();
      });
    });

    it('should not render section when no ports', async () => {
      firewallExtendedApi.getProjectPorts.mockResolvedValue({ ports: [] });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('FIREWALL RULES')).toBeInTheDocument();
      });

      // The stats card has "PROJECT PORTS" label always visible
      // But the section header with count should not be present
      expect(screen.queryByText(/PROJECT PORTS \[\d+\]/)).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should show error message on API failure', async () => {
      const mockError = {
        getUserMessage: () => 'Failed to fetch firewall status',
      };
      firewallExtendedApi.enableFirewall.mockRejectedValue(mockError);
      firewallExtendedApi.getStatus.mockResolvedValue({
        ...mockFirewallStatus,
        status: { active: false },
      });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('ENABLE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('ENABLE'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch firewall status/)).toBeInTheDocument();
      });
    });

    it('should dismiss error when X clicked', async () => {
      const mockError = {
        getUserMessage: () => 'Test error',
      };
      firewallExtendedApi.enableFirewall.mockRejectedValue(mockError);
      firewallExtendedApi.getStatus.mockResolvedValue({
        ...mockFirewallStatus,
        status: { active: false },
      });

      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('ENABLE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('ENABLE'));

      await waitFor(() => {
        expect(screen.getByText(/Test error/)).toBeInTheDocument();
      });

      // Click the X button to dismiss
      const errorBanner = screen.getByText(/Test error/).closest('div');
      const dismissButton = errorBanner.querySelector('button');
      fireEvent.click(dismissButton);

      expect(screen.queryByText(/Test error/)).not.toBeInTheDocument();
    });
  });

  describe('refresh', () => {
    it('should render refresh button', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('REFRESH')).toBeInTheDocument();
      });
    });

    it('should refetch data when refresh clicked', async () => {
      render(<FirewallPane />);

      await waitFor(() => {
        expect(screen.getByText('REFRESH')).toBeInTheDocument();
      });

      firewallExtendedApi.getStatus.mockClear();
      fireEvent.click(screen.getByText('REFRESH'));

      await waitFor(() => {
        expect(firewallExtendedApi.getStatus).toHaveBeenCalled();
      });
    });
  });
});

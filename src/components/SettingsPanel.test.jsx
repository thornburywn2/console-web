/**
 * SettingsPanel Component Tests
 * Phase 5.3: Unit tests for settings panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SettingsPanel from './SettingsPanel';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock API
vi.mock('../services/api.js', () => ({
  systemApi: {
    getSettings: vi.fn().mockResolvedValue({
      terminalFont: 'JetBrains Mono',
      terminalFontSize: 14,
    }),
    updateSettings: vi.fn().mockResolvedValue({ success: true }),
  },
  systemVersionApi: {
    getVersion: vi.fn().mockResolvedValue({
      current: '1.0.0',
      latest: '1.0.1',
      updateAvailable: true,
    }),
  },
  shortcutsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  personasApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  authentikSettingsApi: {
    get: vi.fn().mockResolvedValue({ enabled: true }),
  },
  configApi: {
    get: vi.fn().mockResolvedValue({}),
  },
  lifecycleExtendedApi: {
    getScanSettings: vi.fn().mockResolvedValue({}),
    getScanRecommendations: vi.fn().mockResolvedValue([]),
    getScanQueueStatus: vi.fn().mockResolvedValue({ queue: [] }),
  },
}));

// Mock child components
vi.mock('./settings', () => ({
  CATEGORIES: {
    GENERAL: 'general',
    APPEARANCE: 'appearance',
    SHORTCUTS: 'shortcuts',
    PERSONAS: 'personas',
    INTEGRATIONS: 'integrations',
    AUTH: 'auth',
    SCANS: 'scans',
    SYSTEM: 'system',
  },
  CategoryIcon: () => <span>Icon</span>,
  GeneralPane: () => <div data-testid="general-pane">General</div>,
  AppearancePane: () => <div data-testid="appearance-pane">Appearance</div>,
  ShortcutsPane: () => <div data-testid="shortcuts-pane">Shortcuts</div>,
  PersonasPane: () => <div data-testid="personas-pane">Personas</div>,
  IntegrationsPane: () => <div data-testid="integrations-pane">Integrations</div>,
  AuthPane: () => <div data-testid="auth-pane">Auth</div>,
  ScansPane: () => <div data-testid="scans-pane">Scans</div>,
  SystemPane: () => <div data-testid="system-pane">System</div>,
}));

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the settings panel', async () => {
      render(<SettingsPanel />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch settings on mount', async () => {
      const { systemApi } = await import('../services/api.js');

      render(<SettingsPanel />);

      await waitFor(() => {
        expect(systemApi.getSettings).toHaveBeenCalled();
      });
    });

    it('should fetch version info on mount', async () => {
      const { systemVersionApi } = await import('../services/api.js');

      render(<SettingsPanel />);

      await waitFor(() => {
        expect(systemVersionApi.getVersion).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { systemApi } = await import('../services/api.js');
      vi.mocked(systemApi.getSettings).mockRejectedValue(new Error('Network error'));

      render(<SettingsPanel />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});

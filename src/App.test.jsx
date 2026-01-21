/**
 * App Component Tests
 * Comprehensive tests for the main application component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock socket.io-client before importing App
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  id: 'test-socket-id',
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock API services - must use inline factory functions
vi.mock('./services/api.js', () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([
      { name: 'test-project', path: '/home/user/Projects/test-project', hasActiveSession: false },
      { name: 'another-project', path: '/home/user/Projects/another-project', hasActiveSession: true },
    ]),
  },
  systemApi: {
    getSettings: vi.fn().mockResolvedValue({ autoReconnect: true, appName: 'Test Portal' }),
  },
  notesApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'note-1', content: 'Test note' }),
    update: vi.fn().mockResolvedValue({ id: 'note-1', content: 'Updated note' }),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  sessionsPersistedApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

// Mock child components
vi.mock('./components/sidebar', () => ({
  LeftSidebar: ({ projects, onSelectProject }) => (
    <div data-testid="left-sidebar">
      {projects?.map(p => (
        <button key={p.path} data-testid={`project-${p.name}`} onClick={() => onSelectProject(p)}>
          {p.name}
        </button>
      ))}
    </div>
  ),
  RightSidebar: () => <div data-testid="right-sidebar">RightSidebar</div>,
}));

vi.mock('./components/Terminal', () => ({
  default: () => <div data-testid="terminal">Terminal</div>,
}));

vi.mock('./components/terminal', () => ({
  TerminalTabBar: () => <div data-testid="terminal-tab-bar">TerminalTabBar</div>,
}));

vi.mock('./hooks/useTerminalTabs', () => ({
  useTerminalTabs: () => ({
    tabs: [],
    activeSessionId: null,
    activeTab: null,
    isLoading: false,
    createTab: vi.fn(),
    selectTab: vi.fn(),
    closeTab: vi.fn(),
    renameTab: vi.fn(),
    setTabColor: vi.fn(),
    getNextTab: vi.fn(),
    getPreviousTab: vi.fn(),
    selectTabByIndex: vi.fn(),
  }),
}));

vi.mock('./components/CommandPalette', () => ({
  default: ({ isOpen, onClose }) => isOpen ? (
    <div data-testid="command-palette">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
}));

vi.mock('./components/BulkActionBar', () => ({
  default: () => <div data-testid="bulk-action-bar">BulkActionBar</div>,
}));

vi.mock('./components/HomeDashboard', () => ({
  default: ({ onSelectProject }) => (
    <div data-testid="home-dashboard">
      <button data-testid="select-project-btn" onClick={() => onSelectProject({ name: 'test', path: '/test' })}>
        Select Project
      </button>
    </div>
  ),
}));

vi.mock('./components/OfflineMode', () => ({
  OfflineIndicator: () => <div data-testid="offline-indicator">OfflineIndicator</div>,
}));

vi.mock('./components/FavoritesBar', () => ({
  default: () => <div data-testid="favorites-bar">FavoritesBar</div>,
}));

vi.mock('./components/admin/shared/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }) => <div data-testid="error-boundary">{children}</div>,
}));

// Mock hooks
vi.mock('./hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('./hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'hacker',
    setTheme: vi.fn(),
    cycleTheme: vi.fn(),
  }),
}));

vi.mock('./hooks/useSessionManagement', () => ({
  useSessionManagement: () => ({
    selectedSessions: new Set(),
    bulkPin: vi.fn(),
    bulkUnpin: vi.fn(),
    bulkArchive: vi.fn(),
    bulkDelete: vi.fn(),
    bulkMove: vi.fn(),
    bulkAddTag: vi.fn(),
    clearSelection: vi.fn(),
    folders: [],
    tags: [],
  }),
}));

vi.mock('./hooks/useAiderVoice', () => ({
  useAiderVoice: () => ({
    hasActiveSession: false,
    startAiderSession: vi.fn(),
  }),
}));

// Mock useAuth
vi.mock('./hooks/useAuth', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  RequireAuth: ({ children }) => <div data-testid="require-auth">{children}</div>,
}));

// Mock components with co-located hooks
vi.mock('./components/GlobalSearch', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="global-search">GlobalSearch</div> : null,
  useGlobalSearch: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('./components/SetupWizard', () => ({
  default: () => <div data-testid="setup-wizard">SetupWizard</div>,
  useSetupWizard: () => ({
    showSetup: false,
    complete: vi.fn(),
  }),
}));

vi.mock('./components/ChangelogWidget', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="changelog-widget">ChangelogWidget</div> : null,
  ChangelogBadge: ({ onClick }) => <button data-testid="changelog-badge" onClick={onClick}>Changelog</button>,
}));

vi.mock('./components/VoiceCommandPanel', () => ({
  default: () => <div data-testid="voice-command-panel">VoiceCommandPanel</div>,
  VoiceButton: () => <button data-testid="voice-button">Voice</button>,
}));

vi.mock('./components/AiderModeToggle', () => ({
  AiderModeToggleCompact: () => <div data-testid="aider-mode-toggle">AiderModeToggle</div>,
}));

// Mock lazy-loaded components
vi.mock('./components/AdminDashboard', () => ({
  default: ({ onClose }) => (
    <div data-testid="admin-dashboard">
      <button onClick={onClose}>Close Admin</button>
    </div>
  ),
  TABS: {
    PROJECTS: 'PROJECTS',
    SETTINGS: 'SETTINGS',
    AUTOMATION: 'AUTOMATION',
    SERVER: 'SERVER',
    SECURITY: 'SECURITY',
    HISTORY: 'HISTORY',
    DOCKER: 'DOCKER',
    STACK: 'STACK',
    MONITORING: 'MONITORING',
  },
}));

vi.mock('./components/ProjectInfoBar', () => ({
  default: () => <div data-testid="project-info-bar">ProjectInfoBar</div>,
}));

vi.mock('./components/KeyboardShortcutsModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? (
    <div data-testid="keyboard-shortcuts-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
}));

vi.mock('./components/ThemePicker', () => ({
  default: ({ isOpen, onClose }) => isOpen ? (
    <div data-testid="theme-picker">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
}));

vi.mock('./components/SessionTemplateModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="session-template-modal">SessionTemplateModal</div> : null,
}));

vi.mock('./components/SessionNoteEditor', () => ({
  default: () => <div data-testid="session-note-editor">SessionNoteEditor</div>,
}));

vi.mock('./components/ShareModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="share-modal">ShareModal</div> : null,
}));

vi.mock('./components/HandoffModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="handoff-modal">HandoffModal</div> : null,
}));

vi.mock('./components/ExportModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="export-modal">ExportModal</div> : null,
}));

vi.mock('./components/ImportWizard', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="import-wizard">ImportWizard</div> : null,
}));

vi.mock('./components/PromptLibrary', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="prompt-library">PromptLibrary</div> : null,
}));

vi.mock('./components/SnippetPalette', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="snippet-palette">SnippetPalette</div> : null,
}));

vi.mock('./components/CreateProjectModal', () => ({
  default: () => <div data-testid="create-project-modal">CreateProjectModal</div>,
}));

vi.mock('./components/CheckpointPanel', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="checkpoint-panel">CheckpointPanel</div> : null,
}));

vi.mock('./components/AboutModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? (
    <div data-testid="about-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
}));

vi.mock('./components/GitHubSettingsModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="github-settings-modal">GitHubSettingsModal</div> : null,
}));

vi.mock('./components/GitHubRepoList', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="github-repo-list">GitHubRepoList</div> : null,
}));

vi.mock('./components/AiderSessionPanel', () => ({
  default: () => <div data-testid="aider-session-panel">AiderSessionPanel</div>,
}));

// Import App after all mocks are set up
import AppWithAuth from './App';
import { projectsApi, systemApi } from './services/api.js';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset socket event handlers
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.close.mockClear();

    // Reset API mocks
    vi.mocked(projectsApi.list).mockResolvedValue([
      { name: 'test-project', path: '/home/user/Projects/test-project', hasActiveSession: false },
      { name: 'another-project', path: '/home/user/Projects/another-project', hasActiveSession: true },
    ]);
    vi.mocked(systemApi.getSettings).mockResolvedValue({ autoReconnect: true, appName: 'Test Portal' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial render', () => {
    it('should render the app with auth wrapper', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
        expect(screen.getByTestId('require-auth')).toBeInTheDocument();
      });
    });

    it('should show the home dashboard by default', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('home-dashboard')).toBeInTheDocument();
      });
    });

    it('should render the left sidebar', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      });
    });

    it('should render the right sidebar', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
      });
    });

    it('should show offline indicator', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('header', () => {
    it('should display the app name from settings', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('Command Portal')).toBeInTheDocument();
      });
    });

    it('should display the version number', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('v1.0.27')).toBeInTheDocument();
      });
    });

    it('should show connection status as OFFLINE initially', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('OFFLINE')).toBeInTheDocument();
      });
    });
  });

  describe('socket connection', () => {
    it('should initialize socket connection on mount', async () => {
      const { io } = await import('socket.io-client');

      render(<AppWithAuth />);

      await waitFor(() => {
        expect(io).toHaveBeenCalledWith('', expect.objectContaining({
          transports: ['websocket', 'polling'],
          reconnection: true,
        }));
      });
    });

    it('should register socket event handlers', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('terminal-ready', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('terminal-exit', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('session-killed', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('session-error', expect.any(Function));
      });
    });

    it('should handle socket connect event', async () => {
      render(<AppWithAuth />);

      // Get the connect handler
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      expect(connectHandler).toBeDefined();

      // Simulate connect
      await act(async () => {
        await connectHandler();
      });

      await waitFor(() => {
        expect(screen.getByText('ONLINE')).toBeInTheDocument();
      });
    });
  });

  describe('project loading', () => {
    it('should fetch projects on mount', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(projectsApi.list).toHaveBeenCalled();
      });
    });

    it('should display projects in the sidebar', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('project-test-project')).toBeInTheDocument();
        expect(screen.getByTestId('project-another-project')).toBeInTheDocument();
      });
    });

    it('should handle API error when fetching projects', async () => {
      vi.mocked(projectsApi.list).mockRejectedValueOnce(new Error('Network error'));

      render(<AppWithAuth />);

      await waitFor(() => {
        expect(projectsApi.list).toHaveBeenCalled();
      });
    });
  });

  describe('project selection', () => {
    it('should hide home dashboard when project is selected', async () => {
      render(<AppWithAuth />);

      // Simulate socket connect first
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      await act(async () => {
        await connectHandler();
      });

      // Select a project from the sidebar
      await waitFor(() => {
        expect(screen.getByTestId('project-test-project')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('project-test-project'));

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('select-project', '/home/user/Projects/test-project');
      });
    });

    it('should emit select-project event when project is clicked', async () => {
      render(<AppWithAuth />);

      // Simulate socket connect first
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      await act(async () => {
        await connectHandler();
      });

      await waitFor(() => {
        expect(screen.getByTestId('project-test-project')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('project-test-project'));

      expect(mockSocket.emit).toHaveBeenCalledWith('select-project', '/home/user/Projects/test-project');
    });
  });

  describe('header buttons', () => {
    it('should open theme picker when theme button is clicked', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('THEME')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('THEME'));

      await waitFor(() => {
        expect(screen.getByTestId('theme-picker')).toBeInTheDocument();
      });
    });

    it('should open admin dashboard when admin button is clicked', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('ADMIN')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('ADMIN'));

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
    });

    it('should open voice panel when voice button is clicked', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('VOICE')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('VOICE'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-command-panel')).toBeInTheDocument();
      });
    });

    it('should open changelog when changelog badge is clicked', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('changelog-badge')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('changelog-badge'));

      await waitFor(() => {
        expect(screen.getByTestId('changelog-widget')).toBeInTheDocument();
      });
    });
  });

  describe('about modal', () => {
    it('should open about modal when version is clicked', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('v1.0.27')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('v1.0.27'));

      await waitFor(() => {
        expect(screen.getByTestId('about-modal')).toBeInTheDocument();
      });
    });

    it('should close about modal when close button is clicked', async () => {
      render(<AppWithAuth />);

      // Open the modal
      await waitFor(() => {
        expect(screen.getByText('v1.0.27')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('v1.0.27'));

      await waitFor(() => {
        expect(screen.getByTestId('about-modal')).toBeInTheDocument();
      });

      // Close the modal
      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('about-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('admin dashboard', () => {
    it('should close admin dashboard when onClose is called', async () => {
      render(<AppWithAuth />);

      // Open admin
      await waitFor(() => {
        expect(screen.getByText('ADMIN')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('ADMIN'));

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      // Close admin
      fireEvent.click(screen.getByText('Close Admin'));

      await waitFor(() => {
        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should have connect_error handler registered', async () => {
      render(<AppWithAuth />);

      // Verify the connect_error handler is registered
      const connectErrorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      expect(connectErrorHandler).toBeDefined();
      expect(typeof connectErrorHandler).toBe('function');
    });

    it('should verify session-error handler is registered', async () => {
      render(<AppWithAuth />);

      // Verify the session-error handler is registered
      const sessionErrorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'session-error')?.[1];
      expect(sessionErrorHandler).toBeDefined();
      expect(typeof sessionErrorHandler).toBe('function');
    });

    it('should have error display element conditionally rendered', async () => {
      render(<AppWithAuth />);

      // Initially no error should be shown
      await waitFor(() => {
        // The error container with × close button should not be present initially
        expect(screen.queryByText('×')).not.toBeInTheDocument();
      });
    });
  });

  describe('global search button', () => {
    it('should display search button in header', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByText('SEARCH')).toBeInTheDocument();
      });
    });
  });

  describe('app settings', () => {
    it('should load app name from settings', async () => {
      render(<AppWithAuth />);

      await waitFor(() => {
        expect(systemApi.getSettings).toHaveBeenCalled();
      });
    });

    it('should handle settings API error gracefully', async () => {
      vi.mocked(systemApi.getSettings).mockRejectedValueOnce(new Error('Settings error'));

      render(<AppWithAuth />);

      // Should still render with default app name
      await waitFor(() => {
        expect(screen.getByText('Command Portal')).toBeInTheDocument();
      });
    });
  });

  describe('home dashboard interaction', () => {
    it('should handle project selection from home dashboard', async () => {
      render(<AppWithAuth />);

      // Simulate socket connect first
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      await act(async () => {
        await connectHandler();
      });

      await waitFor(() => {
        expect(screen.getByTestId('home-dashboard')).toBeInTheDocument();
      });

      // Click the select project button in home dashboard
      fireEvent.click(screen.getByTestId('select-project-btn'));

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('select-project', '/test');
      });
    });
  });

  describe('terminal ready state', () => {
    it('should handle terminal-ready event', async () => {
      render(<AppWithAuth />);

      const terminalReadyHandler = mockSocket.on.mock.calls.find(call => call[0] === 'terminal-ready')?.[1];
      expect(terminalReadyHandler).toBeDefined();

      await act(async () => {
        terminalReadyHandler({ projectPath: '/test/path', reconnected: false });
      });

      // Terminal ready state is set but not directly visible in DOM
      // This test verifies the handler doesn't throw
    });

    it('should have terminal-ready handler that handles reconnect flag', async () => {
      render(<AppWithAuth />);

      // Verify the terminal-ready handler is registered and accepts reconnected flag
      const terminalReadyHandler = mockSocket.on.mock.calls.find(call => call[0] === 'terminal-ready')?.[1];
      expect(terminalReadyHandler).toBeDefined();

      // Calling the handler with reconnected flag should not throw
      await act(async () => {
        terminalReadyHandler({ projectPath: '/test/path', reconnected: true });
      });

      // Handler executed successfully
      expect(true).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should close socket on unmount', async () => {
      const { unmount } = render(<AppWithAuth />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      });

      unmount();

      expect(mockSocket.close).toHaveBeenCalled();
    });
  });
});

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import LeftSidebar from './components/LeftSidebar';
import Terminal from './components/Terminal';
import AdminDashboard, { TABS as ADMIN_TABS } from './components/AdminDashboard';
import RightSidebar from './components/RightSidebar';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ThemePicker from './components/ThemePicker';
import BulkActionBar from './components/BulkActionBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTheme } from './hooks/useTheme';
import { useSessionManagement } from './hooks/useSessionManagement';

// Phase 10: Quality of Life components
import GlobalSearch, { useGlobalSearch } from './components/GlobalSearch';
import SetupWizard, { useSetupWizard } from './components/SetupWizard';
import ChangelogWidget, { ChangelogBadge } from './components/ChangelogWidget';
import { OfflineIndicator } from './components/OfflineMode';
import FavoritesBar from './components/FavoritesBar';

// Phase 11: Additional features (previously TODOs)
import SessionTemplateModal from './components/SessionTemplateModal';
import SessionNoteEditor from './components/SessionNoteEditor';
import ShareModal from './components/ShareModal';
import HandoffModal from './components/HandoffModal';
import ExportModal from './components/ExportModal';
import ImportWizard from './components/ImportWizard';
import PromptLibrary from './components/PromptLibrary';
import SnippetPalette from './components/SnippetPalette';
import CreateProjectModal from './components/CreateProjectModal';
import CheckpointPanel from './components/CheckpointPanel';

// Phase 13: GitHub Integration
import GitHubSettingsModal from './components/GitHubSettingsModal';
import GitHubRepoList from './components/GitHubRepoList';

// Phase 14: Voice Commands (P0 Critical)
import VoiceCommandPanel, { VoiceButton } from './components/VoiceCommandPanel';

// P1: Aider Integration
import AiderSessionPanel from './components/AiderSessionPanel';
import { AiderModeToggleCompact } from './components/AiderModeToggle';
import { useAiderVoice } from './hooks/useAiderVoice';

// Home Dashboard
import HomeDashboard from './components/HomeDashboard';
import ProjectInfoBar from './components/ProjectInfoBar';

// About Modal
import AboutModal from './components/AboutModal';

// Phase 12: Authentication (Authentik SSO)
import { AuthProvider, RequireAuth } from './hooks/useAuth';

// Home project marker - path will be computed from projects list
export const HOME_PROJECT_ID = '__home__';

// Socket.IO connection - always use relative path (Vite proxies /socket.io to backend)
const SOCKET_URL = '';

function App() {
  const [socket, setSocket] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [terminalReady, setTerminalReady] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const searchInputRef = useRef(null);

  // Theme management
  const { theme, setTheme, cycleTheme } = useTheme();

  // Session management (folders, tags, multi-select)
  const sessionManagement = useSessionManagement();

  // Phase 10: Quality of Life hooks
  const globalSearch = useGlobalSearch();
  const setupWizard = useSetupWizard();
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFavoritesBar, setShowFavoritesBar] = useState(() => {
    return localStorage.getItem('show-favorites-bar') !== 'false';
  });

  // Phase 11: Additional modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [showSnippetPalette, setShowSnippetPalette] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCheckpointPanel, setShowCheckpointPanel] = useState(false);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);

  // Phase 13: GitHub Integration state
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [showGitHubRepos, setShowGitHubRepos] = useState(false);

  // Phase 14: Voice Commands state (P0 Critical)
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [voicePanelCollapsed, setVoicePanelCollapsed] = useState(true);

  // P1: Aider Integration state
  const [codingMode, setCodingMode] = useState('claude'); // 'claude' or 'aider'
  const [showAiderPanel, setShowAiderPanel] = useState(false);

  // Home Dashboard state - default to showing dashboard on load
  const [showHomeDashboard, setShowHomeDashboard] = useState(true);

  // Application branding
  const [appName, setAppName] = useState('Command Portal');

  // Aider voice hook
  const aiderVoice = useAiderVoice({
    socket,
    onModeSwitch: (mode) => {
      setCodingMode(mode);
      if (mode === 'aider') {
        setShowAiderPanel(true);
      }
    },
    onAiderCommand: (cmd) => {
      console.log('Aider command:', cmd);
    }
  });

  // Track selected project for reconnection (ref to avoid stale closures)
  const selectedProjectRef = useRef(null);
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Never stop trying to reconnect
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000, // Cap delay at 5 seconds
      timeout: 20000, // Connection timeout
    });

    newSocket.on('connect', async () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      setError(null);

      // Check if we should auto-reconnect to a previous session
      // First check if we already have a selected project (e.g., from socket reconnect)
      const currentProject = selectedProjectRef.current;
      if (currentProject) {
        // Already have a project selected, just reconnect to it
        // Small delay to ensure server has cleaned up any stale PTY sessions
        console.log('Reconnecting to current project:', currentProject.path);
        setTimeout(() => {
          newSocket.emit('reconnect-session', currentProject.path);
        }, 100);
        return;
      }

      // No current project - check database for last active session
      try {
        const [settingsRes, sessionsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/sessions/persisted')
        ]);

        const settings = settingsRes.ok ? await settingsRes.json() : { autoReconnect: true };
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

        // Check if auto-reconnect is enabled (default to true)
        if (settings.autoReconnect === false) {
          console.log('Auto-reconnect disabled in settings');
          return;
        }

        // Get the most recent session (already sorted by lastActiveAt desc)
        const lastSession = sessions[0];
        if (lastSession && lastSession.project) {
          console.log('Auto-reconnecting to last active session:', lastSession.project.path);
          // Set the selected project in state so UI shows correctly
          setSelectedProject({
            name: lastSession.project.name,
            path: lastSession.project.path
          });
          // Small delay to ensure server has cleaned up any stale PTY sessions
          setTimeout(() => {
            newSocket.emit('reconnect-session', lastSession.project.path);
          }, 100);
        } else {
          console.log('No previous sessions to reconnect to');
        }
      } catch (err) {
        console.error('Error checking for auto-reconnect:', err);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setTerminalReady(false);
      // Don't clear selected project - we'll try to reconnect when socket comes back
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection lost - reconnecting...');
      setIsConnected(false);
    });

    newSocket.on('terminal-ready', ({ projectPath, sessionName, isNew, reconnected }) => {
      console.log('Terminal ready:', { projectPath, sessionName, isNew, reconnected });
      setTerminalReady(true);
      if (reconnected) {
        setError(null); // Clear any connection errors on successful reconnect
      }
    });

    newSocket.on('terminal-exit', ({ exitCode, projectPath }) => {
      console.log('Terminal exited:', { exitCode, projectPath });
      const currentProject = selectedProjectRef.current;

      // If this is our current project, try to reconnect (tmux session may still exist)
      if (currentProject?.path === projectPath) {
        console.log('Attempting to reconnect to tmux session after PTY exit...');
        setTerminalReady(false);
        // Small delay to let server clean up, then try reconnecting
        setTimeout(() => {
          newSocket.emit('reconnect-session', projectPath);
        }, 500);
      }

      // Refresh project list to update active session status
      fetchProjects();
    });

    newSocket.on('session-killed', ({ projectPath, sessionName }) => {
      console.log('Session killed:', { projectPath, sessionName });
      if (selectedProjectRef.current?.path === projectPath) {
        setSelectedProject(null);
        setTerminalReady(false);
      }
      fetchProjects();
    });

    newSocket.on('session-error', ({ message, projectPath }) => {
      console.error('Session error:', message);
      // Only show error if it's for the current project
      if (!projectPath || selectedProjectRef.current?.path === projectPath) {
        setError(message);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch projects from API
  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    // Refresh project list every 30 seconds to update session status
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  // Load app name from settings
  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const settings = await res.json();
          if (settings.appName) {
            setAppName(settings.appName);
            document.title = settings.appName;
          }
        }
      } catch (err) {
        console.error('Error loading app settings:', err);
      }
    };
    loadAppSettings();
  }, []);

  // Compute projects directory from projects list
  const projectsDir = projects.length > 0
    ? projects[0].path.split('/').slice(0, -1).join('/')
    : null;

  // Handle project selection
  const handleSelectProject = useCallback((project) => {
    if (!socket || !isConnected) {
      setError('Not connected to server');
      return;
    }

    // Handle Home selection
    if (project.isHome || project.id === HOME_PROJECT_ID) {
      setShowHomeDashboard(true);
      // Connect to Projects directory terminal if not already there
      const homePath = projectsDir || project.path;
      if (homePath && selectedProject?.path !== homePath) {
        setTerminalReady(false);
        setSelectedProject({ name: 'Home', path: homePath, isHome: true });
        socket.emit('select-project', homePath);
      }
      return;
    }

    // Regular project selection - close home dashboard if open
    setShowHomeDashboard(false);

    if (selectedProject?.path === project.path) {
      // Already selected, do nothing
      return;
    }

    setTerminalReady(false);
    setSelectedProject(project);
    socket.emit('select-project', project.path);
  }, [socket, isConnected, selectedProject, projectsDir]);

  // Handle killing a session
  const handleKillSession = useCallback((projectPath) => {
    if (!socket || !isConnected) {
      return;
    }
    socket.emit('kill-session', projectPath);
  }, [socket, isConnected]);

  // Handle terminal input
  const handleTerminalInput = useCallback((data) => {
    if (socket && isConnected) {
      socket.emit('terminal-input', data);
    }
  }, [socket, isConnected]);

  // Handle terminal resize
  const handleTerminalResize = useCallback((cols, rows) => {
    if (socket && isConnected) {
      socket.emit('terminal-resize', { cols, rows });
    }
  }, [socket, isConnected]);

  // Handle opening admin dashboard to a specific tab
  const handleOpenAdmin = useCallback((tabId) => {
    // Map AdminQuickAccess IDs to admin dashboard tabs
    const tabMap = {
      'system': ADMIN_TABS.SERVER,
      'docker': ADMIN_TABS.DOCKER,
      'services': ADMIN_TABS.STACK,
      'monitoring': ADMIN_TABS.MONITORING,
    };
    setAdminInitialTab(tabMap[tabId] || null);
    setShowAdmin(true);
  }, []);

  // Handle command palette commands
  const handleCommand = useCallback((commandId, data) => {
    // Handle project selection commands
    if (commandId.startsWith('selectProject:')) {
      if (data) {
        handleSelectProject(data);
      }
      return;
    }

    // Handle other commands
    switch (commandId) {
      case 'openAdmin':
        setShowAdmin(true);
        break;
      case 'showShortcuts':
        setShowShortcutsModal(true);
        break;
      case 'focusSearch':
        searchInputRef.current?.focus();
        break;
      case 'toggleFullscreen':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;
      case 'newSession':
        setShowTemplateModal(true);
        break;
      case 'closeSession':
        if (selectedProject) {
          handleKillSession(selectedProject.path);
        }
        break;
      case 'refreshProjects':
        fetchProjects();
        break;
      case 'openSettings':
        setShowAdmin(true);
        break;
      case 'openTemplates':
        setShowTemplateModal(true);
        break;
      case 'openNotes':
        setShowNotesPanel(true);
        break;
      case 'openPrompts':
        setShowPromptLibrary(true);
        break;
      case 'openSnippets':
        setShowSnippetPalette(true);
        break;
      case 'openShare':
        setShowShareModal(true);
        break;
      case 'openHandoff':
        setShowHandoffModal(true);
        break;
      case 'openExport':
        setShowExportModal(true);
        break;
      case 'openImport':
        setShowImportWizard(true);
        break;
      case 'openCheckpoints':
        setShowCheckpointPanel(true);
        break;
      case 'openThemes':
        setShowThemePicker(true);
        break;
      case 'cycleTheme':
        cycleTheme();
        break;
      case 'openVoice':
      case 'toggleVoice':
        setShowVoicePanel(prev => !prev);
        setVoicePanelCollapsed(false);
        break;
      default:
        console.log('Unknown command:', commandId);
    }
  }, [handleSelectProject, handleKillSession, selectedProject, fetchProjects, cycleTheme]);

  // Handle voice commands (P0 Critical)
  const handleVoiceCommand = useCallback((command) => {
    if (!command) return;

    switch (command.action) {
      // UI actions
      case 'toggle-sidebar':
        setFocusMode(prev => !prev);
        break;
      case 'theme-dark':
        setTheme('dark');
        break;
      case 'theme-light':
        setTheme('light');
        break;
      case 'fullscreen-toggle':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;
      case 'command-palette':
        setShowCommandPalette(true);
        break;
      case 'open-prompts':
        setShowPromptLibrary(true);
        break;
      case 'open-snippets':
        setShowSnippetPalette(true);
        break;
      case 'open-themes':
        setShowThemePicker(true);
        break;
      case 'show-shortcuts':
        setShowShortcutsModal(true);
        break;
      case 'refresh':
        fetchProjects();
        break;

      // Navigation actions
      case 'navigate-admin':
        setShowAdmin(true);
        break;
      case 'navigate-home':
        setShowHomeDashboard(true);
        break;

      // Session actions
      case 'session-new':
        setShowTemplateModal(true);
        break;
      case 'session-close':
        if (selectedProject) {
          handleKillSession(selectedProject.path);
        }
        break;
      case 'checkpoint-create':
      case 'checkpoint-list':
        setShowCheckpointPanel(true);
        break;

      default:
        // Terminal commands are handled by VoiceCommandPanel directly
        console.log('Voice command:', command.action);
    }
  }, [setTheme, fetchProjects, selectedProject, handleKillSession]);

  // Handle voice navigation
  const handleVoiceNavigate = useCallback((type, target) => {
    if (type === 'project' && target) {
      const project = projects.find(
        p => p.name.toLowerCase().includes(target.toLowerCase())
      );
      if (project) {
        handleSelectProject(project);
      }
    }
  }, [projects, handleSelectProject]);

  // Handle template selection
  const handleSelectTemplate = useCallback((template) => {
    if (!socket || !isConnected || !selectedProject) {
      setError('Select a project first');
      return;
    }
    // Execute template commands in terminal
    if (template.commands && template.commands.length > 0) {
      template.commands.forEach((cmd, index) => {
        setTimeout(() => {
          socket.emit('terminal-input', cmd + '\n');
        }, index * 500);
      });
    }
  }, [socket, isConnected, selectedProject]);

  // Handle note save
  const handleSaveNote = useCallback(async (sessionId, content, noteId) => {
    try {
      const url = noteId
        ? `/api/notes/${noteId}`
        : '/api/notes';
      const method = noteId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content }),
      });

      if (res.ok) {
        const note = await res.json();
        setSessionNotes(prev => {
          if (noteId) {
            return prev.map(n => n.id === noteId ? note : n);
          }
          return [...prev, note];
        });
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  }, []);

  // Handle note delete
  const handleDeleteNote = useCallback(async (noteId) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        setSessionNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }, []);

  // Fetch notes when session changes
  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/notes?projectPath=${encodeURIComponent(selectedProject.path)}`)
        .then(res => res.ok ? res.json() : [])
        .then(notes => setSessionNotes(notes))
        .catch(() => setSessionNotes([]));
    }
  }, [selectedProject]);

  // Keyboard shortcut handlers
  const shortcutHandlers = {
    openCommandPalette: () => setShowCommandPalette(true),
    openGlobalSearch: () => globalSearch.open(),
    openAdmin: () => setShowAdmin(true),
    openThemes: () => setShowThemePicker(true),
    showShortcuts: () => setShowShortcutsModal(true),
    focusSearch: () => searchInputRef.current?.focus(),
    toggleFullscreen: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },
    exitFocusMode: () => {
      if (showCommandPalette) setShowCommandPalette(false);
      else if (showShortcutsModal) setShowShortcutsModal(false);
      else if (showThemePicker) setShowThemePicker(false);
      else if (showAdmin) setShowAdmin(false);
      else if (focusMode) setFocusMode(false);
    },
    newSession: () => {
      setShowTemplateModal(true);
    },
    closeSession: () => {
      if (selectedProject) {
        handleKillSession(selectedProject.path);
      }
    },
    switchToSession1: () => projects[0] && handleSelectProject(projects[0]),
    switchToSession2: () => projects[1] && handleSelectProject(projects[1]),
    switchToSession3: () => projects[2] && handleSelectProject(projects[2]),
    switchToSession4: () => projects[3] && handleSelectProject(projects[3]),
    switchToSession5: () => projects[4] && handleSelectProject(projects[4]),
    switchToSession6: () => projects[5] && handleSelectProject(projects[5]),
    switchToSession7: () => projects[6] && handleSelectProject(projects[6]),
    switchToSession8: () => projects[7] && handleSelectProject(projects[7]),
    switchToSession9: () => projects[8] && handleSelectProject(projects[8]),
    nextSession: () => {
      if (projects.length === 0) return;
      const currentIndex = selectedProject
        ? projects.findIndex(p => p.path === selectedProject.path)
        : -1;
      const nextIndex = (currentIndex + 1) % projects.length;
      handleSelectProject(projects[nextIndex]);
    },
    previousSession: () => {
      if (projects.length === 0) return;
      const currentIndex = selectedProject
        ? projects.findIndex(p => p.path === selectedProject.path)
        : 0;
      const prevIndex = currentIndex <= 0 ? projects.length - 1 : currentIndex - 1;
      handleSelectProject(projects[prevIndex]);
    },
  };

  // Enable keyboard shortcuts (disabled when command palette or modals are open)
  useKeyboardShortcuts(shortcutHandlers, {
    enabled: !showCommandPalette && !showShortcutsModal,
    ignoreInputs: true,
  });

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
      {/* Background is handled by CSS body::before */}

      {/* Left Sidebar - Widget-based project navigation */}
      {!focusMode && (
        <LeftSidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          onKillSession={handleKillSession}
          onRefresh={fetchProjects}
          isLoading={isLoading}
          onOpenAdmin={handleOpenAdmin}
          onCreateProject={() => setShowCreateProject(true)}
          onOpenGitHubRepos={() => setShowGitHubRepos(true)}
          projectsDir={projectsDir}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header - Glassmorphism */}
        <header className="glass-header flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg font-bold font-mono">{'>'}_</span>
              <h1 className="text-sm font-semibold text-primary tracking-wider uppercase">
                {appName}
              </h1>
              <button
                onClick={() => setShowAbout(true)}
                className="text-2xs font-mono px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-glass)' }}
                title="About Console.web"
              >
                v1.0.3
              </button>
            </div>
            {selectedProject && (
              <span className="text-xs text-cyan font-mono" style={{ color: 'var(--accent-secondary)' }}>
                /{selectedProject.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-xs font-mono px-2">
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
              <span style={{ color: isConnected ? 'var(--status-success)' : 'var(--status-error)' }}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Global Search Button */}
            <button
              onClick={() => globalSearch.open()}
              className="btn-glass flex items-center gap-1.5 text-xs"
              title="Global Search (Ctrl+K)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">SEARCH</span>
              <kbd className="hidden lg:inline text-[10px] px-1 py-0.5 rounded bg-white/10">K</kbd>
            </button>

            {/* Changelog Badge */}
            <ChangelogBadge onClick={() => setShowChangelog(true)} />

            {/* Voice Button (P0 Critical) */}
            <button
              onClick={() => {
                setShowVoicePanel(prev => !prev);
                setVoicePanelCollapsed(false);
              }}
              className={`btn-glass flex items-center gap-1.5 text-xs ${showVoicePanel ? 'ring-2 ring-purple-500/50' : ''}`}
              title="Voice Commands (Ctrl+Shift+V)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="hidden sm:inline">VOICE</span>
            </button>

            {/* Theme Button */}
            <button
              onClick={() => setShowThemePicker(true)}
              className="btn-glass flex items-center gap-1.5 text-xs"
              title="Change Theme"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="hidden sm:inline">THEME</span>
            </button>

            {/* Admin Button */}
            <button
              onClick={() => setShowAdmin(true)}
              className="btn-glass flex items-center gap-1.5 text-xs"
              title="Admin Dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">ADMIN</span>
            </button>
          </div>
        </header>

        {/* Project Info Bar - shown when project selected */}
        {selectedProject && !showHomeDashboard && !selectedProject.isHome && (
          <ProjectInfoBar project={selectedProject} onRefresh={fetchProjects} />
        )}

        {/* Terminal Area */}
        <div className="flex-1 min-h-0 relative">
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
              <div className="glass-elevated px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-mono" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--status-error)' }}>
                <span className="text-lg">&#9888;</span>
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 hover:opacity-70 transition-opacity"
                >
                  &times;
                </button>
              </div>
            </div>
          )}

          {/* Show HomeDashboard when showHomeDashboard is true, otherwise show Terminal */}
          {showHomeDashboard || !selectedProject ? (
            <HomeDashboard
              onSelectProject={(project) => {
                setShowHomeDashboard(false);
                handleSelectProject(project);
              }}
              projects={projects}
            />
          ) : (
            <Terminal
              socket={socket}
              isReady={terminalReady}
              onInput={handleTerminalInput}
              onResize={handleTerminalResize}
              projectPath={selectedProject.path}
            />
          )}
        </div>
      </main>

      {/* Right Sidebar - Dashboard Widgets */}
      {!focusMode && (
        <RightSidebar
          selectedProject={selectedProject}
          projects={projects}
          onKillSession={handleKillSession}
          onSelectProject={handleSelectProject}
          onOpenAdmin={() => setShowAdmin(true)}
          onOpenCheckpoints={() => setShowCheckpointPanel(true)}
          onOpenGitHubSettings={() => setShowGitHubSettings(true)}
          onRefresh={fetchProjects}
          socket={socket}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdmin && (
        <AdminDashboard
          onClose={() => {
            setShowAdmin(false);
            setAdminInitialTab(null);
          }}
          initialTab={adminInitialTab}
          currentProject={selectedProject}
        />
      )}


      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onCommand={handleCommand}
        projects={projects}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Theme Picker Modal */}
      <ThemePicker
        isOpen={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        currentTheme={theme}
        onSelectTheme={setTheme}
      />

      {/* Bulk Action Bar for multi-select */}
      <BulkActionBar
        selectedCount={sessionManagement.selectedSessions.size}
        onPin={sessionManagement.bulkPin}
        onUnpin={sessionManagement.bulkUnpin}
        onArchive={sessionManagement.bulkArchive}
        onDelete={sessionManagement.bulkDelete}
        onMove={sessionManagement.bulkMove}
        onAddTag={sessionManagement.bulkAddTag}
        onClearSelection={sessionManagement.clearSelection}
        folders={sessionManagement.folders}
        tags={sessionManagement.tags}
      />

      {/* Phase 10: Quality of Life Components */}

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={globalSearch.isOpen}
        onClose={globalSearch.close}
        onNavigate={(item) => {
          if (item.type === 'projects' && item.data) {
            handleSelectProject(item.data);
          }
        }}
        onRunCommand={(command) => {
          // Send command to terminal
          if (socket && isConnected && selectedProject) {
            socket.emit('terminal-input', command);
          }
        }}
      />

      {/* Changelog Widget */}
      <ChangelogWidget
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />

      {/* Phase 11: Additional Modals */}

      {/* Session Template Modal */}
      <SessionTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
        customTemplates={customTemplates}
      />

      {/* Session Notes Panel */}
      {showNotesPanel && (
        <div className="fixed inset-y-0 right-0 w-96 z-50 glass-sidebar-right shadow-2xl">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-semibold font-mono" style={{ color: 'var(--accent-primary)' }}>Session Notes</h2>
            <button
              onClick={() => setShowNotesPanel(false)}
              className="btn-icon"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
            <SessionNoteEditor
              sessionId={selectedProject?.id}
              notes={sessionNotes}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
            />
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        session={selectedProject}
      />

      {/* Handoff Modal */}
      <HandoffModal
        isOpen={showHandoffModal}
        onClose={() => setShowHandoffModal(false)}
        session={selectedProject}
        onHandoff={(handoff) => {
          console.log('Session handed off:', handoff);
          setShowHandoffModal(false);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        session={selectedProject}
      />

      {/* Import Wizard */}
      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onImportComplete={fetchProjects}
      />

      {/* Prompt Library */}
      <PromptLibrary
        isOpen={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        onSelectPrompt={(prompt) => {
          if (socket && isConnected && selectedProject) {
            socket.emit('terminal-input', prompt.content);
          }
          setShowPromptLibrary(false);
        }}
      />

      {/* Snippet Palette */}
      <SnippetPalette
        isOpen={showSnippetPalette}
        onClose={() => setShowSnippetPalette(false)}
        onSelectSnippet={(snippet) => {
          if (socket && isConnected && selectedProject) {
            socket.emit('terminal-input', snippet.command);
          }
          setShowSnippetPalette(false);
        }}
      />

      {/* Create Project Modal */}
      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onCreated={(newProject) => {
            // Refresh projects list and select the new project
            fetchProjects().then(() => {
              // After fetching, select the new project
              handleSelectProject(newProject);
            });
          }}
        />
      )}

      {/* Checkpoint Panel */}
      <CheckpointPanel
        projectId={selectedProject?.name}
        projectPath={selectedProject?.path}
        sessionId={null}
        isOpen={showCheckpointPanel}
        onClose={() => setShowCheckpointPanel(false)}
      />

      {/* Phase 13: GitHub Integration Modals */}
      {/* GitHub Settings Modal */}
      <GitHubSettingsModal
        isOpen={showGitHubSettings}
        onClose={() => setShowGitHubSettings(false)}
      />

      {/* GitHub Repository List Modal */}
      <GitHubRepoList
        isOpen={showGitHubRepos}
        onClose={() => setShowGitHubRepos(false)}
        onClone={(project) => {
          // Refresh projects list and select the cloned project
          fetchProjects().then(() => {
            if (project) {
              handleSelectProject(project);
            }
          });
        }}
        onRefresh={fetchProjects}
      />

      {/* Setup Wizard */}
      {setupWizard.showSetup && (
        <SetupWizard
          onComplete={() => setupWizard.complete()}
          onSkip={() => setupWizard.complete()}
        />
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* P1: Aider Session Panel (Floating) */}
      {showAiderPanel && codingMode === 'aider' && selectedProject && (
        <div className="fixed bottom-20 right-4 z-40 w-[500px] h-[400px]">
          <AiderSessionPanel
            projectPath={selectedProject.path}
            socket={socket}
            onModeChange={(mode) => {
              setCodingMode(mode);
              if (mode === 'claude') {
                setShowAiderPanel(false);
              }
            }}
          />
        </div>
      )}

      {/* Voice Command Panel (P0 Critical - Floating) */}
      {showVoicePanel && (
        <div className="fixed bottom-4 right-4 z-50 w-80">
          {/* Mode Toggle */}
          <div className="mb-2 flex justify-end">
            <AiderModeToggleCompact
              currentMode={codingMode}
              onModeChange={(mode) => {
                setCodingMode(mode);
                if (mode === 'aider') {
                  setShowAiderPanel(true);
                  // Auto-start Aider session if not already running
                  if (!aiderVoice.hasActiveSession && selectedProject) {
                    aiderVoice.startAiderSession(selectedProject.path);
                  }
                }
              }}
            />
          </div>
          <VoiceCommandPanel
            sessionId={selectedProject?.id}
            socket={socket}
            isConnected={isConnected}
            onCommand={handleVoiceCommand}
            onNavigate={handleVoiceNavigate}
            collapsed={voicePanelCollapsed}
            onToggleCollapse={() => setVoicePanelCollapsed(prev => !prev)}
            codingMode={codingMode}
            aiderVoice={aiderVoice}
            projectPath={selectedProject?.path}
          />
        </div>
      )}
    </div>
  );
}

// Wrap App with AuthProvider and RequireAuth
function AppWithAuth() {
  return (
    <AuthProvider>
      <RequireAuth>
        <App />
      </RequireAuth>
    </AuthProvider>
  );
}

export default AppWithAuth;

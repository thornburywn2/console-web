import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
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
import OnboardingTour, { useOnboarding } from './components/OnboardingTour';
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

// Phase 12: Authentication (Authentik SSO)
import { AuthProvider, RequireAuth } from './hooks/useAuth';

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
  const onboarding = useOnboarding();
  const [showChangelog, setShowChangelog] = useState(false);
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

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to server');
      setIsConnected(false);
    });

    newSocket.on('terminal-ready', ({ projectPath, sessionName, isNew }) => {
      console.log('Terminal ready:', { projectPath, sessionName, isNew });
      setTerminalReady(true);
    });

    newSocket.on('terminal-exit', ({ exitCode, projectPath }) => {
      console.log('Terminal exited:', { exitCode, projectPath });
      // Refresh project list to update active session status
      fetchProjects();
    });

    newSocket.on('session-killed', ({ projectPath, sessionName }) => {
      console.log('Session killed:', { projectPath, sessionName });
      if (selectedProject?.path === projectPath) {
        setSelectedProject(null);
        setTerminalReady(false);
      }
      fetchProjects();
    });

    newSocket.on('session-error', ({ message, projectPath }) => {
      console.error('Session error:', message);
      setError(message);
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

  // Handle project selection
  const handleSelectProject = useCallback((project) => {
    if (!socket || !isConnected) {
      setError('Not connected to server');
      return;
    }

    if (selectedProject?.path === project.path) {
      // Already selected, do nothing
      return;
    }

    setTerminalReady(false);
    setSelectedProject(project);
    socket.emit('select-project', project.path);
  }, [socket, isConnected, selectedProject]);

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
      default:
        console.log('Unknown command:', commandId);
    }
  }, [handleSelectProject, handleKillSession, selectedProject, fetchProjects, cycleTheme]);

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
  };

  // Enable keyboard shortcuts (disabled when command palette or modals are open)
  useKeyboardShortcuts(shortcutHandlers, {
    enabled: !showCommandPalette && !showShortcutsModal,
    ignoreInputs: true,
  });

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
      {/* Background is handled by CSS body::before */}

      {/* Sidebar */}
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onKillSession={handleKillSession}
        onRefresh={fetchProjects}
        isLoading={isLoading}
        searchInputRef={searchInputRef}
        sessionManagement={sessionManagement}
        onOpenAdmin={handleOpenAdmin}
        onCreateProject={() => setShowCreateProject(true)}
        onOpenGitHubRepos={() => setShowGitHubRepos(true)}
        socket={socket}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header - Glassmorphism */}
        <header className="glass-header flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg font-bold font-mono">{'>'}_</span>
              <h1 className="text-sm font-semibold text-primary tracking-wider">
                COMMAND PORTAL
              </h1>
              <span className="text-2xs font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'var(--bg-glass)' }}>v2.10.0</span>
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

          {!selectedProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="glass-elevated text-center p-8 rounded-xl max-w-md mx-4">
                <div className="text-6xl mb-4 opacity-50" style={{ color: 'var(--accent-primary)' }}>
                  <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold tracking-wider mb-3" style={{ color: 'var(--accent-primary)' }}>
                  SELECT PROJECT
                </h2>
                <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {'>'} Choose a project from the sidebar to initialize Claude session
                </p>
                <div className="mt-4 text-xs font-mono" style={{ color: 'var(--accent-secondary)' }}>
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
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

      {/* Admin Dashboard Modal */}
      {showAdmin && (
        <AdminDashboard
          onClose={() => {
            setShowAdmin(false);
            setAdminInitialTab(null);
          }}
          initialTab={adminInitialTab}
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
        projectId={selectedProject?.id}
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

      {/* Onboarding Tour */}
      {onboarding.shouldShow && (
        <OnboardingTour
          autoStart={true}
          onComplete={() => onboarding.complete()}
          onSkip={() => onboarding.complete()}
        />
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />
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

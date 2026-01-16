import { useState, useEffect, useMemo, useRef } from 'react';
import UserProfileSection from './UserProfileSection';
import { GitHubStatusDot } from './GitHubStatusBadge';

// Sort options
const SORT_OPTIONS = {
  RECENT: 'recent',
  NAME_ASC: 'name-asc',
  NAME_DESC: 'name-desc',
  ACTIVE: 'active',
  PINNED: 'pinned',
};

// LocalStorage keys
const LAST_ACCESSED_KEY = 'cw-last-accessed';
const SORT_PREF_KEY = 'cw-sort-preference';
const FAVORITES_KEY = 'cw-favorites';

// Get last accessed times from localStorage
const getLastAccessed = () => {
  try {
    const stored = localStorage.getItem(LAST_ACCESSED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save last accessed time for a project
const setLastAccessed = (projectPath) => {
  try {
    const current = getLastAccessed();
    current[projectPath] = Date.now();
    localStorage.setItem(LAST_ACCESSED_KEY, JSON.stringify(current));
  } catch {
    // Ignore localStorage errors
  }
};

// Get favorites from localStorage
const getFavorites = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save favorites to localStorage
const saveFavorites = (favorites) => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore localStorage errors
  }
};

function Sidebar({
  projects,
  selectedProject,
  onSelectProject,
  onKillSession,
  onRefresh,
  isLoading,
  searchInputRef,
  // Session management props
  sessionManagement,
  // Admin callback
  onOpenAdmin,
  // Create project callback
  onCreateProject,
  // GitHub callbacks
  onOpenGitHubRepos,
  // Socket for agents
  socket,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmKill, setConfirmKill] = useState(null);
  const [sortBy, setSortBy] = useState(() => {
    try {
      return localStorage.getItem(SORT_PREF_KEY) || SORT_OPTIONS.RECENT;
    } catch {
      return SORT_OPTIONS.RECENT;
    }
  });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [lastAccessed, setLastAccessedState] = useState(getLastAccessed);
  const [favorites, setFavorites] = useState(getFavorites);

  // Refs for scroll handling (prevent terminal from capturing wheel events)
  const asideRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isHoveringRef = useRef(false);

  // Track mouse enter/leave on the sidebar
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const handleMouseEnter = () => {
      isHoveringRef.current = true;
    };

    const handleMouseLeave = () => {
      isHoveringRef.current = false;
    };

    aside.addEventListener('mouseenter', handleMouseEnter);
    aside.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      aside.removeEventListener('mouseenter', handleMouseEnter);
      aside.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Handle wheel events at document level to intercept before xterm gets them
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleDocumentWheel = (e) => {
      // Only handle if mouse is over the sidebar
      if (!isHoveringRef.current) return;

      // Stop the event completely
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Manually scroll the container
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
        container.scrollTop = newScrollTop;
      }
    };

    // Add to document with capture phase - this runs BEFORE any other handlers
    document.addEventListener('wheel', handleDocumentWheel, { passive: false, capture: true });

    return () => {
      document.removeEventListener('wheel', handleDocumentWheel, { capture: true });
    };
  }, []);

  // Destructure session management props with defaults
  const {
    folders = [],
    selectedFolderId,
    setSelectedFolderId,
    createFolder,
    renameFolder,
    deleteFolder,
    selectedSessions = new Set(),
    isMultiSelectMode = false,
    toggleSessionSelect,
  } = sessionManagement || {};

  // Toggle favorite status for a project
  const toggleFavorite = (projectPath, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavorites = prev.includes(projectPath)
        ? prev.filter(p => p !== projectPath)
        : [...prev, projectPath];
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };

  // Update sort preference in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SORT_PREF_KEY, sortBy);
    } catch {
      // Ignore
    }
  }, [sortBy]);

  // Handle project selection - track last accessed
  const handleProjectSelect = (project) => {
    setLastAccessed(project.path);
    setLastAccessedState(getLastAccessed());
    onSelectProject(project);
  };

  // Sort and filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply sorting - pinned items first, then by sort criteria
    filtered.sort((a, b) => {
      // Pinned items always first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then apply selected sort
      switch (sortBy) {
        case SORT_OPTIONS.RECENT: {
          const aTime = lastAccessed[a.path] || 0;
          const bTime = lastAccessed[b.path] || 0;
          if (aTime && bTime) return bTime - aTime;
          if (aTime && !bTime) return -1;
          if (!aTime && bTime) return 1;
          const aModified = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          const bModified = b.lastModified ? new Date(b.lastModified).getTime() : 0;
          if (aModified || bModified) return bModified - aModified;
          return a.name.localeCompare(b.name);
        }
        case SORT_OPTIONS.NAME_ASC:
          return a.name.localeCompare(b.name);
        case SORT_OPTIONS.NAME_DESC:
          return b.name.localeCompare(a.name);
        case SORT_OPTIONS.ACTIVE:
          if (a.hasActiveSession && !b.hasActiveSession) return -1;
          if (!a.hasActiveSession && b.hasActiveSession) return 1;
          return a.name.localeCompare(b.name);
        case SORT_OPTIONS.PINNED:
          // Already sorted by pinned above
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchQuery, sortBy, lastAccessed]);

  // Split projects into favorites and regular
  const favoriteProjects = useMemo(() =>
    filteredProjects.filter(p => favorites.includes(p.path)),
    [filteredProjects, favorites]
  );

  const regularProjects = useMemo(() =>
    filteredProjects.filter(p => !favorites.includes(p.path)),
    [filteredProjects, favorites]
  );

  const handleKillClick = (e, project) => {
    e.stopPropagation();
    if (confirmKill === project.path) {
      onKillSession(project.path);
      setConfirmKill(null);
    } else {
      setConfirmKill(project.path);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmKill(null), 3000);
    }
  };

  return (
    <aside
      ref={asideRef}
      className="w-72 flex-shrink-0 glass-sidebar overflow-hidden flex flex-col relative z-20"
    >
      {/* Header */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 font-mono" style={{ color: 'var(--accent-primary)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                PROJECTS
              </h2>
              <div className="flex items-center gap-1">
                {/* Create Project Button */}
                <button
                  onClick={onCreateProject}
                  className="btn-icon"
                  title="Create new project"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                {/* GitHub Repos Button */}
                {onOpenGitHubRepos && (
                  <button
                    onClick={onOpenGitHubRepos}
                    className="btn-icon"
                    title="Browse GitHub repos"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </button>
                )}
                {/* Sort Toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="btn-icon"
                    title="Sort projects"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  </button>
                  {showSortMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSortMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 glass-elevated rounded-lg shadow-lg py-1 min-w-[140px]">
                        {[
                          { key: SORT_OPTIONS.RECENT, label: 'Recent' },
                          { key: SORT_OPTIONS.NAME_ASC, label: 'Name (A-Z)' },
                          { key: SORT_OPTIONS.NAME_DESC, label: 'Name (Z-A)' },
                          { key: SORT_OPTIONS.ACTIVE, label: 'Active First' },
                          { key: SORT_OPTIONS.PINNED, label: 'Pinned First' },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                            className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 font-mono transition-colors"
                            style={{
                              color: sortBy === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              background: 'transparent',
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-glass-hover)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            {sortBy === key && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
                            <span className={sortBy !== key ? 'ml-3.5' : ''}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Refresh Button */}
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="btn-icon disabled:opacity-50"
                  title="Refresh projects"
                >
                  <svg
                    className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-glass w-full pl-[4.25rem] pr-3 py-2 text-sm"
              />
            </div>
      </div>


      {/* Project List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-2"
        style={{ overscrollBehavior: 'contain' }}
      >
        {isLoading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            {searchQuery ? 'No matches' : 'No projects'}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Favorites Section */}
            {favoriteProjects.length > 0 && (
              <div>
                <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Favorites
                </div>
                <ul className="space-y-1 px-2">
                  {favoriteProjects.map((project) => {
                    const isSelected = selectedProject?.path === project.path;
                    const isFavorite = favorites.includes(project.path);
                    return (
                      <li key={project.id}>
                        <div
                          onClick={() => handleProjectSelect(project)}
                          className="sidebar-item group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all font-mono cursor-pointer"
                          style={{
                            background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                            boxShadow: isSelected ? '0 0 20px rgba(16, 185, 129, 0.15)' : 'none',
                          }}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${project.hasActiveSession ? 'status-dot online' : ''}`}
                            style={{ background: project.hasActiveSession ? 'var(--accent-primary)' : 'var(--border-default)' }}
                            title={project.hasActiveSession ? 'Active session' : 'No active session'}
                          />
                          <span className="flex-1 truncate">{project.name}</span>
                          {/* GitHub Status Indicator */}
                          {project.githubRepo && (
                            <GitHubStatusDot status={project.githubRepo.lastSyncStatus || 'synced'} />
                          )}
                          <button
                            onClick={(e) => toggleFavorite(project.path, e)}
                            className="p-1 rounded transition-colors opacity-100"
                            style={{ color: 'var(--status-warning)' }}
                            title="Remove from favorites"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          {project.hasActiveSession && (
                            <button
                              onClick={(e) => handleKillClick(e, project)}
                              className="p-1 rounded transition-colors"
                              style={{
                                background: confirmKill === project.path ? 'var(--status-error)' : 'transparent',
                                color: confirmKill === project.path ? 'white' : 'var(--status-error)',
                              }}
                              title={confirmKill === project.path ? 'Click again to confirm' : 'Kill session'}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Regular Projects Section */}
            {regularProjects.length > 0 && (
              <div>
                {favoriteProjects.length > 0 && (
                  <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Projects
                  </div>
                )}
                <ul className="space-y-1 px-2">
                  {regularProjects.map((project) => {
                    const isSelected = selectedProject?.path === project.path;
                    const isFavorite = favorites.includes(project.path);
                    return (
                      <li key={project.id}>
                        <div
                          onClick={() => handleProjectSelect(project)}
                          className="sidebar-item group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all font-mono cursor-pointer"
                          style={{
                            background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                            boxShadow: isSelected ? '0 0 20px rgba(16, 185, 129, 0.15)' : 'none',
                          }}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${project.hasActiveSession ? 'status-dot online' : ''}`}
                            style={{ background: project.hasActiveSession ? 'var(--accent-primary)' : 'var(--border-default)' }}
                            title={project.hasActiveSession ? 'Active session' : 'No active session'}
                          />
                          <span className="flex-1 truncate">{project.name}</span>
                          {/* GitHub Status Indicator */}
                          {project.githubRepo && (
                            <GitHubStatusDot status={project.githubRepo.lastSyncStatus || 'synced'} />
                          )}
                          <button
                            onClick={(e) => toggleFavorite(project.path, e)}
                            className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                            style={{ color: 'var(--text-muted)' }}
                            title="Add to favorites"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          {project.hasActiveSession && (
                            <button
                              onClick={(e) => handleKillClick(e, project)}
                              className="p-1 rounded transition-colors"
                              style={{
                                background: confirmKill === project.path ? 'var(--status-error)' : 'transparent',
                                color: confirmKill === project.path ? 'white' : 'var(--status-error)',
                              }}
                              title={confirmKill === project.path ? 'Click again to confirm' : 'Kill session'}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="px-3 py-2 text-xs font-mono" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--text-secondary)' }}>{projects.length} projects</span>
          <span style={{ color: 'var(--accent-primary)' }}>{projects.filter(p => p.hasActiveSession).length} active</span>
        </div>
      </div>

      {/* User Profile Section */}
      <UserProfileSection collapsed={false} />
    </aside>
  );
}

export default Sidebar;

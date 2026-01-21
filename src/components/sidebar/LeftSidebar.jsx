/**
 * LeftSidebar - Clean Project Navigation
 * Simple, minimal design with collapsible sections
 */

import { useState, useMemo } from 'react';
import useScrollCapture from '../../hooks/useScrollCapture';
import UserProfileSection from '../UserProfileSection';
import ProjectContextMenu from '../ProjectContextMenu';
import { GitHubStatusDot } from '../GitHubStatusBadge';

const FAVORITES_KEY = 'cw-favorites';
const SHOW_ALL_PROJECTS_KEY = 'cw-show-all-projects';

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function getShowAllProjects() {
  try {
    return localStorage.getItem(SHOW_ALL_PROJECTS_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveShowAllProjects(show) {
  localStorage.setItem(SHOW_ALL_PROJECTS_KEY, show ? 'true' : 'false');
}

export default function LeftSidebar({
  projects = [],
  selectedProject,
  onSelectProject,
  onSelectProjectWithAI,
  onKillSession,
  onRefresh,
  isLoading,
  onOpenAdmin,
  onCreateProject,
  onOpenGitHubRepos,
  projectsDir,
}) {
  const { containerRef, scrollRef } = useScrollCapture();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(getFavorites);
  const [showAllProjects, setShowAllProjects] = useState(getShowAllProjects);
  const [confirmKill, setConfirmKill] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ favorites: true, projects: true });
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, project: null });

  // Home project - always first
  const HOME_PROJECT = projectsDir ? {
    id: '__home__',
    name: 'Home',
    path: projectsDir,
    isHome: true,
    hasActiveSession: false,
  } : null;

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  // Split by favorites
  const favoriteProjects = useMemo(() =>
    filteredProjects.filter(p => favorites.includes(p.path)),
    [filteredProjects, favorites]
  );

  // Filter regular projects (non-favorites)
  // Only show projects that have been opened (session started) unless showAllProjects is enabled
  const regularProjects = useMemo(() => {
    let filtered = filteredProjects.filter(p => !favorites.includes(p.path));
    if (!showAllProjects) {
      filtered = filtered.filter(p => p.hasBeenOpened || p.hasActiveSession);
    }
    return filtered;
  }, [filteredProjects, favorites, showAllProjects]);

  // Count of unopened projects (for showing the toggle)
  const unopenedCount = useMemo(() =>
    filteredProjects.filter(p => !favorites.includes(p.path) && !p.hasBeenOpened && !p.hasActiveSession).length,
    [filteredProjects, favorites]
  );

  const toggleShowAllProjects = () => {
    const newValue = !showAllProjects;
    setShowAllProjects(newValue);
    saveShowAllProjects(newValue);
  };

  const toggleFavorite = (path, e) => {
    e?.stopPropagation();
    const newFavorites = favorites.includes(path)
      ? favorites.filter(p => p !== path)
      : [...favorites, path];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const handleKillClick = (e, project) => {
    e.stopPropagation();
    if (confirmKill === project.path) {
      onKillSession?.(project.path);
      setConfirmKill(null);
    } else {
      setConfirmKill(project.path);
      setTimeout(() => setConfirmKill(null), 3000);
    }
  };

  const handleContextMenu = (e, project) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, project });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Project item renderer
  const ProjectItem = ({ project, isFavorite }) => {
    const isSelected = selectedProject?.path === project.path;
    const isHome = project.isHome;

    return (
      <div
        onClick={() => onSelectProject?.(project)}
        onContextMenu={(e) => !isHome && handleContextMenu(e, project)}
        className={`
          group flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer
          transition-colors duration-150
          ${isSelected
            ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
            : 'hover:bg-white/5 text-[var(--text-secondary)]'
          }
        `}
      >
        {/* Icon */}
        {isHome ? (
          <svg className="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${project.hasActiveSession ? 'bg-emerald-500' : 'bg-[var(--border-default)]'}`} />
        )}

        {/* Name */}
        <span className="flex-1 text-sm font-mono truncate">
          {project.name}
        </span>

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex gap-0.5 opacity-60">
            {project.tags.slice(0, 2).map(tag => (
              <span key={tag.id} className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
            ))}
          </div>
        )}

        {/* GitHub status */}
        {project.githubRepo && (
          <GitHubStatusDot status={project.githubRepo.lastSyncStatus || 'synced'} />
        )}

        {/* Actions (show on hover) */}
        {!isHome && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Favorite */}
            <button
              onClick={(e) => toggleFavorite(project.path, e)}
              className="p-0.5 rounded hover:bg-white/10"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className="w-3.5 h-3.5"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                style={{ color: isFavorite ? 'var(--status-warning)' : 'currentColor' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>

            {/* Kill session */}
            {project.hasActiveSession && (
              <button
                onClick={(e) => handleKillClick(e, project)}
                className={`p-0.5 rounded transition-colors ${confirmKill === project.path ? 'bg-red-500 text-white' : 'hover:bg-white/10 text-red-400'}`}
                title={confirmKill === project.path ? 'Click to confirm' : 'Kill session'}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Section header renderer
  const SectionHeader = ({ title, count, section, icon }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
    >
      <svg
        className={`w-3 h-3 transition-transform ${expandedSections[section] ? 'rotate-90' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      {icon}
      <span className="flex-1 text-left">{title}</span>
      <span className="text-[10px] opacity-60">{count}</span>
    </button>
  );

  return (
    <aside ref={containerRef} className="w-64 h-full flex-shrink-0 flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-[var(--accent-primary)] font-mono tracking-wide">
          PROJECTS
        </h2>
        <div className="flex items-center gap-1">
          {onCreateProject && (
            <button onClick={onCreateProject} className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors" title="Create project">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
          {onOpenGitHubRepos && (
            <button onClick={onOpenGitHubRepos} className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="GitHub repos">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm font-mono rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/50"
          />
        </div>
      </div>

      {/* Project List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        {/* Favorites Section */}
        {(HOME_PROJECT || favoriteProjects.length > 0) && (
          <div className="py-1">
            <SectionHeader
              title="Favorites"
              count={favoriteProjects.length + (HOME_PROJECT ? 1 : 0)}
              section="favorites"
              icon={<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}
            />
            {expandedSections.favorites && (
              <div className="py-1">
                {HOME_PROJECT && <ProjectItem project={HOME_PROJECT} isFavorite={true} />}
                {favoriteProjects.map(p => <ProjectItem key={p.path} project={p} isFavorite={true} />)}
              </div>
            )}
          </div>
        )}

        {/* Opened Projects Section */}
        {(regularProjects.length > 0 || unopenedCount > 0) && (
          <div className="py-1">
            <SectionHeader
              title={showAllProjects ? "All Projects" : "Opened Projects"}
              count={regularProjects.length}
              section="projects"
              icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>}
            />
            {expandedSections.projects && (
              <>
                <div className="py-1">
                  {regularProjects.map(p => <ProjectItem key={p.path} project={p} isFavorite={false} />)}
                </div>
                {/* Toggle to show/hide unopened projects */}
                {unopenedCount > 0 && (
                  <button
                    onClick={toggleShowAllProjects}
                    className="w-full px-3 py-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={showAllProjects ? "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"} />
                    </svg>
                    {showAllProjects ? 'Hide unopened' : `Show ${unopenedCount} more`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {filteredProjects.length === 0 && !HOME_PROJECT && (
          <div className="px-3 py-8 text-center text-[var(--text-muted)]">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <p className="text-sm font-mono">{searchQuery ? 'No matches' : 'No projects'}</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
        <span>{projects.length} projects</span>
        <span className="text-emerald-500">{projects.filter(p => p.hasActiveSession).length} active</span>
      </div>

      {/* User Profile */}
      <UserProfileSection collapsed={false} />

      {/* Context Menu */}
      <ProjectContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        project={contextMenu.project}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, project: null })}
        onSelectProject={onSelectProject}
        onSelectProjectWithAI={onSelectProjectWithAI}
        onKillSession={onKillSession}
        onToggleFavorite={(path) => toggleFavorite(path)}
        isFavorite={contextMenu.project ? favorites.includes(contextMenu.project.path) : false}
        onRefresh={onRefresh}
      />
    </aside>
  );
}

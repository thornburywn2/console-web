/**
 * Projects Widget Component
 * Condensed project list with favorites, search, and context menu
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { GitHubStatusDot } from '../GitHubStatusBadge';
import ProjectContextMenu from '../ProjectContextMenu';
import { FAVORITES_KEY, getFavorites } from './constants';

export default function ProjectsWidget({
  projects = [],
  selectedProject,
  onSelectProject,
  onKillSession,
  fillHeight = false,
  projectsDir,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(getFavorites);
  const [confirmKill, setConfirmKill] = useState(null);
  const listRef = useRef(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, project: null });

  // Home project - always first in favorites
  const HOME_PROJECT = projectsDir ? {
    id: '__home__',
    name: 'Home',
    path: projectsDir,
    isHome: true,
    hasActiveSession: false,
  } : null;

  // Handle wheel events for scroll (xterm captures these otherwise)
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { scrollTop, scrollHeight, clientHeight } = listEl;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
        listEl.scrollTop = newScrollTop;
      }
    };

    listEl.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => listEl.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered;
  }, [projects, searchQuery]);

  // Split into favorites and regular
  const favoriteProjects = useMemo(() =>
    filteredProjects.filter(p => favorites.includes(p.path)),
    [filteredProjects, favorites]
  );

  const regularProjects = useMemo(() =>
    filteredProjects.filter(p => !favorites.includes(p.path)),
    [filteredProjects, favorites]
  );

  const toggleFavorite = (projectPath, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavorites = prev.includes(projectPath)
        ? prev.filter(p => p !== projectPath)
        : [...prev, projectPath];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      } catch {}
      return newFavorites;
    });
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

  // Handle right-click context menu
  const handleContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      project
    });
  };

  // Truncate name for condensed view
  const truncateName = (name, maxLen = 20) => {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen - 2) + '..';
  };

  // Render Home item (special styling, always first, can't unfavorite)
  const renderHomeItem = () => {
    if (!HOME_PROJECT) return null;
    const isSelected = selectedProject?.isHome || selectedProject?.path === projectsDir;

    return (
      <div
        key="home"
        onClick={() => onSelectProject?.(HOME_PROJECT)}
        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all group"
        style={{
          background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
          borderLeft: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
        }}
      >
        {/* Home icon */}
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>

        {/* Home name */}
        <span
          className="flex-1 text-xs font-mono font-semibold"
          style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}
        >
          Home
        </span>

        {/* Pinned indicator (always pinned, can't unfavorite) */}
        <svg
          className="w-3 h-3"
          style={{ color: 'var(--accent-primary)' }}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>
    );
  };

  const renderProjectItem = (project, isFavorite) => {
    const isSelected = selectedProject?.path === project.path;

    return (
      <div
        key={project.id || project.path}
        onClick={() => onSelectProject?.(project)}
        onContextMenu={(e) => handleContextMenu(e, project)}
        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all group"
        style={{
          background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
          borderLeft: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
        }}
      >
        {/* Active indicator */}
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${project.hasActiveSession ? 'bg-green-500' : ''}`}
          style={{ background: project.hasActiveSession ? undefined : 'var(--border-default)' }}
        />

        {/* Project name - condensed */}
        <span
          className="flex-1 text-xs font-mono truncate"
          style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
          title={project.name}
        >
          {truncateName(project.name)}
        </span>

        {/* Tag indicators */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex items-center gap-0.5 flex-shrink-0" title={project.tags.map(t => t.name).join(', ')}>
            {project.tags.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            ))}
            {project.tags.length > 3 && (
              <span className="text-[9px] text-muted">+{project.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* GitHub status */}
        {project.githubRepo && (
          <GitHubStatusDot status={project.githubRepo.lastSyncStatus || 'synced'} />
        )}

        {/* Favorite toggle */}
        <button
          onClick={(e) => toggleFavorite(project.path, e)}
          className={`p-0.5 rounded transition-opacity ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ color: isFavorite ? 'var(--status-warning)' : 'var(--text-muted)' }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg className="w-3 h-3" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>

        {/* Kill session button */}
        {project.hasActiveSession && (
          <button
            onClick={(e) => handleKillClick(e, project)}
            className="p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
            style={{
              background: confirmKill === project.path ? 'var(--status-error)' : 'transparent',
              color: confirmKill === project.path ? 'white' : 'var(--status-error)',
            }}
            title={confirmKill === project.path ? 'Click to confirm' : 'Kill session'}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`${fillHeight ? 'h-full flex flex-col' : 'space-y-2'}`}>
      {/* Search */}
      <div className={`relative ${fillHeight ? 'flex-shrink-0 mb-2' : ''}`}>
        <svg
          className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3"
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-7 pr-2 py-1 text-xs font-mono rounded"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Project list - fills available space when fillHeight is true */}
      <div
        ref={listRef}
        className={`overflow-y-auto space-y-0.5 ${fillHeight ? 'flex-1 min-h-0' : 'max-h-64'}`}
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Favorites - Home is always first */}
        {(HOME_PROJECT || favoriteProjects.length > 0) && (
          <div>
            <div className="px-2 py-0.5 text-[10px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
              Favorites
            </div>
            {renderHomeItem()}
            {favoriteProjects.map(p => renderProjectItem(p, true))}
          </div>
        )}

        {/* Regular projects */}
        {regularProjects.length > 0 && (
          <div>
            {(HOME_PROJECT || favoriteProjects.length > 0) && (
              <div className="px-2 py-0.5 text-[10px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
                All Projects
              </div>
            )}
            {regularProjects.map(p => renderProjectItem(p, false))}
          </div>
        )}

        {filteredProjects.length === 0 && !HOME_PROJECT && (
          <div className="text-xs text-center py-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
            {searchQuery ? 'No matches' : 'No projects'}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={`flex items-center justify-between text-[10px] font-mono pt-1 ${fillHeight ? 'flex-shrink-0 mt-2' : ''}`} style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
        <span>{projects.length} projects</span>
        <span style={{ color: 'var(--accent-primary)' }}>{projects.filter(p => p.hasActiveSession).length} active</span>
      </div>

      {/* Context Menu */}
      <ProjectContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        project={contextMenu.project}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, project: null })}
        onSelectProject={onSelectProject}
        onKillSession={onKillSession}
        onToggleFavorite={(path) => toggleFavorite(path, { stopPropagation: () => {} })}
        isFavorite={contextMenu.project ? favorites.includes(contextMenu.project.path) : false}
        onRefresh={onRefresh}
      />
    </div>
  );
}

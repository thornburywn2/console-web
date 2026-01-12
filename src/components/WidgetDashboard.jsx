/**
 * Widget Dashboard Component
 * Customizable widget layout with drag-drop support and grid snapping
 * Full feature parity with RightSidebar panels
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import SystemStats from './SystemStats';
import ProjectContext from './ProjectContext';
import PortWizard from './PortWizard';
import SessionManager from './SessionManager';
import GitHubProjectPanel from './GitHubProjectPanel';
import CloudflarePublishPanel from './CloudflarePublishPanel';
import { GitHubStatusDot } from './GitHubStatusBadge';

const GAP = 8; // gap between widgets

// LocalStorage keys for projects widget
const FAVORITES_KEY = 'cw-favorites';

// Get favorites from localStorage
const getFavorites = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Height snap options for widget resizing
const HEIGHT_SNAPS = {
  small: { label: 'S', height: 120 },
  medium: { label: 'M', height: 200 },
  large: { label: 'L', height: 320 },
  full: { label: 'F', height: 480 },
  fill: { label: '↕', height: 'auto' }, // Fill remaining space
};

// Widget type configurations
const WIDGET_TYPES = {
  system: {
    icon: '📊',
    title: 'System',
    description: 'CPU, memory, disk usage',
    color: '#06b6d4',
    requiresProject: false,
    defaultHeight: 'medium',
  },
  projectInfo: {
    icon: '📁',
    title: 'Project Info',
    description: 'Project health and tech stack',
    color: '#8b5cf6',
    requiresProject: true,
    defaultHeight: 'medium',
  },
  github: {
    icon: '🐙',
    title: 'GitHub',
    description: 'Repository sync and actions',
    color: '#a855f7',
    requiresProject: true,
    defaultHeight: 'medium',
  },
  cloudflare: {
    icon: '☁️',
    title: 'Cloudflare',
    description: 'Tunnel publishing',
    color: '#f97316',
    requiresProject: true,
    defaultHeight: 'medium',
  },
  ports: {
    icon: '⚡',
    title: 'Ports',
    description: 'Active port management',
    color: '#22c55e',
    requiresProject: false,
    defaultHeight: 'small',
  },
  sessions: {
    icon: '💻',
    title: 'Sessions',
    description: 'Active terminal sessions',
    color: '#8b5cf6',
    requiresProject: false,
    defaultHeight: 'medium',
  },
  docker: {
    icon: '🐳',
    title: 'Docker',
    description: 'Container status',
    color: '#3b82f6',
    requiresProject: false,
    defaultHeight: 'medium',
  },
  projects: {
    icon: '📂',
    title: 'Projects',
    description: 'Favorites and project list',
    color: '#22c55e',
    requiresProject: false,
    defaultHeight: 'fill',
  },
};

// Default widget layouts - matches current panel order
const DEFAULT_WIDGETS = [
  { id: 'system-1', type: 'system', title: 'System' },
  { id: 'projectInfo-1', type: 'projectInfo', title: 'Project Info' },
  { id: 'github-1', type: 'github', title: 'GitHub' },
  { id: 'cloudflare-1', type: 'cloudflare', title: 'Cloudflare' },
  { id: 'ports-1', type: 'ports', title: 'Ports' },
  { id: 'sessions-1', type: 'sessions', title: 'Sessions' },
];

// Sidebar defaults - same as panels
const SIDEBAR_DEFAULTS = [
  { id: 'system-1', type: 'system', title: 'System' },
  { id: 'projectInfo-1', type: 'projectInfo', title: 'Project Info' },
  { id: 'github-1', type: 'github', title: 'GitHub' },
  { id: 'cloudflare-1', type: 'cloudflare', title: 'Cloudflare' },
  { id: 'ports-1', type: 'ports', title: 'Ports' },
  { id: 'sessions-1', type: 'sessions', title: 'Sessions' },
];

// Left sidebar defaults - projects widget
const LEFT_SIDEBAR_DEFAULTS = [
  { id: 'projects-1', type: 'projects', title: 'Projects' },
];

// Individual widget component with drag support and height snapping
function DraggableWidget({
  widget,
  isEditing,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging,
  isDropTarget,
  children,
  expanded,
  onToggle,
  heightSnap,
  onHeightChange,
}) {
  const typeConfig = WIDGET_TYPES[widget.type] || { icon: '📦', title: 'Widget', color: '#666' };
  const currentHeight = heightSnap || typeConfig.defaultHeight || 'medium';
  const heightConfig = HEIGHT_SNAPS[currentHeight] || HEIGHT_SNAPS.medium;
  const isFillMode = heightConfig.height === 'auto';

  return (
    <div
      className={`
        widget-panel rounded-lg overflow-hidden transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95 z-50' : ''}
        ${isDropTarget ? 'ring-2 ring-hacker-cyan ring-offset-2 ring-offset-transparent' : ''}
        ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isFillMode && expanded ? 'flex-1 flex flex-col min-h-0' : ''}
      `}
      style={{
        borderColor: `${typeConfig.color}33`,
      }}
      draggable={isEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData('widgetId', widget.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(widget.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      {/* Header */}
      <button
        onClick={() => !isEditing && onToggle?.()}
        className="widget-header w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ background: `${typeConfig.color}10` }}
      >
        <div className="widget-title flex items-center gap-2">
          <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
          <span className="text-xs font-semibold font-mono" style={{ color: 'var(--text-secondary)' }}>
            {widget.title || typeConfig.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Height snap buttons - show when editing */}
          {isEditing && (
            <div className="flex items-center gap-0.5 mr-2">
              {Object.entries(HEIGHT_SNAPS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHeightChange?.(widget.id, key);
                  }}
                  className={`w-5 h-5 text-[10px] font-mono rounded transition-colors ${
                    currentHeight === key
                      ? 'bg-hacker-cyan/30 text-hacker-cyan'
                      : 'hover:bg-white/10 text-hacker-text-dim'
                  }`}
                  title={`${key} height`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(widget.id);
              }}
              className="p-1 hover:bg-red-500/20 rounded text-red-400 text-xs"
              title="Remove widget"
            >
              ✕
            </button>
          )}
          {!isEditing && (
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-tertiary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Content - with height control when expanded */}
      {expanded && (
        <div
          className={`widget-content p-2 overflow-auto ${isFillMode ? 'flex-1 min-h-0' : ''}`}
          style={isFillMode ? {} : { maxHeight: `${heightConfig.height}px` }}
        >
          {children}
        </div>
      )}

      {/* Drag handle indicator */}
      {isEditing && (
        <div className="absolute bottom-1 right-1 text-[10px] text-hacker-text-dim">⋮⋮</div>
      )}
    </div>
  );
}

// Docker widget content - fetches from Docker API
function DockerWidget() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/docker/containers');
        if (!response.ok) {
          throw new Error('Failed to fetch containers');
        }
        const data = await response.json();
        // Handle both array and object with containers property
        const containerList = Array.isArray(data) ? data : (data.containers || []);
        setContainers(containerList.slice(0, 8));
        setError(null);
      } catch (err) {
        console.error('Docker fetch error:', err);
        setError(err.message);
        setContainers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchContainers();
    const interval = setInterval(fetchContainers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-4 h-4 border-2 border-hacker-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-center py-3 font-mono" style={{ color: 'var(--status-error)' }}>
        {error}
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="text-xs text-center py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
        No containers found
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {containers.map((container) => {
        const name = container.Names?.[0]?.replace(/^\//, '') || container.name || 'unknown';
        const state = container.State || container.state || 'unknown';
        const isRunning = state === 'running';

        return (
          <div
            key={container.Id || container.id || name}
            className="flex items-center gap-2 p-1.5 rounded text-xs"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-green-500' : 'bg-yellow-500'}`}
            />
            <span className="font-mono truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
              {name}
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: isRunning ? 'var(--accent-primary)' : 'var(--status-warning)' }}
            >
              {state}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Projects widget - condensed list with favorites
function ProjectsWidget({ projects = [], selectedProject, onSelectProject, onKillSession, fillHeight = false, projectsDir }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(getFavorites);
  const [confirmKill, setConfirmKill] = useState(null);
  const listRef = useRef(null);

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
    </div>
  );
}

// Placeholder for widgets that need project but none selected
function NoProjectSelected({ widgetType }) {
  const config = WIDGET_TYPES[widgetType];
  return (
    <div className="text-center py-4">
      <span className="text-2xl opacity-50">{config?.icon || '📦'}</span>
      <div className="text-xs font-mono mt-2" style={{ color: 'var(--text-secondary)' }}>
        Select a project
      </div>
    </div>
  );
}

// Add widget modal with scroll fix
function AddWidgetModal({ isOpen, onClose, onAdd, existingWidgets }) {
  const scrollContainerRef = useRef(null);

  // Handle wheel events for scroll (xterm captures these otherwise)
  useEffect(() => {
    if (!isOpen) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e) => {
      e.stopPropagation();
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
        scrollContainer.scrollTop = newScrollTop;
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  if (!isOpen) return null;

  const availableTypes = Object.entries(WIDGET_TYPES).filter(
    ([type]) => !existingWidgets.some((w) => w.type === type)
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <div
          className="flex items-center justify-between p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 className="text-sm font-semibold font-mono uppercase" style={{ color: 'var(--accent-primary)' }}>
            Add Widget
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>
        <div
          ref={scrollContainerRef}
          className="p-4 flex-1 overflow-y-auto space-y-2"
          style={{ overscrollBehavior: 'contain' }}
        >
          {availableTypes.length === 0 ? (
            <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              All widgets have been added
            </div>
          ) : (
            availableTypes.map(([type, config]) => (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left transition-colors"
                style={{ border: `1px solid ${config.color}33` }}
              >
                <span className="text-xl">{config.icon}</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {config.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {config.description}
                    {config.requiresProject && (
                      <span className="ml-1 text-yellow-500">(requires project)</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Main dashboard component
export default function WidgetDashboard({
  selectedProject,
  projects = [],
  onKillSession,
  onSelectProject,
  onOpenAdmin,
  onOpenCheckpoints,
  onOpenGitHubSettings,
  onRefresh,
  onAction,
  sidebarMode = false,
  leftSidebarMode = false,
  storageKey = 'dashboard-widgets',
  hideToolbar = false,
  projectsDir,
}) {
  const [widgets, setWidgets] = useState([]);
  const [expandedWidgets, setExpandedWidgets] = useState({});
  const [heightSnaps, setHeightSnaps] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const gridRef = useRef(null);
  const containerRef = useRef(null);
  const isHoveringRef = useRef(false);

  // Handle wheel events to fix scroll in sidebars (xterm captures wheel events)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => { isHoveringRef.current = true; };
    const handleMouseLeave = () => { isHoveringRef.current = false; };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    const handleWheel = (e) => {
      if (!isHoveringRef.current) return;

      const scrollContainer = gridRef.current;
      if (!scrollContainer) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
        scrollContainer.scrollTop = newScrollTop;
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  // Determine defaults based on mode
  const getDefaults = useCallback(() => {
    if (leftSidebarMode) return LEFT_SIDEBAR_DEFAULTS;
    if (sidebarMode) return SIDEBAR_DEFAULTS;
    return DEFAULT_WIDGETS;
  }, [leftSidebarMode, sidebarMode]);

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWidgets(parsed.widgets || parsed);
        setExpandedWidgets(parsed.expanded || {});
        setHeightSnaps(parsed.heights || {});
      } catch {
        setWidgets(getDefaults());
      }
    } else {
      setWidgets(getDefaults());
    }
  }, [storageKey, getDefaults]);

  // Initialize expanded state for new widgets
  useEffect(() => {
    const newExpanded = { ...expandedWidgets };
    widgets.forEach((w) => {
      if (newExpanded[w.id] === undefined) {
        newExpanded[w.id] = true;
      }
    });
    if (JSON.stringify(newExpanded) !== JSON.stringify(expandedWidgets)) {
      setExpandedWidgets(newExpanded);
    }
  }, [widgets]);

  // Save layout (includes widgets, expanded state, and height snaps)
  const saveLayout = useCallback(
    (newWidgets, newExpanded = expandedWidgets, newHeights = heightSnaps) => {
      localStorage.setItem(storageKey, JSON.stringify({
        widgets: newWidgets,
        expanded: newExpanded,
        heights: newHeights,
      }));
      setWidgets(newWidgets);
      if (newExpanded !== expandedWidgets) {
        setExpandedWidgets(newExpanded);
      }
      if (newHeights !== heightSnaps) {
        setHeightSnaps(newHeights);
      }
    },
    [storageKey, expandedWidgets, heightSnaps]
  );

  const handleToggleExpanded = useCallback(
    (widgetId) => {
      const newExpanded = { ...expandedWidgets, [widgetId]: !expandedWidgets[widgetId] };
      setExpandedWidgets(newExpanded);
      localStorage.setItem(storageKey, JSON.stringify({ widgets, expanded: newExpanded, heights: heightSnaps }));
    },
    [widgets, expandedWidgets, heightSnaps, storageKey]
  );

  const handleHeightChange = useCallback(
    (widgetId, newHeight) => {
      const newHeights = { ...heightSnaps, [widgetId]: newHeight };
      setHeightSnaps(newHeights);
      localStorage.setItem(storageKey, JSON.stringify({ widgets, expanded: expandedWidgets, heights: newHeights }));
    },
    [widgets, expandedWidgets, heightSnaps, storageKey]
  );

  const handleRemoveWidget = useCallback(
    (id) => {
      saveLayout(widgets.filter((w) => w.id !== id));
    },
    [widgets, saveLayout]
  );

  const handleAddWidget = useCallback(
    (type) => {
      const typeConfig = WIDGET_TYPES[type];
      const newWidget = {
        id: `${type}-${Date.now()}`,
        type,
        title: typeConfig?.title || type,
      };
      const newExpanded = { ...expandedWidgets, [newWidget.id]: true };
      const newHeights = { ...heightSnaps, [newWidget.id]: typeConfig?.defaultHeight || 'medium' };
      saveLayout([...widgets, newWidget], newExpanded, newHeights);
    },
    [widgets, expandedWidgets, heightSnaps, saveLayout]
  );

  const handleResetLayout = useCallback(() => {
    const defaults = getDefaults();
    const newExpanded = {};
    const newHeights = {};
    defaults.forEach((w) => {
      newExpanded[w.id] = true;
      const typeConfig = WIDGET_TYPES[w.type];
      newHeights[w.id] = typeConfig?.defaultHeight || 'medium';
    });
    saveLayout(defaults, newExpanded, newHeights);
  }, [saveLayout, getDefaults]);

  // Drag and drop handlers
  const handleDragStart = useCallback((widgetId) => {
    setDraggedWidget(widgetId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
    setDropTargetIndex(null);
  }, []);

  const handleDragOver = useCallback(
    (e, index) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedWidget && index !== dropTargetIndex) {
        setDropTargetIndex(index);
      }
    },
    [draggedWidget, dropTargetIndex]
  );

  const handleDrop = useCallback(
    (e, targetIndex) => {
      e.preventDefault();
      const widgetId = e.dataTransfer.getData('widgetId');
      if (!widgetId) return;

      const sourceIndex = widgets.findIndex((w) => w.id === widgetId);
      if (sourceIndex === -1 || sourceIndex === targetIndex) return;

      // Reorder widgets
      const newWidgets = [...widgets];
      const [removed] = newWidgets.splice(sourceIndex, 1);
      newWidgets.splice(targetIndex, 0, removed);

      saveLayout(newWidgets);
      setDraggedWidget(null);
      setDropTargetIndex(null);
    },
    [widgets, saveLayout]
  );

  // Render widget content based on type
  const renderWidgetContent = (widget, fillHeight = false) => {
    const config = WIDGET_TYPES[widget.type];

    // For widgets that require a project
    if (config?.requiresProject && !selectedProject) {
      return <NoProjectSelected widgetType={widget.type} />;
    }

    switch (widget.type) {
      case 'system':
        return <SystemStats />;

      case 'projectInfo':
        return (
          <div className="space-y-2">
            <ProjectContext project={selectedProject} />
            {onOpenCheckpoints && (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={onOpenCheckpoints}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono rounded hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Checkpoints & Rollback
                </button>
              </div>
            )}
          </div>
        );

      case 'github':
        return (
          <GitHubProjectPanel
            project={selectedProject}
            onOpenSettings={onOpenGitHubSettings}
            onRefresh={onRefresh}
          />
        );

      case 'cloudflare':
        return <CloudflarePublishPanel project={selectedProject} onRefresh={onRefresh} />;

      case 'ports':
        return <PortWizard projects={projects} onSelectProject={onSelectProject} />;

      case 'sessions':
        return (
          <SessionManager projects={projects} onKillSession={onKillSession} onSelectProject={onSelectProject} />
        );

      case 'docker':
        return <DockerWidget />;

      case 'projects':
        return (
          <ProjectsWidget
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={onSelectProject}
            onKillSession={onKillSession}
            fillHeight={fillHeight}
            projectsDir={projectsDir}
          />
        );

      default:
        return (
          <div className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-2xl">📦</span>
            <div className="text-xs font-mono mt-2">Unknown widget type</div>
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Toolbar */}
      {!hideToolbar && (
        <div
          className="flex items-center justify-between px-2 py-1.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-xs font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>
            {isEditing ? 'Edit Mode' : 'Widgets'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1 text-xs rounded transition-colors hover:bg-white/10"
              style={{ color: 'var(--accent-secondary)' }}
              title="Add widget"
            >
              +
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-1 text-xs rounded transition-colors ${
                isEditing ? 'bg-yellow-500/20' : 'hover:bg-white/10'
              }`}
              style={{ color: isEditing ? '#eab308' : 'var(--text-secondary)' }}
              title={isEditing ? 'Done editing' : 'Edit layout'}
            >
              {isEditing ? '✓' : '✎'}
            </button>
            {isEditing && (
              <button
                onClick={handleResetLayout}
                className="p-1 text-xs rounded transition-colors hover:bg-red-500/20"
                style={{ color: '#ef4444' }}
                title="Reset to defaults"
              >
                ↺
              </button>
            )}
          </div>
        </div>
      )}

      {/* Widget List - uses flex layout to support fill-height widgets */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto py-2 px-2 flex flex-col gap-2 min-h-0"
        style={{ overscrollBehavior: 'contain' }}
      >
        {widgets.map((widget, index) => {
          const widgetHeight = heightSnaps[widget.id] || WIDGET_TYPES[widget.type]?.defaultHeight || 'medium';
          const isFillWidget = HEIGHT_SNAPS[widgetHeight]?.height === 'auto';

          return (
          <div
            key={widget.id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={`transition-all duration-200 ${
              dropTargetIndex === index && draggedWidget !== widget.id ? 'transform translate-y-2' : ''
            } ${isFillWidget && expandedWidgets[widget.id] !== false ? 'flex-1 flex flex-col min-h-0' : ''}`}
          >
            <DraggableWidget
              widget={widget}
              isEditing={isEditing}
              onRemove={handleRemoveWidget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isDragging={draggedWidget === widget.id}
              isDropTarget={dropTargetIndex === index && draggedWidget !== widget.id}
              expanded={expandedWidgets[widget.id] !== false}
              onToggle={() => handleToggleExpanded(widget.id)}
              heightSnap={heightSnaps[widget.id]}
              onHeightChange={handleHeightChange}
            >
              {renderWidgetContent(widget, isFillWidget && expandedWidgets[widget.id] !== false)}
            </DraggableWidget>
          </div>
          );
        })}

        {/* Drop zone at bottom when editing */}
        {isEditing && widgets.length > 0 && (
          <div
            onDragOver={(e) => handleDragOver(e, widgets.length)}
            onDrop={(e) => handleDrop(e, widgets.length)}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
              dropTargetIndex === widgets.length ? 'border-hacker-cyan bg-hacker-cyan/10' : ''
            }`}
            style={{ borderColor: dropTargetIndex === widgets.length ? undefined : 'var(--border-subtle)' }}
          >
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              Drop here
            </span>
          </div>
        )}

        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-2xl mb-2">📊</span>
            <p className="text-xs font-mono">No widgets configured</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-xs font-mono hover:underline"
              style={{ color: 'var(--accent-secondary)' }}
            >
              Add widget
            </button>
          </div>
        )}
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddWidget}
        existingWidgets={widgets}
      />
    </div>
  );
}

// Export for right sidebar use
export function RightSidebarWidgets(props) {
  return <WidgetDashboard {...props} sidebarMode={true} storageKey="cw-sidebar-right-widgets" />;
}

// Legacy alias for backwards compatibility
export const SidebarWidgets = RightSidebarWidgets;

// Export for left sidebar use (projects list)
export function LeftSidebarWidgets(props) {
  return <WidgetDashboard {...props} leftSidebarMode={true} storageKey="cw-sidebar-left-widgets" />;
}

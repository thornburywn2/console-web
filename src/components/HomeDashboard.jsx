/**
 * HomeDashboard - Unified Project Command Center
 *
 * Features:
 * - Chat-style "What would you like to create?" prompt
 * - Unified table view with projects aligned to:
 *   - Git status (uncommitted changes)
 *   - Docker containers
 *   - Cloudflare tunnels/routes
 *   - Active sessions
 *   - Port numbers
 *   - Health scores
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApiQueries, useApiQuery } from '../hooks/useApiQuery';
import {
  LAST_ACCESSED_KEY,
  formatTimeAgo,
  formatRelativeDate,
} from './home-dashboard';

// Dashboard API queries
const DASHBOARD_QUERIES = [
  { key: 'projectsExtended', endpoint: '/admin/projects-extended' },
  { key: 'system', endpoint: '/admin/system' },
  { key: 'containers', endpoint: '/docker/containers?all=true' },
  { key: 'dashboard', endpoint: '/dashboard' },
];

// Icons
const Icons = {
  sparkle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  folder: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  git: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  docker: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.185.185 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/>
    </svg>
  ),
  cloud: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  ),
  terminal: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  link: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
};

/**
 * CreationPrompt - Chat-style prompt for creating new projects
 */
function CreationPrompt({ onCreateProject }) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (onCreateProject) {
      // Pass the prompt text so the wizard can use it to pre-fill details
      onCreateProject({ initialPrompt: inputValue.trim() || '' });
    }
    setInputValue('');
  }, [inputValue, onCreateProject]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <div className={`
      relative rounded-xl border transition-all duration-300
      ${isFocused
        ? 'border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/10'
        : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
      }
      bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-primary)]
    `}>
      <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4">
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
          transition-colors duration-300
          ${isFocused
            ? 'bg-[var(--accent-primary)] text-white'
            : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
          }
        `}>
          {Icons.sparkle}
        </div>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to create?"
            className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)]
                       text-lg font-medium outline-none"
          />
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Press Enter to start a new project
          </p>
        </div>

        <button
          type="submit"
          className={`
            flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
            ${inputValue.trim() || isFocused
              ? 'bg-[var(--accent-primary)] text-white hover:brightness-110'
              : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
            }
          `}
        >
          Create
        </button>
      </form>
    </div>
  );
}

/**
 * StatusBadge - Small status indicator
 */
function StatusBadge({ active, label, color = 'var(--accent-primary)' }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono
        ${active
          ? 'bg-opacity-20'
          : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'
        }
      `}
      style={active ? { backgroundColor: `${color}20`, color } : {}}
    >
      {active && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />}
      {label}
    </span>
  );
}

/**
 * ProjectRow - Single row in the unified table
 */
function ProjectRow({
  project,
  gitStatus,
  containers,
  route,
  sessionActive,
  onSelect
}) {
  const completion = project.completion?.percentage || 0;
  const completionColor = completion >= 80 ? '#22c55e' : completion >= 60 ? '#06b6d4' : completion >= 40 ? '#f59e0b' : '#ef4444';

  const runningContainers = containers.filter(c => c.state === 'running');
  const hasUncommitted = gitStatus && (gitStatus.staged > 0 || gitStatus.unstaged > 0 || gitStatus.untracked > 0);

  // Get port from project config or route
  const port = project.port || route?.localPort || null;

  return (
    <tr
      onClick={() => onSelect?.(project)}
      className="group cursor-pointer hover:bg-white/5 transition-colors border-b border-[var(--border-subtle)]/30 last:border-0"
    >
      {/* Project Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-2 h-2 rounded-full flex-shrink-0
            ${sessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--border-default)]'}
          `} />
          <div className="min-w-0">
            <div className="font-mono font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
              {project.name}
            </div>
            {project.description && (
              <div className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                {project.description}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Port */}
      <td className="py-3 px-3 text-center">
        {port ? (
          <span className="text-xs font-mono text-[var(--accent-secondary)]">{port}</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* Session */}
      <td className="py-3 px-3 text-center">
        {sessionActive ? (
          <StatusBadge active label="ACTIVE" color="#22c55e" />
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* Git Status */}
      <td className="py-3 px-3">
        {hasUncommitted ? (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[var(--text-muted)]">{gitStatus.branch}</span>
            <div className="flex items-center gap-1">
              {gitStatus.staged > 0 && <span className="text-emerald-400">+{gitStatus.staged}</span>}
              {gitStatus.unstaged > 0 && <span className="text-amber-400">~{gitStatus.unstaged}</span>}
              {gitStatus.untracked > 0 && <span className="text-red-400">?{gitStatus.untracked}</span>}
            </div>
          </div>
        ) : project.hasGit ? (
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <span>✓</span> clean
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* Docker */}
      <td className="py-3 px-3">
        {containers.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${runningContainers.length > 0 ? 'bg-emerald-500' : 'bg-[var(--text-muted)]'}`} />
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {runningContainers.length}/{containers.length}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* Cloudflare */}
      <td className="py-3 px-3">
        {route ? (
          <a
            href={`https://${route.hostname}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${route.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="truncate max-w-[120px]">{route.subdomain}</span>
            {Icons.link}
          </a>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* Health */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${completion}%`, backgroundColor: completionColor }}
            />
          </div>
          <span className="text-xs font-mono w-8" style={{ color: completionColor }}>
            {completion}%
          </span>
        </div>
      </td>

      {/* Created */}
      <td className="py-3 px-3">
        <span className="text-xs text-[var(--text-muted)]">
          {project.createdAt ? formatRelativeDate(project.createdAt) : '-'}
        </span>
      </td>

      {/* Modified */}
      <td className="py-3 px-3">
        <span className="text-xs text-[var(--text-muted)]">
          {project.updatedAt ? formatRelativeDate(project.updatedAt) : '-'}
        </span>
      </td>
    </tr>
  );
}

/**
 * QuickStats - Summary stats bar
 */
function QuickStats({ stats }) {
  return (
    <div className="flex items-center gap-6 px-4 py-2 text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">Projects:</span>
        <span className="text-[var(--accent-primary)] font-semibold">{stats.total}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">Active:</span>
        <span className="text-emerald-500 font-semibold">{stats.active}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">Containers:</span>
        <span className="text-[#3b82f6] font-semibold">{stats.containersRunning}/{stats.containersTotal}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">Tunnels:</span>
        <span className="text-[var(--accent-secondary)] font-semibold">{stats.tunnels}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">Uncommitted:</span>
        <span className={`font-semibold ${stats.uncommitted > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
          {stats.uncommitted}
        </span>
      </div>
    </div>
  );
}

/**
 * Main HomeDashboard Component
 */
export default function HomeDashboard({ onSelectProject, onCreateProject, projects = [] }) {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filter, setFilter] = useState('');

  // Fetch dashboard data
  const { loading, data: apiData, refetchAll } = useApiQueries(DASHBOARD_QUERIES, {
    refetchInterval: 30000, // 30 seconds
  });

  // Fetch Cloudflare routes (mapped to projects)
  const { data: routesData, refetch: refetchRoutes } = useApiQuery('/cloudflare/routes/mapped', {
    refetchInterval: 60000,
    initialData: { routes: [] },
  });

  // Transform API data with safe defaults
  const data = useMemo(() => ({
    projectsExtended: Array.isArray(apiData.projectsExtended) ? apiData.projectsExtended : [],
    system: apiData.system || null,
    containers: Array.isArray(apiData.containers) ? apiData.containers : [],
    dashboard: apiData.dashboard || null,
  }), [apiData]);

  const routes = useMemo(() => {
    return routesData?.routes || [];
  }, [routesData]);

  // Map git statuses by project path
  const gitStatusByPath = useMemo(() => {
    const map = new Map();
    (data.dashboard?.gitStatuses || []).forEach(gs => {
      map.set(gs.path, gs);
    });
    return map;
  }, [data.dashboard]);

  // Map containers by project name (approximate matching)
  const containersByProject = useMemo(() => {
    const map = new Map();
    data.containers.forEach(container => {
      // Try to match container name to project
      const name = container.name?.replace(/^\//, '') || '';
      // Look for project name in container name
      data.projectsExtended.forEach(project => {
        const projectLower = project.name.toLowerCase();
        const containerLower = name.toLowerCase();
        if (containerLower.includes(projectLower) ||
            containerLower.startsWith(projectLower.replace(/-/g, '')) ||
            name.includes(project.name)) {
          const existing = map.get(project.name) || [];
          if (!existing.find(c => c.id === container.id)) {
            map.set(project.name, [...existing, container]);
          }
        }
      });
    });
    return map;
  }, [data.containers, data.projectsExtended]);

  // Map routes by project name
  const routesByProject = useMemo(() => {
    const map = new Map();
    routes.forEach(route => {
      if (route.project?.name) {
        map.set(route.project.name, route);
      } else if (route.projectId) {
        map.set(route.projectId, route);
      }
    });
    return map;
  }, [routes]);

  // Active sessions by project
  const activeSessionsByProject = useMemo(() => {
    const set = new Set();
    (data.dashboard?.shpoolSessions || []).forEach(session => {
      const projectName = session.replace('sp-', '');
      set.add(projectName);
    });
    return set;
  }, [data.dashboard]);

  // Compute stats
  const stats = useMemo(() => ({
    total: data.projectsExtended.length,
    active: activeSessionsByProject.size,
    containersRunning: data.containers.filter(c => c.state === 'running').length,
    containersTotal: data.containers.length,
    tunnels: routes.filter(r => r.status === 'ACTIVE').length,
    uncommitted: (data.dashboard?.gitStatuses || []).length,
  }), [data.projectsExtended, data.containers, routes, activeSessionsByProject, data.dashboard]);

  // Filter and sort projects
  const sortedProjects = useMemo(() => {
    let filtered = data.projectsExtended;

    // Apply filter
    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(lowerFilter) ||
        p.description?.toLowerCase().includes(lowerFilter) ||
        p.technologies?.some(t => t.toLowerCase().includes(lowerFilter))
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'health':
          comparison = (a.completion?.percentage || 0) - (b.completion?.percentage || 0);
          break;
        case 'active':
          const aActive = activeSessionsByProject.has(a.name) ? 1 : 0;
          const bActive = activeSessionsByProject.has(b.name) ? 1 : 0;
          comparison = bActive - aActive;
          break;
        case 'tunnel':
          const aRoute = routesByProject.get(a.name);
          const bRoute = routesByProject.get(b.name);
          comparison = (bRoute ? 1 : 0) - (aRoute ? 1 : 0);
          break;
        case 'createdAt':
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = aCreated - bCreated;
          break;
        case 'updatedAt':
          const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          comparison = aUpdated - bUpdated;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data.projectsExtended, filter, sortBy, sortOrder, activeSessionsByProject, routesByProject]);

  const handleRefresh = useCallback(() => {
    refetchAll();
    refetchRoutes();
  }, [refetchAll, refetchRoutes]);

  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy]);

  if (loading && data.projectsExtended.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-mono text-[var(--text-muted)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[var(--bg-base)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)]">
        <div className="px-6 py-4">
          <CreationPrompt onCreateProject={onCreateProject} />
        </div>

        <QuickStats stats={stats} />
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Table Header / Controls */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              {Icons.folder}
              Projects
            </h2>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter projects..."
              className="px-3 py-1.5 text-xs font-mono rounded border bg-[var(--bg-primary)]
                         border-[var(--border-subtle)] text-[var(--text-primary)] w-48
                         focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh"
          >
            {Icons.refresh}
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[var(--bg-tertiary)] z-10">
              <tr className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                <th
                  className="text-left py-3 px-4 font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <span className="flex items-center gap-1">
                    Project
                    {sortBy === 'name' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
                <th className="text-center py-3 px-3 font-medium w-16">Port</th>
                <th
                  className="text-center py-3 px-3 font-medium w-20 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('active')}
                >
                  <span className="flex items-center justify-center gap-1">
                    {Icons.terminal}
                    {sortBy === 'active' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
                <th className="text-left py-3 px-3 font-medium w-32">
                  <span className="flex items-center gap-1">
                    {Icons.git}
                    Git
                  </span>
                </th>
                <th className="text-left py-3 px-3 font-medium w-20">
                  <span className="flex items-center gap-1">
                    {Icons.docker}
                    Docker
                  </span>
                </th>
                <th
                  className="text-left py-3 px-3 font-medium w-36 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('tunnel')}
                >
                  <span className="flex items-center gap-1">
                    {Icons.cloud}
                    Tunnel
                    {sortBy === 'tunnel' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
                <th
                  className="text-left py-3 px-3 font-medium w-28 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('health')}
                >
                  <span className="flex items-center gap-1">
                    Health
                    {sortBy === 'health' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
                <th
                  className="text-left py-3 px-3 font-medium w-24 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <span className="flex items-center gap-1">
                    Created
                    {sortBy === 'createdAt' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
                <th
                  className="text-left py-3 px-3 font-medium w-24 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('updatedAt')}
                >
                  <span className="flex items-center gap-1">
                    Modified
                    {sortBy === 'updatedAt' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map(project => (
                <ProjectRow
                  key={project.id || project.path}
                  project={project}
                  gitStatus={gitStatusByPath.get(project.path)}
                  containers={containersByProject.get(project.name) || []}
                  route={routesByProject.get(project.name)}
                  sessionActive={activeSessionsByProject.has(project.name)}
                  onSelect={onSelectProject}
                />
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {sortedProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                {Icons.folder}
              </div>
              <p className="text-[var(--text-muted)] font-mono mb-4">
                {filter ? 'No projects match your filter' : 'No projects found'}
              </p>
              {!filter && onCreateProject && (
                <button
                  onClick={() => onCreateProject()}
                  className="px-4 py-2 rounded-lg font-medium text-sm bg-[var(--accent-primary)] text-white hover:brightness-110 transition-all"
                >
                  Create your first project
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

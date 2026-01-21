/**
 * RightSidebar - Project-Focused Dashboard
 * Collapsible sections showing project-specific information
 */

import { useState, useEffect } from 'react';
import useScrollCapture from '../../hooks/useScrollCapture';
import { systemApi, projectContextApi } from '../../services/api';

const STORAGE_KEY = 'cw-right-sidebar';
const API_BASE = import.meta.env.VITE_API_URL || '';
const PROJECTS_DIR = import.meta.env.VITE_PROJECTS_DIR || '/home/thornburywn/Projects';

// Check if project path is invalid (parent directory or special paths)
const isInvalidProject = (project) => {
  if (!project?.path || !project?.name) return true;
  if (project.name === 'Home' || project.name === 'Projects') return true;
  // Check if path equals the parent Projects directory
  const normalizedPath = project.path.replace(/\/$/, '');
  if (normalizedPath === PROJECTS_DIR || normalizedPath === PROJECTS_DIR + '/') return true;
  return false;
};

// Load persisted state
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// Save state
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Collapsible Panel Component
function Panel({ id, title, icon, children, defaultExpanded = true, badge, badgeColor, empty }) {
  const [state, setState] = useState(() => loadState());
  const expanded = state[id] ?? defaultExpanded;

  const toggle = () => {
    const newState = { ...state, [id]: !expanded };
    setState(newState);
    saveState(newState);
  };

  return (
    <div className="border-b border-[var(--border-subtle)] last:border-b-0">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <svg
          className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm opacity-60">{icon}</span>
        <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{title}</span>
        {badge !== undefined && (
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${badgeColor || 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
            {badge}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          {empty ? (
            <div className="text-xs text-[var(--text-muted)] font-mono">{empty}</div>
          ) : children}
        </div>
      )}
    </div>
  );
}

// System Stats Panel (compact)
function SystemStatsPanel() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await systemApi.getStats();
        setStats(data);
      } catch {
        // Silent fail
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Loading...</div>;
  }

  const Meter = ({ label, value, color }) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)] w-12">{label}</span>
        <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, numValue)}%`, background: color }}
          />
        </div>
        <span className="text-xs font-mono text-[var(--text-secondary)] w-10 text-right">{numValue.toFixed(0)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Meter label="CPU" value={stats.cpu?.usage || 0} color="var(--accent-primary)" />
      <Meter label="Memory" value={stats.memory?.usedPercent || 0} color="#a855f7" />
      <Meter label="Disk" value={stats.disk?.usedPercent || 0} color="#f97316" />
    </div>
  );
}

// Project Info Panel with CLAUDE.md Viewer
function ProjectInfoPanel({ project }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClaudeMd, setShowClaudeMd] = useState(false);
  const [claudeMdContent, setClaudeMdContent] = useState(null);
  const [claudeMdLoading, setClaudeMdLoading] = useState(false);

  useEffect(() => {
    // Skip if no project selected or if it's the "Home" view
    if (!project?.path || project.name === 'Home') {
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const data = await projectContextApi.getStats(project.path);
        setInfo(data);
      } catch {
        setInfo(null);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
    // Reset CLAUDE.md view when project changes
    setShowClaudeMd(false);
    setClaudeMdContent(null);
  }, [project?.path]);

  const handleClaudeMdClick = async () => {
    if (!info?.hasClaudeMd || !project?.name) return;

    if (showClaudeMd) {
      setShowClaudeMd(false);
      return;
    }

    setClaudeMdLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/claude-md/${encodeURIComponent(project.name)}`);
      if (response.ok) {
        const data = await response.json();
        setClaudeMdContent(data.content || '');
        setShowClaudeMd(true);
      }
    } catch {
      setClaudeMdContent('Failed to load CLAUDE.md');
      setShowClaudeMd(true);
    } finally {
      setClaudeMdLoading(false);
    }
  };

  if (!project) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Select a project</div>;
  }

  if (loading) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Loading...</div>;
  }

  const InfoRow = ({ label, value, color, onClick, clickable }) => (
    <div
      className={`flex items-center justify-between text-xs ${clickable ? 'cursor-pointer hover:bg-white/5 -mx-1 px-1 py-0.5 rounded transition-colors' : ''}`}
      onClick={onClick}
    >
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-mono flex items-center gap-1" style={{ color: color || 'var(--text-secondary)' }}>
        {value || '-'}
        {clickable && (
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showClaudeMd ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        )}
      </span>
    </div>
  );

  return (
    <div className="space-y-2">
      <InfoRow label="Name" value={project.name} />
      <InfoRow label="Path" value={project.path?.split('/').pop()} />
      {info?.techStack && <InfoRow label="Stack" value={info.techStack.slice(0, 3).join(', ')} />}
      {info?.port && <InfoRow label="Port" value={info.port} color="var(--accent-primary)" />}
      {info?.hasClaudeMd !== undefined && (
        <InfoRow
          label="CLAUDE.md"
          value={claudeMdLoading ? '...' : (info.hasClaudeMd ? '✓ View' : '✗')}
          color={info.hasClaudeMd ? '#22c55e' : '#ef4444'}
          onClick={info.hasClaudeMd ? handleClaudeMdClick : undefined}
          clickable={info.hasClaudeMd}
        />
      )}
      {/* Inline CLAUDE.md Viewer */}
      {showClaudeMd && claudeMdContent && (
        <div className="mt-2 border border-[var(--border-subtle)] rounded bg-[var(--bg-tertiary)]">
          <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <span className="text-[10px] font-mono text-[var(--text-muted)]">CLAUDE.md (readonly)</span>
            <button
              onClick={() => setShowClaudeMd(false)}
              className="p-0.5 hover:bg-white/10 rounded"
            >
              <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <pre className="p-2 text-[10px] font-mono text-[var(--text-secondary)] overflow-auto max-h-64 whitespace-pre-wrap">
            {claudeMdContent}
          </pre>
        </div>
      )}
      {info?.lastCommit && (
        <InfoRow label="Last Commit" value={new Date(info.lastCommit).toLocaleDateString()} />
      )}
    </div>
  );
}

// Docker Panel - Project-specific
function DockerPanel({ project }) {
  const [dockerInfo, setDockerInfo] = useState(null);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDockerInfo = async () => {
    try {
      // Fetch project's docker-compose info
      const response = await fetch(`${API_BASE}/api/docker/project?path=${encodeURIComponent(project.path)}`);
      if (response.ok) {
        const data = await response.json();
        setDockerInfo(data);
        setContainers(data.containers || []);
      }
    } catch {
      // Check if docker-compose.yml exists by checking project info
      setDockerInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip if no project selected or if it's an invalid project path
    if (isInvalidProject(project)) {
      setLoading(false);
      return;
    }

    fetchDockerInfo();
    const interval = setInterval(fetchDockerInfo, 30000);
    return () => clearInterval(interval);
  }, [project?.path]);

  if (!project) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Select a project</div>;
  }

  if (loading) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Loading...</div>;
  }

  if (!dockerInfo?.hasDockerCompose && containers.length === 0) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">No docker-compose.yml found</div>;
  }

  const handleAction = async (containerId, action) => {
    if (actionLoading) return;
    setActionLoading(`${containerId}-${action}`);
    try {
      await fetch(`${API_BASE}/api/docker/containers/${containerId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      // Refresh
      await fetchDockerInfo();
    } catch {
      // Silent fail
    } finally {
      setActionLoading(null);
    }
  };

  const runningCount = containers.filter(c => c.state === 'running' || c.State === 'running').length;

  return (
    <div className="space-y-2">
      {/* Compose file info */}
      {dockerInfo?.hasDockerCompose && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">{dockerInfo.composeFile || 'docker-compose.yml'}</span>
          <span className="font-mono text-[var(--text-secondary)]">
            {runningCount}/{dockerInfo.services?.length || 0} running
          </span>
        </div>
      )}

      {/* Containers */}
      {containers.length > 0 ? (
        <div className="space-y-1.5">
          {containers.map((container, idx) => {
            const isRunning = container.state === 'running' || container.State === 'running';
            const name = container.name || container.service || `service-${idx}`;
            const shortName = name.split('-').pop() || name;
            const ports = container.ports?.filter(p => p.public) || [];

            return (
              <div key={container.id || name} className="group">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRunning ? 'bg-emerald-500' : 'bg-[var(--text-muted)]'}`} />
                  <span className="flex-1 truncate text-[var(--text-secondary)]" title={name}>{shortName}</span>
                  {/* Action buttons */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    {isRunning ? (
                      <button
                        onClick={() => handleAction(container.id, 'stop')}
                        disabled={actionLoading === `${container.id}-stop`}
                        className="p-0.5 text-amber-500 hover:bg-white/10 rounded disabled:opacity-50"
                        title="Stop"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="1" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(container.id, 'start')}
                        disabled={actionLoading === `${container.id}-start`}
                        className="p-0.5 text-emerald-500 hover:bg-white/10 rounded disabled:opacity-50"
                        title="Start"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(container.id, 'restart')}
                      disabled={actionLoading === `${container.id}-restart`}
                      className="p-0.5 text-blue-400 hover:bg-white/10 rounded disabled:opacity-50"
                      title="Restart"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Port info */}
                {ports.length > 0 && (
                  <div className="ml-4 mt-0.5 text-[10px] text-[var(--text-muted)] font-mono">
                    {ports.map((p, i) => (
                      <span key={i} className="mr-2">:{p.public}→{p.private}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : dockerInfo?.hasDockerCompose ? (
        <div className="space-y-1">
          <div className="text-xs text-[var(--text-muted)] font-mono">
            Containers not running
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono">
            Services: {dockerInfo.services?.join(', ') || 'none'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Network Panel - Project ports from CLAUDE.md and active routes
function NetworkPanel({ project }) {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip if no project selected or if it's the "Home" view
    if (isInvalidProject(project)) {
      setLoading(false);
      return;
    }

    const fetchRouteData = async () => {
      try {
        // Use the same endpoint pattern as HomeDashboard - gets port from CLAUDE.md
        const response = await fetch(`${API_BASE}/api/cloudflare/routes/${encodeURIComponent(project.name)}`);
        if (response.ok) {
          const data = await response.json();
          setRouteData(data);
        }
      } catch {
        setRouteData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRouteData();
    const interval = setInterval(fetchRouteData, 15000);
    return () => clearInterval(interval);
  }, [project?.path, project?.name]);

  if (!project) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Select a project</div>;
  }

  if (loading) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Loading...</div>;
  }

  // Get port from CLAUDE.md via the API response
  const configuredPort = routeData?.projectPort;
  const routes = routeData?.routes || [];
  const activeRoute = routes.find(r => r.status === 'ACTIVE');

  if (!configuredPort && routes.length === 0) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">No port configured in CLAUDE.md</div>;
  }

  return (
    <div className="space-y-2">
      {/* Primary port from CLAUDE.md */}
      {configuredPort && (
        <div className="group">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeRoute ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[var(--accent-primary)] font-semibold">:{configuredPort}</span>
            <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
              Primary
            </span>
            <span className="flex-1" />
            <span className={`text-[10px] ${activeRoute ? 'text-emerald-500' : 'text-amber-500'}`}>
              {activeRoute ? 'tunneled' : 'local only'}
            </span>
          </div>
          <div className="ml-4 mt-0.5 text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-2">
            <span>from CLAUDE.md</span>
            <a
              href={`http://localhost:${configuredPort}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline ml-auto"
            >
              open →
            </a>
          </div>
        </div>
      )}

      {/* Additional route ports if different from configured */}
      {routes.filter(r => r.localPort !== configuredPort).map((route, idx) => (
        <div key={route.id || idx} className="group">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${route.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[var(--accent-secondary)] font-semibold">:{route.localPort}</span>
            <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
              Route
            </span>
            <span className="flex-1" />
            <span className={`text-[10px] ${route.status === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'}`}>
              {route.status?.toLowerCase() || 'unknown'}
            </span>
          </div>
          <div className="ml-4 mt-0.5 text-[10px] text-[var(--text-muted)] font-mono">
            {route.subdomain && <span>{route.subdomain}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Cloudflare Panel - Uses same endpoint as HomeDashboard table
function CloudflarePanel({ project, onOpenAdmin }) {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPort, setEditingPort] = useState(false);
  const [portValue, setPortValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchRouteData = async () => {
    try {
      // Use /cloudflare/routes/:projectId - same data source as HomeDashboard
      const response = await fetch(`${API_BASE}/api/cloudflare/routes/${encodeURIComponent(project.name)}`);
      if (response.ok) {
        const data = await response.json();
        setRouteData(data);
        // Set port from active route or CLAUDE.md config
        const activeRoute = data.routes?.find(r => r.status === 'ACTIVE');
        setPortValue((activeRoute?.localPort || data.projectPort)?.toString() || '');
      }
    } catch {
      setRouteData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip if no project selected or if it's an invalid project
    if (isInvalidProject(project)) {
      setLoading(false);
      return;
    }

    fetchRouteData();
  }, [project?.path, project?.name]);

  const handlePortUpdate = async () => {
    if (!portValue) return;
    const activeRoute = routeData?.routes?.find(r => r.status === 'ACTIVE');
    if (!activeRoute?.hostname) return;

    setUpdating(true);
    try {
      // Update route port via the existing API
      await fetch(`${API_BASE}/api/cloudflare/routes/${encodeURIComponent(activeRoute.hostname)}/port`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localPort: parseInt(portValue) }),
      });
      setEditingPort(false);
      // Refresh data
      await fetchRouteData();
    } catch {
      // Silent fail
    } finally {
      setUpdating(false);
    }
  };

  if (!project) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Select a project</div>;
  }

  if (loading) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Loading...</div>;
  }

  // Get active route (published tunnel)
  const activeRoute = routeData?.routes?.find(r => r.status === 'ACTIVE');
  const projectSubdomain = routeData?.projectSubdomain;
  const suggestedHostname = routeData?.suggestedHostname;

  if (!activeRoute && !projectSubdomain) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-[var(--text-muted)] font-mono">Not published</div>
        {onOpenAdmin && (
          <button
            onClick={() => onOpenAdmin('server')}
            className="text-xs font-mono text-[var(--accent-primary)] hover:underline"
          >
            Configure tunnel →
          </button>
        )}
      </div>
    );
  }

  // If has subdomain in CLAUDE.md but not published yet
  if (!activeRoute && projectSubdomain) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-[var(--text-muted)] font-mono">
          Subdomain configured: <span className="text-[var(--accent-primary)]">{projectSubdomain}</span>
        </div>
        {suggestedHostname && (
          <div className="text-[10px] text-[var(--text-muted)] font-mono">
            → {suggestedHostname}
          </div>
        )}
        {onOpenAdmin && (
          <button
            onClick={() => onOpenAdmin('server')}
            className="text-xs font-mono text-[var(--accent-primary)] hover:underline"
          >
            Publish to tunnel →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* FQDN Link */}
      {activeRoute?.hostname && (
        <a
          href={`https://${activeRoute.hostname}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-mono text-[var(--accent-primary)] hover:underline"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="truncate">{activeRoute.hostname}</span>
          <svg className="w-3 h-3 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}

      {/* Status */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Status</span>
        <span className="font-mono text-emerald-500">
          {activeRoute?.status?.toLowerCase() || 'active'}
        </span>
      </div>

      {/* Port with Edit */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Port</span>
        {editingPort ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={portValue}
              onChange={(e) => setPortValue(e.target.value)}
              className="w-16 px-1 py-0.5 text-xs font-mono bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)]"
              autoFocus
              disabled={updating}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePortUpdate();
                if (e.key === 'Escape') setEditingPort(false);
              }}
            />
            <button onClick={handlePortUpdate} disabled={updating} className="p-0.5 text-emerald-500 hover:bg-white/10 rounded disabled:opacity-50">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button onClick={() => setEditingPort(false)} disabled={updating} className="p-0.5 text-red-400 hover:bg-white/10 rounded disabled:opacity-50">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingPort(true)}
            className="font-mono text-[var(--accent-primary)] hover:underline flex items-center gap-1"
          >
            {activeRoute?.localPort || routeData?.projectPort || 'Not set'}
            <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      {/* WebSocket support indicator */}
      {activeRoute?.websocketEnabled && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">WebSocket</span>
          <span className="font-mono text-emerald-500">enabled</span>
        </div>
      )}
    </div>
  );
}

// Git Panel
function GitPanel({ project }) {
  const [gitInfo, setGitInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchGitInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/git/${encodeURIComponent(project.name)}/status`);
      if (response.ok) {
        const data = await response.json();
        setGitInfo(data);
      }
    } catch {
      setGitInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip if no project selected or if it's an invalid project path
    if (isInvalidProject(project)) {
      setLoading(false);
      return;
    }

    fetchGitInfo();
    const interval = setInterval(fetchGitInfo, 30000);
    return () => clearInterval(interval);
  }, [project?.path, project?.name]);

  const handleGitAction = async (action) => {
    if (actionLoading) return;
    setActionLoading(action);
    try {
      const response = await fetch(`${API_BASE}/api/git/${encodeURIComponent(project.name)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        // Refresh git info after action
        await fetchGitInfo();
      }
    } catch {
      // Silent fail
    } finally {
      setActionLoading(null);
    }
  };

  if (!project) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Select a project</div>;
  }

  if (loading) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Loading...</div>;
  }

  if (!gitInfo) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">Not a git repository</div>;
  }

  const hasChanges = (gitInfo.staged?.length > 0) || (gitInfo.unstaged?.length > 0) || (gitInfo.untracked?.length > 0);

  return (
    <div className="space-y-2">
      {/* GitHub Link */}
      {gitInfo.remoteUrl && (
        <a
          href={gitInfo.remoteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-mono text-[var(--accent-primary)] hover:underline"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span className="truncate">{gitInfo.remoteUrl.replace('https://github.com/', '')}</span>
        </a>
      )}

      {/* Branch */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-[var(--text-muted)]">Branch:</span>
        <span className="text-[var(--accent-primary)]">{gitInfo.branch || 'unknown'}</span>
      </div>

      {/* Changes */}
      {hasChanges ? (
        <div className="space-y-1">
          {gitInfo.staged?.length > 0 && (
            <div className="text-xs font-mono text-emerald-500">
              {gitInfo.staged.length} staged
            </div>
          )}
          {gitInfo.unstaged?.length > 0 && (
            <div className="text-xs font-mono text-amber-500">
              {gitInfo.unstaged.length} modified
            </div>
          )}
          {gitInfo.untracked?.length > 0 && (
            <div className="text-xs font-mono text-[var(--text-muted)]">
              {gitInfo.untracked.length} untracked
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs font-mono text-[var(--text-muted)]">Working tree clean</div>
      )}

      {/* Ahead/Behind */}
      {(gitInfo.ahead > 0 || gitInfo.behind > 0) && (
        <div className="flex items-center gap-3 text-xs font-mono">
          {gitInfo.ahead > 0 && (
            <span className="text-blue-400">↑ {gitInfo.ahead}</span>
          )}
          {gitInfo.behind > 0 && (
            <span className="text-purple-400">↓ {gitInfo.behind}</span>
          )}
        </div>
      )}

      {/* Push/Pull Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => handleGitAction('pull')}
          disabled={actionLoading === 'pull'}
          className="flex-1 px-2 py-1 text-xs font-mono rounded bg-[var(--bg-tertiary)] hover:bg-white/10 text-[var(--text-secondary)] disabled:opacity-50 transition-colors"
        >
          {actionLoading === 'pull' ? '...' : '↓ Pull'}
        </button>
        <button
          onClick={() => handleGitAction('push')}
          disabled={actionLoading === 'push' || gitInfo.ahead === 0}
          className="flex-1 px-2 py-1 text-xs font-mono rounded bg-[var(--bg-tertiary)] hover:bg-white/10 text-[var(--text-secondary)] disabled:opacity-50 transition-colors"
        >
          {actionLoading === 'push' ? '...' : '↑ Push'}
        </button>
      </div>
    </div>
  );
}

// Sessions Panel
function SessionsPanel({ projects, onKillSession, onSelectProject }) {
  const activeSessions = projects?.filter(p => p.hasActiveSession) || [];

  if (activeSessions.length === 0) {
    return <div className="text-xs text-[var(--text-muted)] font-mono">No active sessions</div>;
  }

  return (
    <div className="space-y-2">
      {activeSessions.map(project => (
        <div
          key={project.path}
          className="flex items-center gap-2 text-xs font-mono group cursor-pointer hover:bg-white/5 -mx-1 px-1 py-0.5 rounded"
          onClick={() => onSelectProject?.(project)}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="flex-1 truncate text-[var(--text-secondary)]">{project.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onKillSession?.(project.path); }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-opacity"
            title="Kill session"
          >
            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// Main Component
export default function RightSidebar({
  selectedProject,
  projects = [],
  onKillSession,
  onSelectProject,
  onOpenAdmin,
}) {
  const { containerRef, scrollRef } = useScrollCapture();
  const activeSessionCount = projects?.filter(p => p.hasActiveSession).length || 0;

  return (
    <aside ref={containerRef} className="w-64 h-full flex-shrink-0 flex flex-col bg-[var(--bg-primary)] border-l border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-[var(--accent-primary)] font-mono tracking-wide">
          {selectedProject?.name || 'PROJECT'}
        </h2>
        {onOpenAdmin && (
          <button
            onClick={() => onOpenAdmin()}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Open Admin"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Panels */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        <Panel id="system" title="System" icon="📊" defaultExpanded={true}>
          <SystemStatsPanel />
        </Panel>

        <Panel id="project" title="Project Info" icon="📁" defaultExpanded={true}>
          <ProjectInfoPanel project={selectedProject} />
        </Panel>

        <Panel id="git" title="Git" icon="🔀" defaultExpanded={true}>
          <GitPanel project={selectedProject} />
        </Panel>

        <Panel id="docker" title="Docker" icon="🐳" defaultExpanded={true}>
          <DockerPanel project={selectedProject} />
        </Panel>

        <Panel id="cloudflare" title="Cloudflare" icon="☁️" defaultExpanded={true}>
          <CloudflarePanel project={selectedProject} onOpenAdmin={onOpenAdmin} />
        </Panel>

        <Panel
          id="sessions"
          title="Active Sessions"
          icon="💻"
          defaultExpanded={false}
          badge={activeSessionCount}
          badgeColor={activeSessionCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : undefined}
        >
          <SessionsPanel projects={projects} onKillSession={onKillSession} onSelectProject={onSelectProject} />
        </Panel>
      </div>
    </aside>
  );
}

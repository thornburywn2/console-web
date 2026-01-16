import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Constants
const LAST_ACCESSED_KEY = 'cw-last-accessed';
const DASHBOARD_LAYOUT_KEY = 'cw-dashboard-layout';

// Widget type configurations
const WIDGET_TYPES = {
  quickStats: {
    title: 'Quick Stats',
    icon: '📊',
    description: 'Projects, sessions, containers overview',
    color: '#06b6d4',
    defaultSize: 'full',
    row: 'top',
  },
  gitStatus: {
    title: 'Git Status',
    icon: '🔀',
    description: 'Repos with uncommitted changes',
    color: '#f59e0b',
    defaultSize: 'medium',
  },
  activeSessions: {
    title: 'Active Sessions',
    icon: '💻',
    description: 'Running terminal sessions',
    color: '#22c55e',
    defaultSize: 'medium',
  },
  recentProjects: {
    title: 'Recent Projects',
    icon: '📁',
    description: 'Recently accessed projects',
    color: '#8b5cf6',
    defaultSize: 'large',
  },
  recentCommits: {
    title: 'Recent Commits',
    icon: '📝',
    description: 'Latest git commits',
    color: '#ec4899',
    defaultSize: 'medium',
  },
  docker: {
    title: 'Docker',
    icon: '🐳',
    description: 'Container status',
    color: '#3b82f6',
    defaultSize: 'medium',
  },
  activePorts: {
    title: 'Active Ports',
    icon: '🔌',
    description: 'Listening ports and services',
    color: '#14b8a6',
    defaultSize: 'medium',
  },
  aiUsage: {
    title: 'AI Usage',
    icon: '🤖',
    description: 'Token usage and costs',
    color: '#a855f7',
    defaultSize: 'small',
  },
  diskUsage: {
    title: 'Disk Usage',
    icon: '💾',
    description: 'Project storage consumption',
    color: '#f97316',
    defaultSize: 'medium',
  },
  projectHealth: {
    title: 'Project Health',
    icon: '❤️',
    description: 'Health scores by project',
    color: '#ef4444',
    defaultSize: 'medium',
  },
  techStack: {
    title: 'Tech Stack',
    icon: '🛠️',
    description: 'Technologies across projects',
    color: '#6366f1',
    defaultSize: 'medium',
  },
  securityAlerts: {
    title: 'Security Alerts',
    icon: '🛡️',
    description: 'Vulnerability warnings',
    color: '#dc2626',
    defaultSize: 'small',
  },
};

// Size configurations
const SIZE_OPTIONS = {
  small: { label: 'S', maxHeight: 150 },
  medium: { label: 'M', maxHeight: 250 },
  large: { label: 'L', maxHeight: 400 },
  full: { label: 'F', maxHeight: null },
};

// Default layout
const DEFAULT_LAYOUT = [
  { id: 'quickStats', type: 'quickStats', size: 'full' },
  { id: 'gitStatus', type: 'gitStatus', size: 'medium' },
  { id: 'activeSessions', type: 'activeSessions', size: 'medium' },
  { id: 'recentProjects', type: 'recentProjects', size: 'large' },
  { id: 'recentCommits', type: 'recentCommits', size: 'medium' },
  { id: 'docker', type: 'docker', size: 'medium' },
  { id: 'activePorts', type: 'activePorts', size: 'medium' },
  { id: 'aiUsage', type: 'aiUsage', size: 'small' },
  { id: 'diskUsage', type: 'diskUsage', size: 'medium' },
  { id: 'projectHealth', type: 'projectHealth', size: 'medium' },
  { id: 'techStack', type: 'techStack', size: 'medium' },
];

/**
 * Home Dashboard - Customizable widget-based dashboard
 */
function HomeDashboard({ onSelectProject, projects = [] }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    projectsExtended: [],
    system: null,
    containers: [],
    dashboard: null,
  });

  // Widget state
  const [widgets, setWidgets] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  // Load layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch {
        setWidgets(DEFAULT_LAYOUT);
      }
    } else {
      setWidgets(DEFAULT_LAYOUT);
    }
  }, []);

  // Save layout
  const saveLayout = useCallback((newWidgets) => {
    localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(newWidgets));
    setWidgets(newWidgets);
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, systemRes, containersRes, dashboardRes] = await Promise.all([
        fetch('/api/admin/projects-extended'),
        fetch('/api/admin/system'),
        fetch('/api/docker/containers?all=true').catch(() => ({ ok: false })),
        fetch('/api/dashboard').catch(() => ({ ok: false })),
      ]);

      const projectsExtended = projectsRes.ok ? await projectsRes.json() : [];
      const system = systemRes.ok ? await systemRes.json() : null;
      const containers = containersRes.ok ? await containersRes.json() : [];
      const dashboard = dashboardRes.ok ? await dashboardRes.json() : null;

      setData({ projectsExtended, system, containers, dashboard });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Widget handlers
  const handleRemoveWidget = useCallback((widgetId) => {
    saveLayout(widgets.filter(w => w.id !== widgetId));
  }, [widgets, saveLayout]);

  const handleAddWidget = useCallback((type) => {
    const config = WIDGET_TYPES[type];
    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      size: config.defaultSize || 'medium',
    };
    saveLayout([...widgets, newWidget]);
    setShowAddModal(false);
  }, [widgets, saveLayout]);

  const handleSizeChange = useCallback((widgetId, newSize) => {
    saveLayout(widgets.map(w => w.id === widgetId ? { ...w, size: newSize } : w));
  }, [widgets, saveLayout]);

  const handleDragStart = useCallback((widgetId) => {
    setDraggedWidget(widgetId);
  }, []);

  const handleDragOver = useCallback((e, targetId) => {
    e.preventDefault();
    if (draggedWidget && targetId !== draggedWidget) {
      setDropTargetId(targetId);
    }
  }, [draggedWidget]);

  const handleDrop = useCallback((targetId) => {
    if (!draggedWidget || draggedWidget === targetId) {
      setDraggedWidget(null);
      setDropTargetId(null);
      return;
    }

    const dragIndex = widgets.findIndex(w => w.id === draggedWidget);
    const dropIndex = widgets.findIndex(w => w.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(dragIndex, 1);
    newWidgets.splice(dropIndex, 0, removed);

    saveLayout(newWidgets);
    setDraggedWidget(null);
    setDropTargetId(null);
  }, [draggedWidget, widgets, saveLayout]);

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
    setDropTargetId(null);
  }, []);

  const handleResetLayout = useCallback(() => {
    saveLayout(DEFAULT_LAYOUT);
  }, [saveLayout]);

  // Computed data
  const recentProjects = useMemo(() => {
    try {
      const lastAccessed = JSON.parse(localStorage.getItem(LAST_ACCESSED_KEY) || '{}');
      return data.projectsExtended
        .filter(p => lastAccessed[p.path])
        .map(p => ({ ...p, lastAccessed: lastAccessed[p.path] }))
        .sort((a, b) => b.lastAccessed - a.lastAccessed)
        .slice(0, 8);
    } catch {
      return [];
    }
  }, [data.projectsExtended]);

  const technologies = useMemo(() => {
    const techCounts = {};
    data.projectsExtended.forEach(p => {
      (p.technologies || []).forEach(tech => {
        techCounts[tech] = (techCounts[tech] || 0) + 1;
      });
    });
    return Object.entries(techCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [data.projectsExtended]);

  const stats = useMemo(() => {
    const total = data.projectsExtended.length;
    const withClaudeMd = data.projectsExtended.filter(p => p.hasClaudeMd).length;
    return { total, withClaudeMd };
  }, [data.projectsExtended]);

  const containerStats = useMemo(() => {
    const running = data.containers.filter(c => c.state === 'running').length;
    return { running, total: data.containers.length };
  }, [data.containers]);

  const activeSessions = data.dashboard?.shpoolSessions || [];
  const gitStatuses = data.dashboard?.gitStatuses || [];
  const recentCommits = data.dashboard?.recentCommits || [];
  const activePorts = data.dashboard?.activePorts || [];
  const diskUsage = data.dashboard?.diskUsage || [];
  const aiUsage = data.dashboard?.aiUsage || {};
  const securityAlerts = data.dashboard?.securityAlerts || [];

  // Derive health scores from projectsExtended completion data (same source as sidebar widget)
  const healthScores = useMemo(() => {
    return data.projectsExtended
      .filter(p => p.completion?.percentage !== undefined)
      .map(p => ({
        name: p.name,
        path: p.path,
        score: Math.round(p.completion.percentage)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [data.projectsExtended]);

  // Format helpers
  const formatUptime = (s) => {
    if (!s) return '0m';
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatTimeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'Just now';
  };

  const formatBytes = (b) => {
    if (!b) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTokens = (t) => t >= 1000000 ? `${(t/1000000).toFixed(1)}M` : t >= 1000 ? `${(t/1000).toFixed(1)}K` : t.toString();

  // Widget content renderer
  const renderWidgetContent = useCallback((widget) => {
    const size = SIZE_OPTIONS[widget.size] || SIZE_OPTIONS.medium;
    const maxH = size.maxHeight ? `max-h-[${size.maxHeight}px]` : '';

    switch (widget.type) {
      case 'quickStats':
        return (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <MiniStat icon="📁" value={stats.total} label="Projects" color="var(--accent-primary)" />
            <MiniStat icon="💻" value={activeSessions.length} label="Sessions" color="var(--status-success)" />
            <MiniStat icon="🐳" value={containerStats.running} label="Containers" color="var(--accent-secondary)" />
            <MiniStat icon="🔀" value={gitStatuses.length} label="Dirty" color={gitStatuses.length > 0 ? 'var(--status-warning)' : 'var(--text-muted)'} />
            <MiniStat icon="⚡" value={`${Math.round(data.system?.cpu?.usage || 0)}%`} label="CPU" color="var(--accent-tertiary)" />
            <MiniStat icon="⏱️" value={formatUptime(data.system?.uptime)} label="Uptime" color="var(--text-secondary)" />
          </div>
        );

      case 'gitStatus':
        return gitStatuses.length > 0 ? (
          <div className={`space-y-1.5 overflow-y-auto ${maxH}`}>
            {gitStatuses.slice(0, 8).map(repo => (
              <div key={repo.path} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white/5" style={{ background: 'var(--bg-glass)' }}
                onClick={() => { const p = data.projectsExtended.find(pr => pr.path === repo.path); if (p) onSelectProject?.(p); }}>
                <div className="w-2 h-2 rounded-full" style={{ background: repo.dirty ? 'var(--status-warning)' : 'var(--status-success)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{repo.name}</div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{repo.branch}</span>
                    {repo.staged > 0 && <span className="text-green-400">+{repo.staged}</span>}
                    {repo.unstaged > 0 && <span className="text-yellow-400">~{repo.unstaged}</span>}
                    {repo.untracked > 0 && <span className="text-red-400">?{repo.untracked}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="All repos clean" icon="✓" color="var(--status-success)" />;

      case 'activeSessions':
        return activeSessions.length > 0 ? (
          <div className={`space-y-1 overflow-y-auto ${maxH}`}>
            {activeSessions.slice(0, 10).map((session, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white/5" style={{ background: 'var(--bg-glass)' }}
                onClick={() => { const p = data.projectsExtended.find(pr => pr.name === session.replace('sp-', '')); if (p) onSelectProject?.(p); }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success)' }} />
                <span className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{session.replace('sp-', '')}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No active sessions" />;

      case 'recentProjects':
        return recentProjects.length > 0 ? (
          <div className={`space-y-1 overflow-y-auto ${maxH}`}>
            {recentProjects.map(project => (
              <div key={project.path} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white/5" style={{ background: 'var(--bg-glass)' }}
                onClick={() => onSelectProject?.(project)}>
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: project.hasActiveSession ? 'rgba(34,197,94,0.2)' : 'var(--bg-surface)' }}>
                  {project.hasActiveSession ? <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success)' }} /> : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>📁</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{project.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(project.lastAccessed)}</div>
                </div>
                {project.hasClaudeMd && <span className="text-xs px-1 rounded" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>AI</span>}
              </div>
            ))}
          </div>
        ) : <EmptyState text="No recent projects" />;

      case 'recentCommits':
        return recentCommits.length > 0 ? (
          <div className={`space-y-1 overflow-y-auto ${maxH}`}>
            {recentCommits.slice(0, 10).map((commit, i) => (
              <div key={i} className="p-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--accent-secondary)' }}>{commit.hash}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{commit.project}</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{commit.timeAgo}</span>
                </div>
                <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{commit.message}</div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No recent commits" />;

      case 'docker':
        return data.containers.length > 0 ? (
          <div className={`space-y-1 overflow-y-auto ${maxH}`}>
            {data.containers.slice(0, 10).map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: c.state === 'running' ? 'var(--status-success)' : 'var(--status-error)' }} />
                <span className="text-xs font-mono truncate flex-1" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.state}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No containers" />;

      case 'activePorts':
        return activePorts.length > 0 ? (
          <div className={`space-y-1 overflow-y-auto ${maxH}`}>
            {activePorts.slice(0, 10).map((port, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{port.port}</span>
                <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{port.process || port.name || 'Unknown'}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No active ports" />;

      case 'aiUsage':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-glass)' }}>
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-primary)' }}>{formatTokens(aiUsage.totalTokens || 0)}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Tokens</div>
            </div>
            <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-glass)' }}>
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--status-success)' }}>${(aiUsage.costEstimate || 0).toFixed(2)}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. Cost</div>
            </div>
          </div>
        );

      case 'diskUsage':
        return diskUsage.length > 0 ? (
          <div className={`space-y-2 overflow-y-auto ${maxH}`}>
            {diskUsage.slice(0, 8).map(p => (
              <div key={p.path} className="flex items-center gap-2">
                <span className="text-xs font-mono truncate w-20" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.size / (diskUsage[0]?.size || 1)) * 100)}%`, background: 'var(--accent-primary)' }} />
                </div>
                <span className="text-xs font-mono w-14 text-right" style={{ color: 'var(--text-muted)' }}>{formatBytes(p.size)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No disk data" />;

      case 'projectHealth':
        return healthScores.length > 0 ? (
          <div className={`space-y-2 overflow-y-auto ${maxH}`}>
            {healthScores.slice(0, 8).map(p => (
              <div key={p.path} className="flex items-center gap-2 cursor-pointer" onClick={() => { const pr = data.projectsExtended.find(x => x.path === p.path); if (pr) onSelectProject?.(pr); }}>
                <span className="text-xs font-mono truncate w-20" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}>
                  <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: p.score >= 80 ? 'var(--status-success)' : p.score >= 60 ? 'var(--status-warning)' : 'var(--status-error)' }} />
                </div>
                <span className="text-xs font-mono w-10 text-right" style={{ color: p.score >= 80 ? 'var(--status-success)' : p.score >= 60 ? 'var(--status-warning)' : 'var(--status-error)' }}>{p.score}%</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No health data" />;

      case 'techStack':
        return technologies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {technologies.map(([tech, count]) => (
              <TechBadge key={tech} name={tech} count={count} />
            ))}
          </div>
        ) : <EmptyState text="No tech data" />;

      case 'securityAlerts':
        return securityAlerts.length > 0 ? (
          <div className="space-y-1.5">
            {securityAlerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : alert.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{alert.severity}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{alert.project}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No alerts" icon="✓" color="var(--status-success)" />;

      default:
        return <EmptyState text="Unknown widget" />;
    }
  }, [data, stats, containerStats, activeSessions, gitStatuses, recentCommits, activePorts, diskUsage, aiUsage, healthScores, securityAlerts, technologies, recentProjects, onSelectProject, formatUptime, formatTimeAgo, formatBytes, formatTokens]);

  // Get available widgets not yet added
  const availableWidgets = useMemo(() => {
    const usedTypes = new Set(widgets.map(w => w.type));
    return Object.entries(WIDGET_TYPES).filter(([type]) => !usedTypes.has(type));
  }, [widgets]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
          </div>
          <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-primary-glow)', border: '1px solid var(--accent-primary)' }}>
            <span style={{ color: 'var(--accent-primary)' }}>🏠</span>
          </div>
          <div>
            <h1 className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.total} projects • {activeSessions.length} active</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <button onClick={handleResetLayout} className="px-2 py-1 text-xs rounded" style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
                Reset
              </button>
              <button onClick={() => setShowAddModal(true)} className="px-2 py-1 text-xs rounded flex items-center gap-1" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>
                + Add
              </button>
            </>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${isEditing ? 'ring-2' : ''}`}
            style={{ background: isEditing ? 'var(--status-warning)' : 'var(--bg-glass)', color: isEditing ? '#000' : 'var(--text-secondary)', ringColor: 'var(--status-warning)' }}
          >
            {isEditing ? '✓ Done' : '✎ Edit'}
          </button>
          <button onClick={fetchData} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
            🔄
          </button>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map(widget => {
            const config = WIDGET_TYPES[widget.type];
            if (!config) return null;

            const isFullWidth = widget.type === 'quickStats';
            const isDragging = draggedWidget === widget.id;
            const isDropTarget = dropTargetId === widget.id;

            return (
              <div
                key={widget.id}
                className={`rounded-xl overflow-hidden transition-all ${isFullWidth ? 'md:col-span-2 lg:col-span-3' : ''} ${isDragging ? 'opacity-50 scale-95' : ''} ${isDropTarget ? 'ring-2 ring-offset-2' : ''} ${isEditing ? 'cursor-grab' : ''}`}
                style={{ background: 'var(--bg-elevated)', border: `1px solid ${isDropTarget ? config.color : 'var(--border-subtle)'}`, ringColor: config.color }}
                draggable={isEditing}
                onDragStart={() => handleDragStart(widget.id)}
                onDragOver={(e) => handleDragOver(e, widget.id)}
                onDrop={() => handleDrop(widget.id)}
                onDragEnd={handleDragEnd}
              >
                {/* Widget Header */}
                <div className="flex items-center justify-between px-3 py-2" style={{ background: `${config.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{config.title}</span>
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-1">
                      {Object.entries(SIZE_OPTIONS).map(([key, { label }]) => (
                        <button
                          key={key}
                          onClick={() => handleSizeChange(widget.id, key)}
                          className={`w-5 h-5 text-xs rounded ${widget.size === key ? 'font-bold' : 'opacity-50'}`}
                          style={{ background: widget.size === key ? `${config.color}30` : 'transparent', color: config.color }}
                        >
                          {label}
                        </button>
                      ))}
                      <button onClick={() => handleRemoveWidget(widget.id)} className="w-5 h-5 text-xs rounded hover:bg-red-500/20 text-red-400 ml-1">✕</button>
                    </div>
                  )}
                </div>
                {/* Widget Content */}
                <div className="p-3">
                  {renderWidgetContent(widget)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state when no widgets */}
        {widgets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No widgets. Click "Edit" then "Add" to customize your dashboard.</p>
          </div>
        )}
      </div>

      {/* Add Widget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Widget</h2>
              <button onClick={() => setShowAddModal(false)} className="text-xl" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            {availableWidgets.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableWidgets.map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => handleAddWidget(type)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/5"
                    style={{ background: 'var(--bg-glass)' }}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{config.title}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{config.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>All widgets have been added.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mini stat component
function MiniStat({ icon, value, label, color }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-glass)' }}>
      <div className="text-sm mb-0.5">{icon}</div>
      <div className="text-base font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

// Empty state component
function EmptyState({ text, icon, color }) {
  return (
    <div className="text-center py-4">
      {icon && <div className="text-xl mb-1" style={{ color: color || 'var(--text-muted)' }}>{icon}</div>}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  );
}

// Tech badge component
function TechBadge({ name, count }) {
  const colors = { React: '#61dafb', TypeScript: '#3178c6', JavaScript: '#f7df1e', 'Node.js': '#68a063', Python: '#3776ab', Docker: '#2496ed', Tailwind: '#38bdf8' };
  const color = colors[name] || 'var(--accent-primary)';
  return (
    <span className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {name} ({count})
    </span>
  );
}

export default HomeDashboard;

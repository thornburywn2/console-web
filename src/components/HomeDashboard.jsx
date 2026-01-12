import { useState, useEffect, useCallback, useMemo } from 'react';

// Constants
const LAST_ACCESSED_KEY = 'cw-last-accessed';

/**
 * Home Dashboard - Comprehensive 10,000 foot view
 * Shows: Git status, Quick actions, Recent activity, Ports, Disk usage, AI usage, Health scores
 */
function HomeDashboard({ onSelectProject, projects = [] }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    projectsExtended: [],
    system: null,
    containers: [],
    dashboard: null,
  });

  // Fetch all dashboard data
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

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Get recent projects from localStorage
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

  // Aggregate technologies
  const technologies = useMemo(() => {
    const techCounts = {};
    data.projectsExtended.forEach(p => {
      (p.technologies || []).forEach(tech => {
        techCounts[tech] = (techCounts[tech] || 0) + 1;
      });
    });
    return Object.entries(techCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [data.projectsExtended]);

  // Project stats
  const stats = useMemo(() => {
    const total = data.projectsExtended.length;
    const withClaudeMd = data.projectsExtended.filter(p => p.hasClaudeMd).length;
    const withSessions = data.projectsExtended.filter(p => p.hasActiveSession).length;
    const avgCompletion = total > 0
      ? Math.round(data.projectsExtended.reduce((sum, p) => sum + (p.completion?.percentage || 0), 0) / total)
      : 0;
    return { total, withClaudeMd, withSessions, avgCompletion };
  }, [data.projectsExtended]);

  // Container stats
  const containerStats = useMemo(() => {
    const running = data.containers.filter(c => c.state === 'running').length;
    const total = data.containers.length;
    return { running, total };
  }, [data.containers]);

  // Format helpers
  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTokens = (tokens) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const activeSessions = data.dashboard?.tmuxSessions || data.system?.sessions?.tmux || [];
  const gitStatuses = data.dashboard?.gitStatuses || [];
  const recentCommits = data.dashboard?.recentCommits || [];
  const activePorts = data.dashboard?.activePorts || [];
  const diskUsage = data.dashboard?.diskUsage || [];
  const aiUsage = data.dashboard?.aiUsage || {};
  const healthScores = data.dashboard?.healthScores || [];
  const securityAlerts = data.dashboard?.securityAlerts || [];

  // Quick actions
  const handleQuickAction = async (action) => {
    switch (action) {
      case 'pull-all':
        alert('Pull All - Coming soon');
        break;
      case 'refresh':
        setLoading(true);
        await fetchData();
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
            <div className="absolute inset-2 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-secondary)', borderTopColor: 'transparent', animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      {/* Compact Header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-primary-glow)', border: '1px solid var(--accent-primary)' }}>
            <svg className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {stats.total} projects • {activeSessions.length} active • {containerStats.running} containers
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuickAction('refresh')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <RefreshIcon />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <QuickStat icon={<FolderIcon />} value={stats.total} label="Projects" color="var(--accent-primary)" />
          <QuickStat icon={<TerminalIcon />} value={activeSessions.length} label="Sessions" color="var(--status-success)" />
          <QuickStat icon={<DockerIcon />} value={containerStats.running} label="Containers" color="var(--accent-secondary)" />
          <QuickStat icon={<GitIcon />} value={gitStatuses.length} label="Dirty Repos" color={gitStatuses.length > 0 ? 'var(--status-warning)' : 'var(--text-muted)'} />
          <QuickStat icon={<CpuIcon />} value={`${Math.round(data.system?.cpu?.usage || 0)}%`} label="CPU" color="var(--accent-tertiary)" />
          <QuickStat icon={<ClockIcon />} value={formatUptime(data.system?.uptime)} label="Uptime" color="var(--text-secondary)" />
        </div>
      </div>

      {/* Main Grid - 3 columns on large screens */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Column 1 */}
          <div className="space-y-4">
            {/* Git Status Overview */}
            <DashboardCard title="Git Status" icon={<GitIcon />} badge={gitStatuses.length > 0 ? gitStatuses.length : null} badgeColor="var(--status-warning)">
              {gitStatuses.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {gitStatuses.slice(0, 6).map(repo => (
                    <div
                      key={repo.path}
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: 'var(--bg-glass)' }}
                      onClick={() => {
                        const project = data.projectsExtended.find(p => p.path === repo.path);
                        if (project) onSelectProject?.(project);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: repo.dirty ? 'var(--status-warning)' : 'var(--status-success)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{repo.name}</div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{repo.branch}</span>
                          {repo.staged > 0 && <span className="text-green-400">+{repo.staged}</span>}
                          {repo.unstaged > 0 && <span className="text-yellow-400">~{repo.unstaged}</span>}
                          {repo.untracked > 0 && <span className="text-red-400">?{repo.untracked}</span>}
                          {repo.ahead > 0 && <span className="text-blue-400">↑{repo.ahead}</span>}
                          {repo.behind > 0 && <span className="text-purple-400">↓{repo.behind}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-2xl mb-1" style={{ color: 'var(--status-success)' }}>✓</div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All repos clean</p>
                </div>
              )}
            </DashboardCard>

            {/* Active Sessions */}
            <DashboardCard title="Active Sessions" icon={<TerminalIcon />} badge={activeSessions.length}>
              {activeSessions.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activeSessions.slice(0, 8).map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: 'var(--bg-glass)' }}
                      onClick={() => {
                        const projectName = session.replace('cp-', '');
                        const project = data.projectsExtended.find(p => p.name === projectName);
                        if (project) onSelectProject?.(project);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success)' }} />
                      <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                        {session.replace('cp-', '')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No active sessions" />
              )}
            </DashboardCard>

            {/* Security Alerts */}
            {securityAlerts.length > 0 && (
              <DashboardCard title="Security Alerts" icon={<AlertIcon />} badge={securityAlerts.length} badgeColor="var(--status-error)">
                <div className="space-y-2">
                  {securityAlerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        alert.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{alert.project}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({alert.count} issues)</span>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            )}
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            {/* Recent Projects */}
            <DashboardCard title="Recent Projects" icon={<ClockIcon />}>
              {recentProjects.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {recentProjects.map(project => (
                    <div
                      key={project.path}
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group"
                      style={{ background: 'var(--bg-glass)' }}
                      onClick={() => onSelectProject?.(project)}
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: project.hasActiveSession ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-surface)' }}
                      >
                        {project.hasActiveSession ? (
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success)' }} />
                        ) : (
                          <FolderIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>{project.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(project.lastAccessed)}</div>
                      </div>
                      {project.hasClaudeMd && (
                        <span className="text-xs px-1 rounded" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>AI</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No recent projects" />
              )}
            </DashboardCard>

            {/* Recent Commits */}
            <DashboardCard title="Recent Commits" icon={<CommitIcon />}>
              {recentCommits.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {recentCommits.slice(0, 8).map((commit, idx) => (
                    <div key={idx} className="p-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--accent-secondary)' }}>
                          {commit.hash}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{commit.project}</span>
                        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{commit.timeAgo}</span>
                      </div>
                      <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{commit.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No recent commits" />
              )}
            </DashboardCard>
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            {/* Docker Containers */}
            <DashboardCard title="Docker" icon={<DockerIcon />} badge={`${containerStats.running}/${containerStats.total}`}>
              {data.containers.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {data.containers.slice(0, 8).map(container => (
                    <div key={container.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: container.state === 'running' ? 'var(--status-success)' : 'var(--status-error)' }}
                      />
                      <span className="text-xs font-mono truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                        {container.name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{container.state}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No containers" />
              )}
            </DashboardCard>

            {/* Active Ports */}
            <DashboardCard title="Active Ports" icon={<PortIcon />} badge={activePorts.length}>
              {activePorts.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activePorts.slice(0, 8).map((port, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{port.port}</span>
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{port.process || port.name || 'Unknown'}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{port.protocol || 'tcp'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No active ports" />
              )}
            </DashboardCard>

            {/* AI Usage */}
            <DashboardCard title="AI Usage (7d)" icon={<AIIcon />}>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-glass)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-primary)' }}>
                    {formatTokens(aiUsage.totalTokens || 0)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Tokens</div>
                </div>
                <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-glass)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: 'var(--status-success)' }}>
                    ${(aiUsage.costEstimate || 0).toFixed(2)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. Cost</div>
                </div>
                <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-glass)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-secondary)' }}>
                    {aiUsage.requests || 0}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Requests</div>
                </div>
                <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-glass)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-tertiary)' }}>
                    {formatTokens(aiUsage.inputTokens || 0)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Input</div>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>

      {/* Bottom Row - Full Width Sections */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Disk Usage */}
          <DashboardCard title="Disk Usage" icon={<DiskIcon />}>
            {diskUsage.length > 0 ? (
              <div className="space-y-2">
                {diskUsage.slice(0, 6).map(project => (
                  <div key={project.path} className="flex items-center gap-2">
                    <span className="text-xs font-mono truncate w-24" style={{ color: 'var(--text-secondary)' }}>{project.name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (project.size / (diskUsage[0]?.size || 1)) * 100)}%`,
                          background: 'var(--accent-primary)'
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono w-16 text-right" style={{ color: 'var(--text-muted)' }}>
                      {formatBytes(project.size)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No disk data" />
            )}
          </DashboardCard>

          {/* Project Health */}
          <DashboardCard title="Project Health" icon={<HealthIcon />}>
            {healthScores.length > 0 ? (
              <div className="space-y-2">
                {healthScores.slice(0, 6).map(project => (
                  <div
                    key={project.path}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      const p = data.projectsExtended.find(pr => pr.path === project.path);
                      if (p) onSelectProject?.(p);
                    }}
                  >
                    <span className="text-xs font-mono truncate w-24" style={{ color: 'var(--text-secondary)' }}>{project.name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${project.score}%`,
                          background: project.score >= 80 ? 'var(--status-success)' :
                                     project.score >= 60 ? 'var(--status-warning)' : 'var(--status-error)'
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono w-10 text-right" style={{
                      color: project.score >= 80 ? 'var(--status-success)' :
                             project.score >= 60 ? 'var(--status-warning)' : 'var(--status-error)'
                    }}>
                      {project.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No health data" />
            )}
          </DashboardCard>

          {/* Tech Stack */}
          <DashboardCard title="Tech Stack" icon={<CodeIcon />}>
            {technologies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {technologies.map(([tech, count]) => (
                  <TechBadge key={tech} name={tech} count={count} />
                ))}
              </div>
            ) : (
              <EmptyState message="No technology data" />
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

// Quick Stat Component
function QuickStat({ icon, value, label, color }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

// Dashboard Card Component
function DashboardCard({ title, icon, badge, badgeColor, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
          <h3 className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        {badge !== null && badge !== undefined && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{ background: badgeColor ? `${badgeColor}20` : 'var(--accent-primary-glow)', color: badgeColor || 'var(--accent-primary)' }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// Tech Badge Component
function TechBadge({ name, count }) {
  const colors = {
    'React': '#61dafb', 'TypeScript': '#3178c6', 'JavaScript': '#f7df1e', 'Node.js': '#68a063',
    'Python': '#3776ab', 'Go': '#00add8', 'Rust': '#dea584', 'Docker': '#2496ed',
    'PostgreSQL': '#336791', 'Tailwind': '#38bdf8', 'Prisma': '#2d3748', 'Express': '#000000'
  };
  const color = colors[name] || 'var(--accent-primary)';

  return (
    <span className="px-2 py-1 rounded text-xs font-mono" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {name} <span style={{ opacity: 0.7 }}>({count})</span>
    </span>
  );
}

// Empty State Component
function EmptyState({ message }) {
  return (
    <div className="text-center py-4">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}

// Icons
function FolderIcon({ className = "w-5 h-5" }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
}

function TerminalIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}

function DockerIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
}

function GitIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
}

function CpuIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m14 0h2M3 15h2m14 0h2M7 7h10v10H7V7z" /></svg>;
}

function ClockIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function CodeIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
}

function RefreshIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
}

function CommitIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={1.5} d="M12 3v6m0 6v6" /></svg>;
}

function PortIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
}

function AIIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}

function DiskIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>;
}

function HealthIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
}

function AlertIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}

export default HomeDashboard;

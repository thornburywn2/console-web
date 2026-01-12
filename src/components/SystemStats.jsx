import { useState, useEffect, useCallback } from 'react';

function SystemStats() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/system');
      if (!response.ok) throw new Error('Failed to fetch system stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching system stats:', err);
      setError('Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s for real-time updates
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <svg className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-secondary)' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs rounded px-2 py-1 font-mono" style={{ color: 'var(--status-error)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        {error}
      </div>
    );
  }

  const { cpu, memory, disk, uptime, loadAvg } = stats || {};

  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Get color based on usage percentage
  const getUsageColor = (percent) => {
    if (percent >= 90) return 'red';
    if (percent >= 70) return 'yellow';
    return 'green';
  };

  return (
    <div className="space-y-2">
      {/* CPU */}
      <StatBar
        label="CPU"
        value={cpu?.usage || 0}
        suffix="%"
        detail={cpu?.model ? cpu.model.split(' ')[0] : null}
        color={getUsageColor(cpu?.usage || 0)}
      />

      {/* Memory */}
      <StatBar
        label="MEM"
        value={memory?.usedPercent || 0}
        suffix="%"
        detail={memory ? `${formatBytes(memory.used)}/${formatBytes(memory.total)}` : null}
        color={getUsageColor(memory?.usedPercent || 0)}
      />

      {/* Disk */}
      <StatBar
        label="DISK"
        value={disk?.usedPercent || 0}
        suffix="%"
        detail={disk ? `${formatBytes(disk.used)}/${formatBytes(disk.total)}` : null}
        color={getUsageColor(disk?.usedPercent || 0)}
      />

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[10px] font-mono pt-1" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        <span title="Load Average">
          LOAD: {loadAvg ? loadAvg.map((l) => l.toFixed(2)).join(' ') : 'N/A'}
        </span>
        <span title="System Uptime">UP: {formatUptime(uptime)}</span>
      </div>
    </div>
  );
}

// Progress bar component for stats
function StatBar({ label, value, suffix = '', detail, color = 'green' }) {
  const percent = Math.min(100, Math.max(0, value));

  const colorMap = {
    green: 'var(--accent-primary)',
    yellow: 'var(--status-warning)',
    red: 'var(--status-error)',
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          {detail && <span style={{ color: 'var(--text-tertiary)' }}>{detail}</span>}
          <span className="font-semibold" style={{ color: colorMap[color] }}>
            {value.toFixed(0)}
            {suffix}
          </span>
        </div>
      </div>
      <div className="stat-bar">
        <div
          className={`stat-bar-fill ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (!bytes) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)}${sizes[i]}`;
}

export default SystemStats;

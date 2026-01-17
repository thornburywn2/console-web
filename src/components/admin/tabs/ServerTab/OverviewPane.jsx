/**
 * OverviewPane Component
 * System overview with key metrics (new - combines quick stats)
 */

import { useState, useEffect, useCallback } from 'react';
import { formatBytes, formatUptime } from '../../utils';

export function OverviewPane() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchSystemInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/system');
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
        setLastUpdated(new Date());
      } else {
        setError(`Failed to fetch system info (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error('Error fetching system info:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 10000);
    return () => clearInterval(interval);
  }, [fetchSystemInfo]);

  // Show error state with retry button
  if (error && !systemInfo) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="hacker-card p-6 text-center border-hacker-error/50 bg-hacker-error/10">
          <div className="text-4xl mb-4">&#9888;</div>
          <h3 className="text-lg font-mono text-hacker-error mb-2">
            Failed to Load System Info
          </h3>
          <p className="text-sm text-hacker-text-dim mb-4 font-mono">
            {error}
          </p>
          <button
            onClick={fetchSystemInfo}
            disabled={loading}
            className="hacker-btn"
          >
            {loading ? '[RETRYING...]' : '[RETRY]'}
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner on initial load
  if (!systemInfo && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-hacker-green border-t-transparent rounded-full" />
      </div>
    );
  }

  // Handle edge case where neither data nor error exists
  if (!systemInfo) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-hacker-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner (shown when refresh fails but we have stale data) */}
      {error && systemInfo && (
        <div className="hacker-card border-hacker-error/50 bg-hacker-error/10 flex items-center justify-between">
          <p className="text-sm text-hacker-error font-mono">{error}</p>
          <button
            onClick={fetchSystemInfo}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[RETRYING...]' : '[RETRY]'}
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-green">{Math.round(systemInfo.cpu?.usage || 0)}%</div>
          <div className="stat-label">CPU USAGE</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{Math.round(systemInfo.memory?.usedPercent || 0)}%</div>
          <div className="stat-label">MEMORY</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-purple">{Math.round(systemInfo.disk?.usedPercent || 0)}%</div>
          <div className="stat-label">DISK</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-warning">{formatUptime(systemInfo.uptime || 0)}</div>
          <div className="stat-label">UPTIME</div>
        </div>
      </div>

      {/* System Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* CPU Info */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> CPU
          </h4>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">model</span>
              <span className="text-hacker-text truncate max-w-[60%]">{systemInfo.cpu?.model || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">cores</span>
              <span className="text-hacker-cyan">{systemInfo.cpu?.count || 'N/A'}</span>
            </div>
          </div>
          {/* CPU Usage Bar */}
          <div className="mt-4">
            <div className="hacker-progress h-2">
              <div
                className="hacker-progress-bar"
                style={{
                  width: `${systemInfo.cpu?.usage || 0}%`,
                  background: systemInfo.cpu?.usage > 80 ? '#ff3333' : '#00ff41'
                }}
              />
            </div>
          </div>
        </div>

        {/* Memory Info */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> MEMORY
          </h4>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">total</span>
              <span className="text-hacker-text">{formatBytes(systemInfo.memory?.total || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">used</span>
              <span className="text-hacker-cyan">{formatBytes(systemInfo.memory?.used || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">free</span>
              <span className="text-hacker-green">{formatBytes(systemInfo.memory?.free || 0)}</span>
            </div>
          </div>
          {/* Memory Usage Bar */}
          <div className="mt-4">
            <div className="hacker-progress h-2">
              <div
                className="hacker-progress-bar"
                style={{
                  width: `${systemInfo.memory?.usedPercent || 0}%`,
                  background: systemInfo.memory?.usedPercent > 80 ? '#ff3333' : '#00d4ff'
                }}
              />
            </div>
          </div>
        </div>

        {/* Disk Info */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> DISK
          </h4>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">total</span>
              <span className="text-hacker-text">{formatBytes(systemInfo.disk?.total || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">used</span>
              <span className="text-hacker-purple">{formatBytes(systemInfo.disk?.used || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hacker-text-dim">free</span>
              <span className="text-hacker-green">{formatBytes(systemInfo.disk?.free || 0)}</span>
            </div>
          </div>
          {/* Disk Usage Bar */}
          <div className="mt-4">
            <div className="hacker-progress h-2">
              <div
                className="hacker-progress-bar"
                style={{
                  width: `${systemInfo.disk?.usedPercent || 0}%`,
                  background: systemInfo.disk?.usedPercent > 80 ? '#ff3333' : '#bd00ff'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> SYSTEM INFO
          </h4>
          <button
            onClick={fetchSystemInfo}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[REFRESHING...]' : '[REFRESH]'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
          <div>
            <span className="text-hacker-text-dim block text-xs">hostname</span>
            <span className="text-hacker-green">{systemInfo.system?.hostname || 'N/A'}</span>
          </div>
          <div>
            <span className="text-hacker-text-dim block text-xs">platform</span>
            <span className="text-hacker-text">{systemInfo.system?.platform || 'N/A'}</span>
          </div>
          <div>
            <span className="text-hacker-text-dim block text-xs">node</span>
            <span className="text-hacker-text">{systemInfo.process?.nodeVersion || 'N/A'}</span>
          </div>
          <div>
            <span className="text-hacker-text-dim block text-xs">arch</span>
            <span className="text-hacker-text">{systemInfo.system?.arch || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Load Average */}
      {systemInfo.loadAvg && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> LOAD AVERAGE
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center font-mono">
            <div>
              <div className="text-2xl font-bold text-hacker-green">{systemInfo.loadAvg[0]?.toFixed(2)}</div>
              <div className="text-xs text-hacker-text-dim">1 min</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-hacker-cyan">{systemInfo.loadAvg[1]?.toFixed(2)}</div>
              <div className="text-xs text-hacker-text-dim">5 min</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-hacker-purple">{systemInfo.loadAvg[2]?.toFixed(2)}</div>
              <div className="text-xs text-hacker-text-dim">15 min</div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-xs text-hacker-text-dim font-mono text-right">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>
    </div>
  );
}

export default OverviewPane;

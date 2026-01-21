/**
 * OverviewPane Component
 * System overview with key metrics - cohesive Panel design
 */

import { useState, useEffect } from 'react';
import { Panel, PanelGroup, InfoRow, Meter } from '../../../shared';
import { formatBytes, formatUptime } from '../../utils';
import { useApiQuery } from '../../../../hooks/useApiQuery';

// Icons
const CpuIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const MemoryIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const DiskIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const ServerIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const LoadIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export function OverviewPane() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch system info with 10-second refresh
  const {
    data: systemInfo,
    loading,
    error,
    refetch: fetchSystemInfo
  } = useApiQuery('/admin/system', {
    refetchInterval: 10000,
  });

  // Update timestamp when data changes
  useEffect(() => {
    if (systemInfo) {
      setLastUpdated(new Date());
    }
  }, [systemInfo]);

  // Show error state with retry button
  if (error && !systemInfo) {
    return (
      <div className="space-y-1 animate-fade-in">
        <Panel id="server-overview-error" title="Error" icon={ServerIcon}>
          <div className="text-center py-4">
            <p className="text-[var(--status-error)] font-mono mb-4">
              {error.getUserMessage?.() || 'Failed to load system info'}
            </p>
            <button
              onClick={fetchSystemInfo}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-mono rounded border transition-colors
                         border-[var(--border-subtle)] text-[var(--text-secondary)]
                         hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]
                         disabled:opacity-50"
            >
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  // Show loading spinner on initial load
  if (!systemInfo && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Handle edge case where neither data nor error exists
  if (!systemInfo) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const cpuUsage = Math.round(systemInfo.cpu?.usage || 0);
  const memUsage = Math.round(systemInfo.memory?.usedPercent || 0);
  const diskUsage = Math.round(systemInfo.disk?.usedPercent || 0);

  return (
    <div className="space-y-1 animate-fade-in">
      {/* Error Banner (shown when refresh fails but we have stale data) */}
      {error && systemInfo && (
        <div className="mb-2 p-3 rounded border border-[var(--status-error)]/30 bg-[var(--status-error)]/10
                        flex items-center justify-between">
          <p className="text-sm text-[var(--status-error)] font-mono">{error.getUserMessage?.() || 'Refresh failed'}</p>
          <button
            onClick={fetchSystemInfo}
            disabled={loading}
            className="px-2 py-1 text-xs font-mono rounded border transition-colors
                       border-[var(--border-subtle)] hover:border-[var(--status-error)]
                       disabled:opacity-50"
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <Panel id="server-quick-stats" title="Quick Stats" icon={ServerIcon}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
            <div className="text-2xl font-bold font-mono text-[var(--accent-primary)]">{cpuUsage}%</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">CPU</div>
          </div>
          <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
            <div className="text-2xl font-bold font-mono text-[var(--accent-secondary)]">{memUsage}%</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Memory</div>
          </div>
          <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
            <div className="text-2xl font-bold font-mono text-[var(--accent-tertiary)]">{diskUsage}%</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Disk</div>
          </div>
          <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
            <div className="text-2xl font-bold font-mono text-[var(--status-warning)]">{formatUptime(systemInfo.uptime || 0)}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Uptime</div>
          </div>
        </div>
      </Panel>

      <PanelGroup>
        {/* CPU Panel */}
        <Panel id="server-cpu" title="CPU" icon={CpuIcon}>
          <InfoRow label="Model" value={systemInfo.cpu?.model || 'N/A'} truncate />
          <InfoRow label="Cores" value={systemInfo.cpu?.count || 'N/A'} valueColor="var(--accent-secondary)" />
          <InfoRow label="Usage" value={`${cpuUsage}%`} valueColor={cpuUsage > 80 ? 'var(--status-error)' : 'var(--accent-primary)'} />
          <div className="mt-3">
            <Meter value={cpuUsage} color={cpuUsage > 80 ? 'var(--status-error)' : 'var(--accent-primary)'} />
          </div>
        </Panel>

        {/* Memory Panel */}
        <Panel id="server-memory" title="Memory" icon={MemoryIcon}>
          <InfoRow label="Total" value={formatBytes(systemInfo.memory?.total || 0)} />
          <InfoRow label="Used" value={formatBytes(systemInfo.memory?.used || 0)} valueColor="var(--accent-secondary)" />
          <InfoRow label="Free" value={formatBytes(systemInfo.memory?.free || 0)} valueColor="var(--accent-primary)" />
          <div className="mt-3">
            <Meter value={memUsage} color={memUsage > 80 ? 'var(--status-error)' : 'var(--accent-secondary)'} />
          </div>
        </Panel>

        {/* Disk Panel */}
        <Panel id="server-disk" title="Disk" icon={DiskIcon}>
          <InfoRow label="Total" value={formatBytes(systemInfo.disk?.total || 0)} />
          <InfoRow label="Used" value={formatBytes(systemInfo.disk?.used || 0)} valueColor="var(--accent-tertiary)" />
          <InfoRow label="Free" value={formatBytes(systemInfo.disk?.free || 0)} valueColor="var(--accent-primary)" />
          <div className="mt-3">
            <Meter value={diskUsage} color={diskUsage > 80 ? 'var(--status-error)' : 'var(--accent-tertiary)'} />
          </div>
        </Panel>
      </PanelGroup>

      {/* System Info Panel */}
      <Panel id="server-system-info" title="System Info" icon={ServerIcon}>
        <div className="flex justify-end mb-2 -mt-1">
          <button
            onClick={fetchSystemInfo}
            disabled={loading}
            className="px-2 py-1 text-xs font-mono rounded border transition-colors
                       border-[var(--border-subtle)] text-[var(--text-secondary)]
                       hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]
                       disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[var(--text-muted)] block text-xs font-mono uppercase">Hostname</span>
            <span className="text-[var(--accent-primary)] font-mono text-sm">{systemInfo.system?.hostname || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-xs font-mono uppercase">Platform</span>
            <span className="text-[var(--text-primary)] font-mono text-sm">{systemInfo.system?.platform || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-xs font-mono uppercase">Node</span>
            <span className="text-[var(--text-primary)] font-mono text-sm">{systemInfo.process?.nodeVersion || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-xs font-mono uppercase">Arch</span>
            <span className="text-[var(--text-primary)] font-mono text-sm">{systemInfo.system?.arch || 'N/A'}</span>
          </div>
        </div>
      </Panel>

      {/* Load Average Panel */}
      {systemInfo.loadAvg && (
        <Panel id="server-load-avg" title="Load Average" icon={LoadIcon}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold font-mono text-[var(--accent-primary)]">{systemInfo.loadAvg[0]?.toFixed(2)}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">1 min</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-[var(--accent-secondary)]">{systemInfo.loadAvg[1]?.toFixed(2)}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">5 min</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-[var(--accent-tertiary)]">{systemInfo.loadAvg[2]?.toFixed(2)}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">15 min</div>
            </div>
          </div>
        </Panel>
      )}

      {/* Last Updated */}
      <p className="text-xs text-[var(--text-muted)] font-mono text-right pt-2">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>
    </div>
  );
}

export default OverviewPane;

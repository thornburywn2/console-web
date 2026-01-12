/**
 * Container Metrics Component
 * Per-container usage statistics and charts
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const METRIC_COLORS = {
  cpu: '#3498db',
  memory: '#2ecc71',
  network: '#9b59b6',
};

function SparkLine({ data, color, width = 80, height = 24 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    const max = Math.max(...data, 1);
    const min = 0;
    const range = max - min || 1;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    data.forEach((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [data, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
}

function ContainerCard({ container, expanded, onToggle }) {
  const [history, setHistory] = useState({ cpu: [], memory: [] });

  useEffect(() => {
    // Simulate history for demo
    const generateHistory = () => {
      const points = 20;
      const cpu = [];
      const memory = [];
      for (let i = 0; i < points; i++) {
        cpu.push(Math.random() * container.cpu * 1.5);
        memory.push(container.memoryPercent + (Math.random() - 0.5) * 10);
      }
      return { cpu, memory };
    };

    setHistory(generateHistory());
  }, [container]);

  const statusColor = container.status === 'running'
    ? '#2ecc71'
    : container.status === 'paused'
      ? '#f39c12'
      : '#e74c3c';

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Main Info */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5"
      >
        {/* Status indicator */}
        <div className="relative flex-shrink-0">
          <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{ background: statusColor, borderColor: 'var(--bg-glass)' }}
          />
        </div>

        {/* Container name */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-primary truncate">{container.name}</div>
          <div className="text-xs text-muted truncate">{container.image}</div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-xs text-muted mb-0.5">CPU</div>
            <div style={{ color: METRIC_COLORS.cpu }}>{container.cpu?.toFixed(1) || 0}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted mb-0.5">MEM</div>
            <div style={{ color: METRIC_COLORS.memory }}>{container.memoryPercent?.toFixed(1) || 0}%</div>
          </div>
          <SparkLine data={history.cpu} color={METRIC_COLORS.cpu} />
        </div>

        {/* Expand icon */}
        <svg
          className={'w-5 h-5 text-muted transition-transform ' + (expanded ? 'rotate-180' : '')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-3 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Resource bars */}
          <div className="space-y-2">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">CPU Usage</span>
                <span style={{ color: METRIC_COLORS.cpu }}>{container.cpu?.toFixed(2) || 0}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(container.cpu || 0, 100)}%`,
                    background: METRIC_COLORS.cpu,
                  }}
                />
              </div>
            </div>

            {/* Memory */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Memory Usage</span>
                <span style={{ color: METRIC_COLORS.memory }}>
                  {container.memoryUsage} / {container.memoryLimit}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(container.memoryPercent || 0, 100)}%`,
                    background: METRIC_COLORS.memory,
                  }}
                />
              </div>
            </div>

            {/* Network */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Network I/O</span>
                <span style={{ color: METRIC_COLORS.network }}>
                  {container.networkRx} / {container.networkTx}
                </span>
              </div>
            </div>
          </div>

          {/* Container details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted">Container ID: </span>
              <span className="text-secondary font-mono">{container.id?.substring(0, 12)}</span>
            </div>
            <div>
              <span className="text-muted">Status: </span>
              <span className="capitalize" style={{ color: statusColor }}>{container.status}</span>
            </div>
            <div>
              <span className="text-muted">Created: </span>
              <span className="text-secondary">{container.created}</span>
            </div>
            <div>
              <span className="text-muted">Ports: </span>
              <span className="text-secondary">{container.ports || 'None'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('container-logs', { detail: container.id }));
              }}
            >
              View Logs
            </button>
            <button
              className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('container-shell', { detail: container.id }));
              }}
            >
              Shell
            </button>
            {container.status === 'running' ? (
              <button
                className="px-3 py-1.5 text-xs rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('container-stop', { detail: container.id }));
                }}
              >
                Stop
              </button>
            ) : (
              <button
                className="px-3 py-1.5 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('container-start', { detail: container.id }));
                }}
              >
                Start
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContainerMetrics({ isOpen, onClose }) {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchContainers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/docker/containers/stats');
      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers || []);
      }
    } catch (error) {
      console.error('Failed to fetch containers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchContainers();
      const interval = setInterval(fetchContainers, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchContainers]);

  // Filter and sort
  const filteredContainers = containers
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'cpu') return (b.cpu || 0) - (a.cpu || 0);
      if (sortBy === 'memory') return (b.memoryPercent || 0) - (a.memoryPercent || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

  // Aggregate stats
  const totalCpu = containers.reduce((sum, c) => sum + (c.cpu || 0), 0);
  const totalMemory = containers.reduce((sum, c) => sum + (c.memoryPercent || 0), 0);
  const runningCount = containers.filter(c => c.status === 'running').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Container Metrics</h2>
            <span className="text-xs text-muted">({containers.length} containers)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Aggregate Stats */}
        <div
          className="grid grid-cols-4 gap-4 p-4"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{containers.length}</div>
            <div className="text-xs text-muted">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{runningCount}</div>
            <div className="text-xs text-muted">Running</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: METRIC_COLORS.cpu }}>
              {totalCpu.toFixed(1)}%
            </div>
            <div className="text-xs text-muted">Total CPU</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: METRIC_COLORS.memory }}>
              {(totalMemory / containers.length || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-muted">Avg Memory</div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="exited">Stopped</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="name">Name</option>
              <option value="cpu">CPU Usage</option>
              <option value="memory">Memory Usage</option>
            </select>
          </div>
          <button
            onClick={fetchContainers}
            className="ml-auto text-xs text-accent hover:underline"
          >
            Refresh
          </button>
        </div>

        {/* Container List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-muted py-8">Loading containers...</div>
          ) : filteredContainers.length === 0 ? (
            <div className="text-center text-muted py-8">No containers found</div>
          ) : (
            filteredContainers.map(container => (
              <ContainerCard
                key={container.id}
                container={container}
                expanded={expandedId === container.id}
                onToggle={() => setExpandedId(expandedId === container.id ? null : container.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Widget version for dashboard
export function ContainerMetricsWidget() {
  const [containers, setContainers] = useState([]);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const response = await fetch('/api/admin/docker/containers/stats');
        if (response.ok) {
          const data = await response.json();
          setContainers(data.containers || []);
        }
      } catch (error) {
        console.error('Failed to fetch containers:', error);
      }
    };

    fetchContainers();
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, []);

  const runningCount = containers.filter(c => c.status === 'running').length;
  const topContainers = containers
    .filter(c => c.status === 'running')
    .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
    .slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{runningCount} running</span>
        <span className="text-muted">{containers.length} total</span>
      </div>
      {topContainers.map(container => (
        <div key={container.id} className="flex items-center justify-between text-xs">
          <span className="text-secondary truncate flex-1">{container.name}</span>
          <span style={{ color: METRIC_COLORS.cpu }}>{container.cpu?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

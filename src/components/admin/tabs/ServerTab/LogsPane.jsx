/**
 * LogsPane Component
 * System logs viewer (journalctl)
 */

import { useState, useEffect, useCallback } from 'react';
import { formatBytes } from '../../utils';

export function LogsPane() {
  const [logs, setLogs] = useState([]);
  const [logUnits, setLogUnits] = useState([]);
  const [logFilter, setLogFilter] = useState({ unit: '', priority: '', search: '', lines: 100 });
  const [loading, setLoading] = useState(false);
  const [diskUsage, setDiskUsage] = useState(null);

  const fetchLogs = useCallback(async (filter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.unit) params.append('unit', filter.unit);
      if (filter.priority) params.append('priority', filter.priority);
      if (filter.search) params.append('search', filter.search);
      params.append('lines', filter.lines);

      const res = await fetch(`/api/infra/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/infra/logs/units');
      if (res.ok) {
        const data = await res.json();
        setLogUnits(data.units || []);
      }
    } catch (err) {
      console.error('Error fetching log units:', err);
    }
  }, []);

  const fetchDiskUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/infra/logs/disk-usage');
      if (res.ok) {
        const data = await res.json();
        setDiskUsage(data);
      }
    } catch (err) {
      console.error('Error fetching log disk usage:', err);
    }
  }, []);

  const vacuumLogs = useCallback(async () => {
    if (!confirm('This will remove old log entries to free up disk space. Continue?')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/infra/logs/vacuum', { method: 'POST' });
      if (res.ok) {
        fetchDiskUsage();
        fetchLogs(logFilter);
      }
    } catch (err) {
      console.error('Error vacuuming logs:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchDiskUsage, fetchLogs, logFilter]);

  useEffect(() => {
    fetchLogs(logFilter);
    fetchLogUnits();
    fetchDiskUsage();
  }, [fetchLogs, fetchLogUnits, fetchDiskUsage, logFilter]);

  const priorityColors = {
    0: 'text-hacker-error', // emerg
    1: 'text-hacker-error', // alert
    2: 'text-hacker-error', // crit
    3: 'text-hacker-error', // err
    4: 'text-hacker-warning', // warning
    5: 'text-hacker-cyan', // notice
    6: 'text-hacker-text', // info
    7: 'text-hacker-text-dim', // debug
  };

  return (
    <div className="space-y-6">
      {/* Disk Usage & Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-blue">{logs.length}</div>
          <div className="stat-label">LOG ENTRIES</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{logUnits.length}</div>
          <div className="stat-label">UNITS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-purple">
            {diskUsage ? formatBytes(diskUsage.used) : 'N/A'}
          </div>
          <div className="stat-label">DISK USED</div>
        </div>
        <div className="hacker-card text-center">
          <button
            onClick={vacuumLogs}
            disabled={loading}
            className="hacker-btn text-xs w-full h-full flex items-center justify-center"
          >
            VACUUM LOGS
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-blue mb-4 uppercase tracking-wider">
          LOG FILTERS
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={logFilter.unit}
            onChange={(e) => setLogFilter(f => ({ ...f, unit: e.target.value }))}
            className="input-glass text-sm"
          >
            <option value="">All Units</option>
            {logUnits.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <select
            value={logFilter.priority}
            onChange={(e) => setLogFilter(f => ({ ...f, priority: e.target.value }))}
            className="input-glass text-sm"
          >
            <option value="">All Priorities</option>
            <option value="0">Emergency</option>
            <option value="1">Alert</option>
            <option value="2">Critical</option>
            <option value="3">Error</option>
            <option value="4">Warning</option>
            <option value="5">Notice</option>
            <option value="6">Info</option>
            <option value="7">Debug</option>
          </select>
          <input
            type="text"
            placeholder="Search logs..."
            value={logFilter.search}
            onChange={(e) => setLogFilter(f => ({ ...f, search: e.target.value }))}
            className="input-glass text-sm"
          />
          <div className="flex gap-2">
            <select
              value={logFilter.lines}
              onChange={(e) => setLogFilter(f => ({ ...f, lines: parseInt(e.target.value) }))}
              className="input-glass text-sm flex-1"
            >
              <option value="50">50 lines</option>
              <option value="100">100 lines</option>
              <option value="200">200 lines</option>
              <option value="500">500 lines</option>
            </select>
            <button
              onClick={() => fetchLogs(logFilter)}
              disabled={loading}
              className="hacker-btn text-xs"
            >
              {loading ? '...' : 'APPLY'}
            </button>
          </div>
        </div>
      </div>

      {/* Log Output */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-blue uppercase tracking-wider">
            LOG OUTPUT
          </h4>
          <button
            onClick={() => fetchLogs(logFilter)}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>
        <div className="bg-black/50 rounded p-3 max-h-96 overflow-y-auto font-mono">
          {logs.length === 0 ? (
            <p className="text-xs text-hacker-text-dim">No logs found matching filters</p>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className={`text-[11px] py-0.5 hover:bg-hacker-surface/30 ${
                  priorityColors[log.priority] || 'text-hacker-text'
                }`}
              >
                <span className="text-hacker-text-dim">{log.timestamp}</span>
                {log.unit && <span className="text-hacker-cyan ml-2">[{log.unit}]</span>}
                <span className="ml-2">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default LogsPane;

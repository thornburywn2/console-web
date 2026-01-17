/**
 * LogsPane Component
 * System logs viewer (journalctl)
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { serverApi } from '../../../../services/api.js';

export function LogsPane() {
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState({ unit: '', priority: '', lines: 100 });
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);

  const fetchLogs = useCallback(async (filter) => {
    try {
      setLoading(true);
      const data = await serverApi.getLogs(filter);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch common unit names from services
  const fetchUnits = useCallback(async () => {
    try {
      const data = await serverApi.getServices();
      const services = Array.isArray(data) ? data : [];
      const unitNames = services.map(s => s.name).filter(Boolean);
      setUnits(unitNames);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs(logFilter);
    fetchUnits();
  }, [fetchLogs, fetchUnits, logFilter]);

  // Parse log line to extract priority-like indicators
  const getLogStyle = (log) => {
    const lower = log.toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('crit')) {
      return 'text-hacker-error';
    }
    if (lower.includes('warn')) {
      return 'text-hacker-warning';
    }
    if (lower.includes('notice')) {
      return 'text-hacker-cyan';
    }
    return 'text-hacker-text-dim';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-blue">{logs.length}</div>
          <div className="stat-label">LOG ENTRIES</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{units.length}</div>
          <div className="stat-label">UNITS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-purple">{logFilter.lines}</div>
          <div className="stat-label">MAX LINES</div>
        </div>
        <div className="hacker-card text-center">
          <button
            onClick={() => fetchLogs(logFilter)}
            disabled={loading}
            className="hacker-btn text-xs w-full h-full flex items-center justify-center"
          >
            {loading ? 'LOADING...' : 'REFRESH'}
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
            {units.map(unit => (
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
          <select
            value={logFilter.lines}
            onChange={(e) => setLogFilter(f => ({ ...f, lines: parseInt(e.target.value) }))}
            className="input-glass text-sm"
          >
            <option value="50">50 lines</option>
            <option value="100">100 lines</option>
            <option value="200">200 lines</option>
            <option value="500">500 lines</option>
            <option value="1000">1000 lines</option>
          </select>
          <button
            onClick={() => fetchLogs(logFilter)}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? 'LOADING...' : 'APPLY'}
          </button>
        </div>
      </div>

      {/* Log Output */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-blue uppercase tracking-wider">
            LOG OUTPUT
          </h4>
          <span className="text-xs text-hacker-text-dim font-mono">
            {logs.length} entries
          </span>
        </div>
        <div className="bg-black/50 rounded p-3 max-h-[500px] overflow-y-auto font-mono">
          {logs.length === 0 ? (
            <p className="text-xs text-hacker-text-dim">No logs found matching filters</p>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className={`text-[11px] py-0.5 hover:bg-hacker-surface/30 ${getLogStyle(log)}`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default LogsPane;

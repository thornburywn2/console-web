/**
 * ProcessesPane Component
 * System process management
 */

import { useState, useEffect, useCallback } from 'react';
import { formatBytes } from '../../utils';

export function ProcessesPane() {
  const [processes, setProcesses] = useState([]);
  const [processSort, setProcessSort] = useState('cpu');
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchProcesses = useCallback(async (sortBy) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/infra/processes?sort=${sortBy}`);
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes || []);
      }
    } catch (err) {
      console.error('Error fetching processes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const killProcess = useCallback(async (pid, signal = 'SIGTERM') => {
    if (!confirm(`Kill process ${pid}?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/infra/processes/${pid}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal })
      });
      if (res.ok) {
        fetchProcesses(processSort);
        setSelectedProcess(null);
      }
    } catch (err) {
      console.error('Error killing process:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchProcesses, processSort]);

  useEffect(() => {
    fetchProcesses(processSort);
    // Use 10-second interval for more responsive process monitoring
    const interval = setInterval(() => fetchProcesses(processSort), 10000);
    return () => clearInterval(interval);
  }, [fetchProcesses, processSort]);

  const filteredProcesses = filter
    ? processes.filter(p =>
        p.command?.toLowerCase().includes(filter.toLowerCase()) ||
        p.user?.toLowerCase().includes(filter.toLowerCase())
      )
    : processes;

  return (
    <div className="space-y-6">
      {/* Process Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{processes.length}</div>
          <div className="stat-label">PROCESSES</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-green">
            {processes.filter(p => p.stat?.startsWith('S') || p.stat?.startsWith('R')).length}
          </div>
          <div className="stat-label">RUNNING</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-warning">
            {processes.filter(p => p.stat?.startsWith('D')).length}
          </div>
          <div className="stat-label">BLOCKED</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-error">
            {processes.filter(p => p.stat?.startsWith('Z')).length}
          </div>
          <div className="stat-label">ZOMBIE</div>
        </div>
      </div>

      {/* Controls */}
      <div className="hacker-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filter processes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-glass text-sm w-64"
            />
            <select
              value={processSort}
              onChange={(e) => setProcessSort(e.target.value)}
              className="input-glass text-sm"
            >
              <option value="cpu">Sort by CPU</option>
              <option value="mem">Sort by Memory</option>
              <option value="pid">Sort by PID</option>
              <option value="time">Sort by Time</option>
            </select>
          </div>
          <button
            onClick={() => fetchProcesses(processSort)}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>
      </div>

      {/* Process List */}
      <div className="hacker-card overflow-x-auto">
        <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
          PROCESS LIST [{filteredProcesses.length}]
        </h4>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-left text-hacker-text-dim border-b border-hacker-border">
              <th className="py-2 px-2">PID</th>
              <th className="py-2 px-2">USER</th>
              <th className="py-2 px-2">CPU%</th>
              <th className="py-2 px-2">MEM%</th>
              <th className="py-2 px-2">MEM</th>
              <th className="py-2 px-2">STATE</th>
              <th className="py-2 px-2">COMMAND</th>
              <th className="py-2 px-2">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredProcesses.slice(0, 50).map(proc => (
              <tr
                key={proc.pid}
                className={`border-b border-hacker-border/30 hover:bg-hacker-surface/30 ${
                  selectedProcess?.pid === proc.pid ? 'bg-hacker-cyan/10' : ''
                }`}
                onClick={() => setSelectedProcess(proc)}
              >
                <td className="py-1.5 px-2 text-hacker-cyan">{proc.pid}</td>
                <td className="py-1.5 px-2 text-hacker-text">{proc.user}</td>
                <td className={`py-1.5 px-2 ${proc.cpu > 50 ? 'text-hacker-error' : proc.cpu > 20 ? 'text-hacker-warning' : 'text-hacker-green'}`}>
                  {proc.cpu?.toFixed(1)}%
                </td>
                <td className={`py-1.5 px-2 ${proc.memory > 50 ? 'text-hacker-error' : proc.memory > 20 ? 'text-hacker-warning' : 'text-hacker-green'}`}>
                  {proc.memory?.toFixed(1)}%
                </td>
                <td className="py-1.5 px-2 text-hacker-text-dim">{formatBytes(parseInt(proc.rss) * 1024 || 0)}</td>
                <td className="py-1.5 px-2">
                  <span className={`${
                    proc.stat?.startsWith('R') ? 'text-hacker-green' :
                    proc.stat?.startsWith('S') ? 'text-hacker-cyan' :
                    proc.stat?.startsWith('D') ? 'text-hacker-warning' :
                    proc.stat?.startsWith('Z') ? 'text-hacker-error' : 'text-hacker-text-dim'
                  }`}>
                    {proc.stat}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-hacker-text max-w-xs truncate" title={proc.command}>
                  {proc.command}
                </td>
                <td className="py-1.5 px-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); killProcess(proc.pid); }}
                    className="hacker-btn text-[10px] px-2 py-0.5 border-hacker-error/30 text-hacker-error hover:bg-hacker-error/10"
                  >
                    KILL
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProcesses.length > 50 && (
          <p className="text-xs text-hacker-text-dim mt-2">
            Showing top 50 of {filteredProcesses.length} processes
          </p>
        )}
      </div>

      {/* Process Details */}
      {selectedProcess && (
        <div className="hacker-card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-hacker-purple uppercase tracking-wider">
              PROCESS DETAILS: {selectedProcess.pid}
            </h4>
            <button
              onClick={() => setSelectedProcess(null)}
              className="text-hacker-text-dim hover:text-hacker-text"
            >
              &#10005;
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
            <div>
              <span className="text-hacker-text-dim block text-xs">PID</span>
              <span className="text-hacker-cyan">{selectedProcess.pid}</span>
            </div>
            <div>
              <span className="text-hacker-text-dim block text-xs">PPID</span>
              <span className="text-hacker-text">{selectedProcess.ppid}</span>
            </div>
            <div>
              <span className="text-hacker-text-dim block text-xs">USER</span>
              <span className="text-hacker-text">{selectedProcess.user}</span>
            </div>
            <div>
              <span className="text-hacker-text-dim block text-xs">NICE</span>
              <span className="text-hacker-text">{selectedProcess.nice}</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-hacker-text-dim block text-xs mb-1">COMMAND</span>
            <code className="text-xs bg-black/50 p-2 rounded block overflow-x-auto">
              {selectedProcess.command}
            </code>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => killProcess(selectedProcess.pid, 'SIGTERM')}
              className="hacker-btn text-xs border-hacker-warning/30 text-hacker-warning"
            >
              SIGTERM
            </button>
            <button
              onClick={() => killProcess(selectedProcess.pid, 'SIGKILL')}
              className="hacker-btn text-xs border-hacker-error/30 text-hacker-error"
            >
              SIGKILL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcessesPane;

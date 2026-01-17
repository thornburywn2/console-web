/**
 * Log Viewer Component
 * Real-time log tail with filtering
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { logsApi } from '../services/api.js';

// Log level colors
const LOG_LEVELS = {
  error: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', label: 'ERROR' },
  warn: { color: '#feca57', bg: 'rgba(254,202,87,0.1)', label: 'WARN' },
  info: { color: '#54a0ff', bg: 'rgba(84,160,255,0.1)', label: 'INFO' },
  debug: { color: '#5f27cd', bg: 'rgba(95,39,205,0.1)', label: 'DEBUG' },
  trace: { color: '#a0a0a0', bg: 'rgba(160,160,160,0.1)', label: 'TRACE' },
};

// Parse log line to extract level and timestamp
const parseLogLine = (line) => {
  // Common log patterns
  const patterns = [
    // [2025-01-07 10:30:45] ERROR: message
    /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s*(ERROR|WARN|INFO|DEBUG|TRACE):\s*(.*)$/i,
    // 2025-01-07T10:30:45.123Z - error - message
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s*-\s*(error|warn|info|debug|trace)\s*-\s*(.*)$/i,
    // ERROR [timestamp] message
    /^(ERROR|WARN|INFO|DEBUG|TRACE)\s*\[([^\]]+)\]\s*(.*)$/i,
    // Simple: ERROR: message or error: message
    /^(ERROR|WARN|INFO|DEBUG|TRACE):\s*(.*)$/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      if (match.length === 4) {
        return {
          timestamp: match[1] || match[2],
          level: (match[2] || match[1]).toLowerCase(),
          message: match[3],
        };
      } else if (match.length === 3) {
        return {
          timestamp: null,
          level: match[1].toLowerCase(),
          message: match[2],
        };
      }
    }
  }

  // Check for keywords in line
  const lowerLine = line.toLowerCase();
  if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('failed')) {
    return { timestamp: null, level: 'error', message: line };
  }
  if (lowerLine.includes('warn')) {
    return { timestamp: null, level: 'warn', message: line };
  }

  return { timestamp: null, level: 'info', message: line };
};

export default function LogViewer({
  projectPath,
  logFile,
  isOpen,
  onClose,
  maxLines = 1000,
  embedded = false,
}) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [isFollowing, setIsFollowing] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch initial logs
  const fetchLogs = useCallback(async () => {
    if (!projectPath && !logFile) return;
    setLoading(true);
    try {
      const path = logFile || projectPath;
      const data = await logsApi.get(path, maxLines);
      const parsed = (data.lines || []).map((line, i) => ({
        id: i,
        raw: line,
        ...parseLogLine(line),
      }));
      setLogs(parsed);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath, logFile, maxLines]);

  // Set up WebSocket for real-time updates
  useEffect(() => {
    if (!isOpen || isPaused) return;

    fetchLogs();

    // Connect to log streaming WebSocket if available
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host + '/ws/logs';

    try {
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onmessage = (event) => {
        const line = event.data;
        const parsed = {
          id: Date.now(),
          raw: line,
          ...parseLogLine(line),
        };
        setLogs(prev => {
          const newLogs = [...prev, parsed];
          if (newLogs.length > maxLines) {
            return newLogs.slice(-maxLines);
          }
          return newLogs;
        });
      };
    } catch (e) {
      // WebSocket not available, fall back to polling
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isOpen, isPaused, fetchLogs, maxLines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isFollowing && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isFollowing]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsFollowing(isAtBottom);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (filter && !log.raw.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  // Get level counts
  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {});

  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const content = filteredLogs.map(l => l.raw).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs-' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen && !embedded) return null;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={'px-3 py-1.5 text-sm rounded flex items-center gap-2 ' +
            (isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400')}
        >
          <div className={'w-2 h-2 rounded-full ' + (isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse')} />
          {isPaused ? 'Paused' : 'Live'}
        </button>
        <span className="text-xs text-muted">{logs.length} lines</span>
      </div>

      {/* Level summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded" style={{ background: 'rgba(255,107,107,0.1)' }}>
          <div className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{levelCounts.error || 0}</div>
          <div className="text-xs text-muted">Errors</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(254,202,87,0.1)' }}>
          <div className="text-lg font-bold" style={{ color: '#feca57' }}>{levelCounts.warn || 0}</div>
          <div className="text-xs text-muted">Warnings</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(84,160,255,0.1)' }}>
          <div className="text-lg font-bold" style={{ color: '#54a0ff' }}>{levelCounts.info || 0}</div>
          <div className="text-xs text-muted">Info</div>
        </div>
      </div>

      {/* Recent logs preview */}
      <div
        className="rounded overflow-auto max-h-32 text-xs font-mono"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
      >
        {logs.slice(-5).map((log) => {
          const levelConfig = LOG_LEVELS[log.level] || LOG_LEVELS.info;
          return (
            <div
              key={log.id}
              className="px-2 py-0.5"
              style={{ borderLeft: '2px solid ' + levelConfig.color }}
            >
              <span style={{ color: levelConfig.color }}>{levelConfig.label}</span>
              <span className="text-muted ml-2">{log.message?.substring(0, 50)}</span>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="p-4 text-center text-muted">No logs available</div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-primary">Log Viewer</span>
            <span className="text-xs text-muted">{logs.length} lines</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={'px-2 py-1 text-xs rounded ' + (isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400')}
            >
              {isPaused ? 'Paused' : 'Live'}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-2" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          {/* Level filter buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLevelFilter('all')}
              className={'px-2 py-1 text-xs rounded ' + (levelFilter === 'all' ? 'bg-white/20 text-primary' : 'text-muted hover:text-primary')}
            >
              All ({logs.length})
            </button>
            {Object.entries(LOG_LEVELS).map(([level, config]) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={'px-2 py-1 text-xs rounded ' + (levelFilter === level ? 'text-primary' : 'text-muted hover:text-primary')}
                style={levelFilter === level ? { background: config.bg, color: config.color } : {}}
              >
                {config.label} ({levelCounts[level] || 0})
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={'p-1.5 rounded ' + (isFollowing ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary')}
              title="Auto-scroll"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <button onClick={downloadLogs} className="p-1.5 rounded text-muted hover:text-primary" title="Download">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button onClick={clearLogs} className="p-1.5 rounded text-muted hover:text-primary" title="Clear">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Log content */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto font-mono text-xs"
          style={{ background: 'var(--bg-primary)' }}
        >
          {loading ? (
            <div className="p-4 text-center text-muted">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-4 text-center text-muted">
              {filter || levelFilter !== 'all' ? 'No logs match the filter' : 'No logs available'}
            </div>
          ) : (
            <div className="p-2">
              {filteredLogs.map((log) => {
                const levelConfig = LOG_LEVELS[log.level] || LOG_LEVELS.info;
                return (
                  <div
                    key={log.id}
                    className="flex py-0.5 hover:bg-white/5 rounded px-1"
                    style={{ borderLeft: '2px solid ' + levelConfig.color }}
                  >
                    {log.timestamp && (
                      <span className="text-muted mr-2 flex-shrink-0">{log.timestamp}</span>
                    )}
                    <span
                      className="px-1 rounded text-2xs mr-2 flex-shrink-0"
                      style={{ background: levelConfig.bg, color: levelConfig.color }}
                    >
                      {levelConfig.label}
                    </span>
                    <span className="text-secondary whitespace-pre-wrap break-all">{log.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>
            Showing {filteredLogs.length} of {logs.length} lines
          </span>
          <span>
            {isFollowing ? 'Following new logs' : 'Scroll paused - scroll to bottom to resume'}
          </span>
        </div>
      </div>
    </div>
  );
}

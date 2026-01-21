/**
 * HistoryTab Component
 * Session history browser with cohesive Panel design
 */

import { useState, useEffect, useCallback } from 'react';
import { Panel } from '../../shared';
import { formatTime } from '../utils';
import { adminApi } from '../../../services/api.js';

// Clock icon for history
const HistoryIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export function HistoryTab() {
  const [history, setHistory] = useState({ total: 0, entries: [] });
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getHistory(50);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-1 animate-fade-in">
      <Panel
        id="admin-history"
        title="Session History"
        icon={HistoryIcon}
        badge={history.total}
        badgeColor="var(--accent-tertiary)"
        emptyText="No session history found"
      >
        {/* Refresh button */}
        <div className="flex justify-end mb-3 -mt-1">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="px-2 py-1 text-xs font-mono rounded border transition-colors
                       border-[var(--border-subtle)] text-[var(--text-secondary)]
                       hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]
                       disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* History entries */}
        <div className="space-y-2">
          {(history.entries || []).map((entry, idx) => (
            <div
              key={idx}
              className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50
                         hover:border-[var(--border-default)] transition-colors"
            >
              <p className="text-sm text-[var(--text-primary)] font-mono truncate mb-2">
                <span className="text-[var(--accent-primary)]">$</span> {entry.display?.substring(0, 150)}
                {entry.display?.length > 150 && '...'}
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-mono">
                <span className="text-[var(--accent-secondary)]">{formatTime(entry.timestamp)}</span>
                {entry.project && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-tertiary)]/20 text-[var(--accent-tertiary)]">
                    {entry.project.split('/').pop()}
                  </span>
                )}
                {entry.sessionId && (
                  <span className="text-[var(--text-muted)]">
                    #{entry.sessionId.substring(0, 8)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export default HistoryTab;

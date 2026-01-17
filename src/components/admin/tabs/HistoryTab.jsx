/**
 * HistoryTab Component
 * Session history browser
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { TabContainer } from '../shared';
import { formatTime } from '../utils';
import { adminApi } from '../../../services/api.js';

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
    <TabContainer>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
            {'>'} SESSION_HISTORY [{history.total}]
          </h3>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>

        <div className="space-y-2">
          {(history.entries || []).map((entry, idx) => (
            <div
              key={idx}
              className="hacker-card p-4"
            >
              <p className="text-sm text-hacker-text font-mono truncate mb-2">
                <span className="text-hacker-green">$</span> {entry.display?.substring(0, 150)}
                {entry.display?.length > 150 && '...'}
              </p>
              <div className="flex items-center gap-4 text-xs text-hacker-text-dim font-mono">
                <span className="text-hacker-cyan">{formatTime(entry.timestamp)}</span>
                {entry.project && (
                  <span className="hacker-badge hacker-badge-purple text-[10px]">
                    {entry.project.split('/').pop()}
                  </span>
                )}
                {entry.sessionId && (
                  <span className="text-hacker-text-dim">
                    #{entry.sessionId.substring(0, 8)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {history.entries?.length === 0 && !loading && (
          <div className="hacker-card p-8 text-center">
            <p className="text-hacker-text-dim font-mono">No session history found</p>
          </div>
        )}
      </div>
    </TabContainer>
  );
}

export default HistoryTab;

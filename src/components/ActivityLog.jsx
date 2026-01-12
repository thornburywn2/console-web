import { useState, useEffect, useCallback } from 'react';

function ActivityLog({ onOpenAdmin }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/history?limit=5&offset=0');
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistory(data.history || []);
      setStats({
        today: data.todayCount || 0,
        week: data.weekCount || 0,
        total: data.totalCount || 0,
      });
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Format timestamp to relative time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Truncate text
  const truncate = (text, length = 30) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <svg className="w-5 h-5 animate-spin text-hacker-purple" fill="none" viewBox="0 0 24 24">
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

  return (
    <div className="space-y-2">
      {/* Activity entries */}
      {history.length === 0 ? (
        <div className="text-xs text-hacker-text-dim text-center py-3 font-mono">[NO_RECENT_ACTIVITY]</div>
      ) : (
        <div className="space-y-1">
          {history.map((entry, index) => (
            <div
              key={entry.id || index}
              className="bg-hacker-bg/50 rounded px-2 py-1.5 border border-hacker-purple/10 hover:border-hacker-purple/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-hacker-text-dim font-mono">{formatTime(entry.timestamp)}</span>
                    <span className="text-xs font-mono text-hacker-cyan truncate">{entry.project || 'unknown'}</span>
                  </div>
                  <div className="text-[10px] text-hacker-text-dim font-mono truncate mt-0.5">
                    {truncate(entry.summary || entry.message || 'Session', 40)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-hacker-text-dim pt-1 border-t border-hacker-green/10">
        <div className="flex items-center gap-2">
          <span>
            Today: <span className="text-hacker-green">{stats.today}</span>
          </span>
          <span>
            Week: <span className="text-hacker-cyan">{stats.week}</span>
          </span>
        </div>
        <button
          onClick={onOpenAdmin}
          className="text-hacker-purple hover:text-hacker-purple/80 transition-colors"
          title="View all history"
        >
          [VIEW ALL]
        </button>
      </div>
    </div>
  );
}

export default ActivityLog;

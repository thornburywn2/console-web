/**
 * Activity Feed Component
 * Team member activity stream
 */

import { useState, useEffect, useCallback } from 'react';

const ACTIVITY_TYPES = {
  session_created: { icon: '🆕', color: '#2ecc71', verb: 'created session' },
  session_ended: { icon: '✅', color: '#3498db', verb: 'ended session' },
  commit: { icon: '💾', color: '#9b59b6', verb: 'committed' },
  push: { icon: '⬆️', color: '#e74c3c', verb: 'pushed to' },
  deploy: { icon: '🚀', color: '#f39c12', verb: 'deployed' },
  comment: { icon: '💬', color: '#1abc9c', verb: 'commented on' },
  share: { icon: '🔗', color: '#34495e', verb: 'shared' },
  backup: { icon: '📦', color: '#95a5a6', verb: 'backed up' },
  error: { icon: '⚠️', color: '#e74c3c', verb: 'encountered error in' },
};

function ActivityItem({ activity }) {
  const type = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.session_created;
  const timeAgo = getTimeAgo(activity.timestamp);

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: type.color + '20' }}
      >
        <span>{type.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-medium text-primary">{activity.actor || 'System'}</span>
          <span className="text-secondary"> {type.verb} </span>
          <span className="font-medium text-primary">{activity.target}</span>
        </div>
        {activity.message && (
          <div className="text-xs text-muted mt-1 truncate">{activity.message}</div>
        )}
        <div className="text-xs text-muted mt-1">{timeAgo}</div>
      </div>

      {/* Project badge */}
      {activity.project && (
        <div className="flex-shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
            {activity.project}
          </span>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return new Date(timestamp).toLocaleDateString();
}

export default function ActivityFeed({
  isOpen,
  onClose,
  projectFilter,
  limit = 50,
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/activity?limit=' + limit;
      if (projectFilter) {
        url += '&project=' + encodeURIComponent(projectFilter);
      }
      if (filter !== 'all') {
        url += '&type=' + filter;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [limit, projectFilter, filter]);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();

      // Poll for updates
      const interval = setInterval(fetchActivities, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchActivities]);

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Activity Feed</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
          <span className="text-xs text-muted">Filter:</span>
          <div className="flex gap-1">
            {['all', 'session', 'commit', 'deploy', 'comment'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={'px-2 py-1 text-xs rounded ' +
                  (filter === f ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary')}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button
              onClick={fetchActivities}
              disabled={loading}
              className="text-xs text-accent hover:underline"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Activity list */}
        <div className="flex-1 overflow-auto">
          {loading && activities.length === 0 ? (
            <div className="p-8 text-center text-muted">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted mb-2">No activities yet</p>
              <p className="text-xs text-muted">
                Activities will appear here as you and your team work
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {Object.entries(groupedActivities).map(([date, items]) => (
                <div key={date}>
                  <div className="px-4 py-2 text-xs font-medium text-muted sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
                    {date === new Date().toDateString() ? 'Today' :
                     date === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : date}
                  </div>
                  {items.map((activity, i) => (
                    <ActivityItem key={activity.id || i} activity={activity} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>{activities.length} activities</span>
          <span>Updates every 30s</span>
        </div>
      </div>
    </div>
  );
}

// Export for use in widgets
export function ActivityWidget({ limit = 5, projectFilter }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        let url = '/api/activity?limit=' + limit;
        if (projectFilter) {
          url += '&project=' + encodeURIComponent(projectFilter);
        }
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, [limit, projectFilter]);

  return (
    <div className="space-y-2">
      {activities.map((activity, i) => (
        <div key={activity.id || i} className="flex items-center gap-2 text-xs">
          <span>{ACTIVITY_TYPES[activity.type]?.icon || '📌'}</span>
          <span className="text-secondary truncate flex-1">
            {activity.actor} {ACTIVITY_TYPES[activity.type]?.verb} {activity.target}
          </span>
          <span className="text-muted flex-shrink-0">{getTimeAgo(activity.timestamp)}</span>
        </div>
      ))}
      {activities.length === 0 && (
        <p className="text-xs text-muted text-center py-2">No recent activity</p>
      )}
    </div>
  );
}

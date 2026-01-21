/**
 * HomeDashboard Utility Functions
 * Format helpers for dashboard display
 */

/**
 * Format uptime in seconds to human-readable string
 */
export function formatUptime(s) {
  if (!s) return '0m';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Format timestamp to relative time ago string
 */
export function formatTimeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
}

/**
 * Format ISO date string to relative date (e.g., "2d ago", "Jan 15")
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  // Less than 1 hour
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
  // Less than 24 hours
  if (hours < 24) return `${hours}h ago`;
  // Less than 7 days
  if (days < 7) return `${days}d ago`;
  // Less than 1 year - show month and day
  if (days < 365) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  // More than 1 year - show full date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(b) {
  if (!b) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format token count to abbreviated string (K, M)
 */
export function formatTokens(t) {
  if (t >= 1000000) return `${(t / 1000000).toFixed(1)}M`;
  if (t >= 1000) return `${(t / 1000).toFixed(1)}K`;
  return t.toString();
}

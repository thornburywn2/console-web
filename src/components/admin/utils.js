/**
 * Admin Dashboard Utility Functions
 * Shared helpers extracted from AdminDashboard.jsx
 */

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format uptime seconds to human-readable string
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted string (e.g., "5d 3h 20m")
 */
export function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Format timestamp to locale string
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted date/time string
 */
export function formatTime(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Check if a firewall rule is SSH (protected)
 * @param {Object} rule - Firewall rule object
 * @returns {boolean} True if rule is SSH-related
 */
export function isSSHRule(rule) {
  const port = (rule.port || '').toString().toLowerCase();
  return port.includes('22') || port.includes('ssh') || port === 'openssh';
}

/**
 * Get status color class based on status string
 * @param {string} status - Status string (running, active, healthy, etc.)
 * @returns {string} CSS class for the status color
 */
export function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (['running', 'active', 'healthy', 'connected', 'online'].includes(s)) {
    return 'text-hacker-green';
  }
  if (['stopped', 'inactive', 'unhealthy', 'disconnected', 'offline', 'error', 'failed'].includes(s)) {
    return 'text-hacker-error';
  }
  if (['pending', 'starting', 'stopping', 'paused', 'warning'].includes(s)) {
    return 'text-hacker-warning';
  }
  return 'text-hacker-text-dim';
}

/**
 * Get status badge class based on status string
 * @param {string} status - Status string
 * @returns {string} CSS class for badge styling
 */
export function getStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (['running', 'active', 'healthy', 'connected', 'online'].includes(s)) {
    return 'hacker-badge-green';
  }
  if (['stopped', 'inactive', 'unhealthy', 'disconnected', 'offline', 'error', 'failed'].includes(s)) {
    return 'hacker-badge-error';
  }
  if (['pending', 'starting', 'stopping', 'paused', 'warning'].includes(s)) {
    return 'hacker-badge-warning';
  }
  return '';
}

/**
 * Parse container name from Docker container data
 * @param {Object} container - Docker container object
 * @returns {string} Container name
 */
export function getContainerName(container) {
  if (container.name) return container.name;
  if (container.Names && container.Names.length > 0) {
    return container.Names[0].replace(/^\//, '');
  }
  return container.id?.substring(0, 12) || 'unnamed';
}

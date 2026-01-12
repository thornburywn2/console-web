/**
 * MCPStatusIndicator Component
 * Visual status indicator for MCP server connections
 */

const STATUS_STYLES = {
  CONNECTED: {
    dot: 'bg-green-500',
    ring: 'ring-green-500/30',
    text: 'text-green-400',
    label: 'Connected'
  },
  DISCONNECTED: {
    dot: 'bg-gray-500',
    ring: 'ring-gray-500/30',
    text: 'text-gray-400',
    label: 'Disconnected'
  },
  CONNECTING: {
    dot: 'bg-yellow-500 animate-pulse',
    ring: 'ring-yellow-500/30',
    text: 'text-yellow-400',
    label: 'Connecting'
  },
  ERROR: {
    dot: 'bg-red-500',
    ring: 'ring-red-500/30',
    text: 'text-red-400',
    label: 'Error'
  }
};

export default function MCPStatusIndicator({
  status = 'DISCONNECTED',
  isRunning = false,
  size = 'md',
  showLabel = false,
  className = ''
}) {
  // Determine effective status
  const effectiveStatus = isRunning && status === 'DISCONNECTED' ? 'CONNECTING' : status;
  const styles = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.DISCONNECTED;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const ringClasses = {
    sm: 'ring-2',
    md: 'ring-2',
    lg: 'ring-4'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} ${styles.dot} rounded-full ${ringClasses[size]} ${styles.ring}`}
        title={styles.label}
      />
      {showLabel && (
        <span className={`text-sm ${styles.text}`}>
          {styles.label}
        </span>
      )}
    </div>
  );
}

/**
 * Compact status badge variant
 */
export function MCPStatusBadge({ status, isRunning }) {
  const effectiveStatus = isRunning && status === 'DISCONNECTED' ? 'CONNECTING' : status;
  const styles = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.DISCONNECTED;

  const bgStyles = {
    CONNECTED: 'bg-green-500/20 border-green-500/30',
    DISCONNECTED: 'bg-gray-500/20 border-gray-500/30',
    CONNECTING: 'bg-yellow-500/20 border-yellow-500/30',
    ERROR: 'bg-red-500/20 border-red-500/30'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${bgStyles[effectiveStatus]} ${styles.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {styles.label}
    </span>
  );
}

/**
 * Aggregate status for multiple servers
 */
export function MCPAggregateStatus({ servers }) {
  const connected = servers.filter(s => s.status === 'CONNECTED' || s.isRunning).length;
  const total = servers.length;
  const hasErrors = servers.some(s => s.status === 'ERROR');

  let status = 'DISCONNECTED';
  if (hasErrors) {
    status = 'ERROR';
  } else if (connected === total && total > 0) {
    status = 'CONNECTED';
  } else if (connected > 0) {
    status = 'CONNECTING'; // Use as "partial" indicator
  }

  return (
    <div className="flex items-center gap-2">
      <MCPStatusIndicator status={status} />
      <span className="text-sm text-gray-400">
        {connected}/{total} servers
      </span>
    </div>
  );
}

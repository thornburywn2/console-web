/**
 * GitHub Status Badge
 * Small indicator showing GitHub sync status in sidebar
 */

// Status colors
const STATUS_CONFIG = {
  synced: {
    color: '#22c55e',
    title: 'Synced with GitHub'
  },
  ahead: {
    color: '#f59e0b',
    title: 'Local commits to push'
  },
  behind: {
    color: '#f97316',
    title: 'Remote commits to pull'
  },
  diverged: {
    color: '#ef4444',
    title: 'Diverged from remote'
  },
  error: {
    color: '#ef4444',
    title: 'Sync error'
  },
  unknown: {
    color: '#6b7280',
    title: 'Unknown status'
  }
};

export default function GitHubStatusBadge({ status, aheadBy = 0, behindBy = 0, onClick }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  // Build tooltip
  let tooltip = config.title;
  if (status === 'ahead' && aheadBy > 0) {
    tooltip = `${aheadBy} commit${aheadBy > 1 ? 's' : ''} ahead`;
  } else if (status === 'behind' && behindBy > 0) {
    tooltip = `${behindBy} commit${behindBy > 1 ? 's' : ''} behind`;
  } else if (status === 'diverged') {
    tooltip = `${aheadBy} ahead, ${behindBy} behind`;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 transition-colors"
      title={tooltip}
    >
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill={config.color}
      >
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>

      {/* Count badge for ahead/behind */}
      {(status === 'ahead' || status === 'behind' || status === 'diverged') && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ background: config.color }}
        />
      )}
    </button>
  );
}

// Simpler inline version for tight spaces
export function GitHubStatusDot({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: config.color }}
      title={config.title}
    />
  );
}

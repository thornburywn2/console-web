/**
 * SummaryItem Component
 * Display item in review summary with status indicator
 */

export default function SummaryItem({ icon, label, value, status }) {
  const statusColors = {
    success: 'var(--accent-primary)',
    pending: 'var(--status-warning)',
    skip: 'var(--text-muted)',
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ background: 'var(--bg-tertiary)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>{value}</span>
      </div>
      {status && (
        <span
          className="text-xs font-medium px-2 py-1 rounded"
          style={{
            background: `${statusColors[status]}20`,
            color: statusColors[status],
          }}
        >
          {status === 'success' ? 'Ready' : status === 'pending' ? 'Will create' : 'Skipped'}
        </span>
      )}
    </div>
  );
}

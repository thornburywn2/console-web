/**
 * EmptyState Component
 * Empty state display for widgets
 */

export default function EmptyState({ text, icon, color }) {
  return (
    <div className="text-center py-4">
      {icon && <div className="text-xl mb-1" style={{ color: color || 'var(--text-muted)' }}>{icon}</div>}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  );
}

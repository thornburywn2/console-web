/**
 * Quick action buttons for mobile
 */

export function MobileQuickActions({ actions }) {
  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="flex flex-col items-center gap-1 p-3 rounded-xl active:scale-95 transition-transform"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="text-2xl">{action.icon}</span>
          <span className="text-xs text-muted">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

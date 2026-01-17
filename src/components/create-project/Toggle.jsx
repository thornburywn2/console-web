/**
 * Toggle Component
 * Switch-style checkbox with label and description
 */

export default function Toggle({ checked, onChange, label, description, accentColor = 'primary' }) {
  const colors = {
    primary: 'var(--accent-primary)',
    warning: 'var(--status-warning)',
    secondary: 'var(--accent-secondary)',
  };

  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className="w-11 h-6 rounded-full transition-colors duration-200"
          style={{
            background: checked ? colors[accentColor] : 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200"
            style={{
              transform: checked ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </div>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        {description && (
          <span className="text-xs block mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {description}
          </span>
        )}
      </div>
    </label>
  );
}

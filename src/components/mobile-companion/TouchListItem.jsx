/**
 * Touch-friendly list item
 */

export function TouchListItem({ icon, title, subtitle, onClick, trailing }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/10 transition-colors"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-primary truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-muted truncate">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </button>
  );
}

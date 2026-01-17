/**
 * ToolButton Component
 * Toolbar button for config formatter actions
 */

export default function ToolButton({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
        active ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted hover:text-primary hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

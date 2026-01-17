/**
 * ThemeCard Component
 * Theme selection card
 */

export default function ThemeCard({ theme, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`p-3 rounded-xl text-center transition-all duration-200 ${
        selected
          ? 'ring-2 ring-accent'
          : 'border border-white/10 hover:border-white/20'
      }`}
    >
      <div
        className="w-full h-16 rounded-lg mb-2"
        style={{ background: theme.preview }}
      />
      <span className="text-sm text-primary font-medium">{theme.name}</span>
    </button>
  );
}

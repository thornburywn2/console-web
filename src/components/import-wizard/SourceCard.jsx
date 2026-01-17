/**
 * SourceCard Component
 * Displays an import source option
 */

export default function SourceCard({ source, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <span className="text-3xl">{source.icon}</span>
      <div className="flex-1">
        <div className="font-medium text-primary">{source.name}</div>
        <div className="text-sm text-muted">{source.description}</div>
        <div className="text-xs text-muted mt-1">
          Formats: {source.formats.join(', ')}
        </div>
      </div>
      <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

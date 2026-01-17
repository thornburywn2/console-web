/**
 * Back Button Component
 * Shared header for context menu subviews
 */

export default function BackButton({ label, onBack, onClose }) {
  return (
    <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-white/10 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-primary">{label}</span>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

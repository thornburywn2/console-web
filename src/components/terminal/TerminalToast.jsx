/**
 * Terminal Toast Components
 */

export function CompletionToast({ show, message }) {
  if (!show) return null;

  return (
    <div
      className="absolute top-3 right-3 z-20 px-4 py-2 rounded-lg animate-pulse"
      style={{
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
        <span className="text-sm font-mono text-green-400">
          {message}
        </span>
      </div>
    </div>
  );
}

export function CopyToast({ show }) {
  if (!show) return null;

  return (
    <div
      className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-lg"
      style={{
        background: 'rgba(59, 130, 246, 0.9)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="text-sm font-mono text-white">📋 Copied!</span>
    </div>
  );
}

export function LoadingOverlay({ show }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl" style={{ background: 'rgba(12, 12, 12, 0.7)' }}>
      <div className="glass-elevated text-center p-8 rounded-xl">
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 w-12 h-12 mx-auto rounded-full animate-ping" style={{ background: 'rgba(16, 185, 129, 0.2)' }} />
          <svg className="w-12 h-12 mx-auto mb-4 animate-spin relative z-10" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm font-mono" style={{ color: 'var(--accent-primary)' }}>
          {'>'} INITIALIZING SESSION...
        </p>
        <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
          Establishing secure connection
        </p>
      </div>
    </div>
  );
}

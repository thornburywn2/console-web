/**
 * Mobile header with hamburger menu
 */

export function MobileHeader({ title, onMenuToggle, onBack, showBack }) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 safe-area-top"
      style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-default)',
        paddingTop: 'env(safe-area-inset-top, 12px)'
      }}
    >
      {showBack ? (
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/10 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 hover:bg-white/10 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold text-primary truncate">{title}</h1>
    </header>
  );
}

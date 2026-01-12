/**
 * Keyboard Shortcuts Modal
 * Displays all available keyboard shortcuts organized by category
 */

import { getShortcutsByCategory } from '../hooks/useKeyboardShortcuts';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutsByCategory = getShortcutsByCategory();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl glass-elevated rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        style={{ border: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-accent text-xl">?</span>
            <h2 className="text-lg font-bold text-primary tracking-wider">
              KEYBOARD SHORTCUTS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
              <div key={category}>
                <h3
                  className="text-sm font-bold tracking-wider mb-3"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {category.toUpperCase()}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <span className="text-sm text-primary">
                        {shortcut.description}
                      </span>
                      <kbd
                        className="px-2 py-1 text-xs font-mono rounded"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--accent-secondary)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-3 border-t text-xs font-mono"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Press <kbd className="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>Ctrl+/</kbd> anytime to show this help</span>
          <span>Press <kbd className="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

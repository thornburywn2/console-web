/**
 * Focus Mode Toggle Component
 * Toggle distraction-free terminal mode
 */

import { useState, useEffect } from 'react';

export default function FocusModeToggle({
  isActive,
  onToggle,
  showHint = true,
}) {
  const [showExitHint, setShowExitHint] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowExitHint(true);
      const timer = setTimeout(() => setShowExitHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isActive) {
        onToggle && onToggle(false);
      }
      if (e.key === 'F11' && !e.shiftKey) {
        e.preventDefault();
        onToggle && onToggle(!isActive);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onToggle]);

  if (!isActive) {
    return (
      <button
        onClick={() => onToggle && onToggle(true)}
        className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-primary transition-colors"
        title="Enter Focus Mode (F11)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    );
  }

  return (
    <>
      {/* Exit hint overlay */}
      {showHint && showExitHint && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-secondary">Focus Mode active</span>
            <span className="text-muted">|</span>
            <span className="text-muted">Press</span>
            <kbd className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-primary font-mono">ESC</kbd>
            <span className="text-muted">or</span>
            <kbd className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-primary font-mono">F11</kbd>
            <span className="text-muted">to exit</span>
          </div>
        </div>
      )}

      {/* Small exit button in corner */}
      <button
        onClick={() => onToggle && onToggle(false)}
        className="fixed top-2 right-2 z-[100] p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-primary transition-all opacity-0 hover:opacity-100"
        title="Exit Focus Mode"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </>
  );
}

// Focus mode wrapper component
export function FocusModeWrapper({ isActive, children, onExit }) {
  if (!isActive) return children;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: 'var(--bg-primary)' }}
    >
      <FocusModeToggle isActive={true} onToggle={(active) => !active && onExit && onExit()} />
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}

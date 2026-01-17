/**
 * Mobile terminal view with virtual keyboard helper
 */

import { useState } from 'react';

const SPECIAL_KEYS = [
  { label: 'Tab', key: '\t' },
  { label: 'Esc', key: '\x1b' },
  { label: 'Ctrl+C', key: '\x03' },
  { label: 'Ctrl+D', key: '\x04' },
  { label: 'Ctrl+Z', key: '\x1a' },
  { label: 'Up', key: '\x1b[A' },
  { label: 'Down', key: '\x1b[B' },
  { label: 'Clear', key: 'clear\n' }
];

export function MobileTerminalView({ sessionId, onClose }) {
  const [specialKeysOpen, setSpecialKeysOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm text-muted">Session: {sessionId}</span>
        <button
          onClick={() => setSpecialKeysOpen(!specialKeysOpen)}
          className={`p-2 rounded ${specialKeysOpen ? 'bg-accent/20 text-accent' : 'hover:bg-white/10'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>

      {/* Terminal area */}
      <div className="flex-1 overflow-hidden bg-black">
        {/* Terminal component would go here */}
        <div className="w-full h-full p-2 text-green-400 font-mono text-sm">
          Terminal view for session {sessionId}
        </div>
      </div>

      {/* Special keys */}
      {specialKeysOpen && (
        <div
          className="flex flex-wrap gap-1 p-2"
          style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}
        >
          {SPECIAL_KEYS.map((sk, i) => (
            <button
              key={i}
              className="px-3 py-2 text-xs rounded bg-white/10 active:bg-white/20"
            >
              {sk.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

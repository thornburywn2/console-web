/**
 * ChangelogCompact Component - Compact widget for sidebar
 */

import { useState, useEffect } from 'react';
import { CHANGELOG_ENTRIES } from './entries';

export function ChangelogCompact() {
  const latest = CHANGELOG_ENTRIES[0];
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('changelog-last-seen');
    setDismissed(lastSeen === latest?.version);
  }, [latest]);

  if (dismissed || !latest) return null;

  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'var(--bg-accent)/10', border: '1px solid var(--border-accent)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-accent">{latest.title}</div>
          <div className="text-xs text-muted mt-0.5">v{latest.version}</div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('changelog-last-seen', latest.version);
            setDismissed(true);
          }}
          className="text-muted hover:text-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {latest.highlights.slice(0, 3).map((h, i) => (
          <li key={i} className="text-xs text-secondary flex items-center gap-1">
            <span className="text-green-400">+</span> {h}
          </li>
        ))}
      </ul>
    </div>
  );
}

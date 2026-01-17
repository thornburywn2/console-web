/**
 * Changelog Widget Component
 * What's new display for updates and features
 */

import { useState, useEffect } from 'react';
import {
  CHANGELOG_ENTRIES,
  ChangelogEntry,
  ChangelogBadge,
  ChangelogCompact,
} from './changelog-widget';

export default function ChangelogWidget({ isOpen, onClose }) {
  const [expandedVersion, setExpandedVersion] = useState(CHANGELOG_ENTRIES[0]?.version);
  const [hasNew, setHasNew] = useState(false);

  // Check for new updates
  useEffect(() => {
    const lastSeen = localStorage.getItem('changelog-last-seen');
    const latestVersion = CHANGELOG_ENTRIES[0]?.version;
    if (lastSeen !== latestVersion) {
      setHasNew(true);
    }
  }, []);

  // Mark as seen when opened
  useEffect(() => {
    if (isOpen && hasNew) {
      localStorage.setItem('changelog-last-seen', CHANGELOG_ENTRIES[0]?.version);
      setHasNew(false);
    }
  }, [isOpen, hasNew]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">What's New</h2>
            {hasNew && (
              <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400 animate-pulse">
                New
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {CHANGELOG_ENTRIES.map(entry => (
            <ChangelogEntry
              key={entry.version}
              entry={entry}
              isExpanded={expandedVersion === entry.version}
              onToggle={() => setExpandedVersion(
                expandedVersion === entry.version ? null : entry.version
              )}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 text-sm"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <a
            href="https://github.com/your-repo/changelog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Full Changelog
          </a>
          <span className="text-muted">Console.web v{CHANGELOG_ENTRIES[0]?.version}</span>
        </div>
      </div>
    </div>
  );
}

// Re-export components for external use
export { ChangelogBadge, ChangelogCompact };

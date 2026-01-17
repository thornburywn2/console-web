/**
 * ChangelogEntry Component
 */

import { VersionBadge } from './VersionBadge';

export function ChangelogEntry({ entry, isExpanded, onToggle }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5"
      >
        <VersionBadge version={entry.version} type={entry.type} />
        <div className="flex-1">
          <div className="font-medium text-primary">{entry.title}</div>
          <div className="text-xs text-muted">{new Date(entry.date).toLocaleDateString()}</div>
        </div>
        <svg
          className={`w-5 h-5 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Highlights */}
          <div>
            <div className="text-xs text-muted mb-2">Highlights</div>
            <ul className="space-y-1">
              {entry.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          {/* Features (if major) */}
          {entry.features && (
            <div>
              <div className="text-xs text-muted mb-2">New Features</div>
              <div className="grid grid-cols-2 gap-2">
                {entry.features.map((feature, i) => (
                  <div key={i} className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-sm font-medium text-primary">{feature.title}</div>
                    <div className="text-xs text-muted">{feature.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

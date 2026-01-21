/**
 * Panel - Reusable Collapsible Panel Component
 * Matches the clean, cohesive design of the sidebars
 *
 * Features:
 * - Collapsible with smooth transitions
 * - Persistent state via localStorage
 * - Consistent CSS variables styling
 * - Optional badge and icon
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cw-panel-states';

// Load persisted panel states
function loadPanelStates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// Save panel states
function savePanelStates(states) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

/**
 * Panel Component
 * @param {string} id - Unique identifier for persistence
 * @param {string} title - Panel title
 * @param {React.ReactNode} icon - Optional icon (SVG or emoji)
 * @param {React.ReactNode} children - Panel content
 * @param {boolean} defaultExpanded - Initial expanded state (default: true)
 * @param {string|number} badge - Optional badge value
 * @param {string} badgeColor - Badge color class or style
 * @param {string} emptyText - Text to show when content is empty
 * @param {boolean} noPadding - Disable content padding
 * @param {string} className - Additional classes for the panel container
 */
export default function Panel({
  id,
  title,
  icon,
  children,
  defaultExpanded = true,
  badge,
  badgeColor,
  emptyText,
  noPadding = false,
  className = '',
}) {
  const [states, setStates] = useState(() => loadPanelStates());
  const expanded = states[id] ?? defaultExpanded;

  const toggle = useCallback(() => {
    const newStates = { ...states, [id]: !expanded };
    setStates(newStates);
    savePanelStates(newStates);
  }, [id, expanded, states]);

  return (
    <div className={`border-b border-[var(--border-subtle)] last:border-b-0 ${className}`}>
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors duration-150"
      >
        {/* Chevron */}
        <svg
          className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Icon */}
        {icon && (
          <span className="text-sm opacity-60 flex-shrink-0">
            {typeof icon === 'string' ? icon : icon}
          </span>
        )}

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>

        {/* Badge */}
        {badge !== undefined && (
          <span
            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
              badgeColor || 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}
          >
            {badge}
          </span>
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className={noPadding ? '' : 'px-3 pb-3'}>
          {emptyText && !children ? (
            <div className="text-xs text-[var(--text-muted)] font-mono">{emptyText}</div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PanelGroup - Container for multiple panels
 * Provides consistent styling and spacing
 */
export function PanelGroup({ children, className = '' }) {
  return (
    <div className={`bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/**
 * InfoRow - Label-value pair row for displaying data
 * Used within panels for consistent data display
 */
export function InfoRow({ label, value, color, mono = true, icon }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
        {icon && <span className="opacity-60">{icon}</span>}
        {label}
      </span>
      <span
        className={mono ? 'font-mono' : ''}
        style={{ color: color || 'var(--text-secondary)' }}
      >
        {value || '-'}
      </span>
    </div>
  );
}

/**
 * Meter - Progress bar for displaying percentages
 */
export function Meter({ label, value, color, showValue = true }) {
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)] w-12 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, numValue)}%`,
            background: color || 'var(--accent-primary)',
          }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-mono text-[var(--text-secondary)] w-10 text-right">
          {numValue.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

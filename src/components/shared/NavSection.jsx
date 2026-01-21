/**
 * NavSection - Collapsible Navigation Section
 * Used for grouping navigation items in sidebars
 *
 * Matches the LeftSidebar SectionHeader pattern
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cw-nav-sections';

// Load persisted section states
function loadSectionStates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// Save section states
function saveSectionStates(states) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

/**
 * NavSection Component
 * @param {string} id - Unique identifier for persistence
 * @param {string} title - Section title
 * @param {React.ReactNode} icon - Optional icon
 * @param {React.ReactNode} children - NavItem children
 * @param {boolean} defaultExpanded - Initial expanded state (default: true)
 * @param {number} count - Optional item count badge
 */
export default function NavSection({
  id,
  title,
  icon,
  children,
  defaultExpanded = true,
  count,
}) {
  const [states, setStates] = useState(() => loadSectionStates());
  const expanded = states[id] ?? defaultExpanded;

  const toggle = useCallback(() => {
    const newStates = { ...states, [id]: !expanded };
    setStates(newStates);
    saveSectionStates(newStates);
  }, [id, expanded, states]);

  return (
    <div className="py-1">
      {/* Section Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
      >
        {/* Chevron */}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Icon */}
        {icon && <span className="w-3 h-3 flex-shrink-0">{icon}</span>}

        {/* Title */}
        <span className="flex-1 text-left">{title}</span>

        {/* Count Badge */}
        {count !== undefined && (
          <span className="text-[10px] opacity-60">{count}</span>
        )}
      </button>

      {/* Section Content */}
      {expanded && (
        <div className="py-1">
          {children}
        </div>
      )}
    </div>
  );
}

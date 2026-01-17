/**
 * SubTabBar Component
 * Reusable sub-navigation bar for admin tab panes
 */

import { Fragment } from 'react';

// Color mapping for sub-tab styling
const COLOR_CLASSES = {
  green: {
    active: 'bg-hacker-green/20 text-hacker-green border border-hacker-green/50',
    inactive: 'text-hacker-text-dim hover:text-hacker-green/70',
  },
  cyan: {
    active: 'bg-hacker-cyan/20 text-hacker-cyan border border-hacker-cyan/50',
    inactive: 'text-hacker-text-dim hover:text-hacker-cyan/70',
  },
  purple: {
    active: 'bg-hacker-purple/20 text-hacker-purple border border-hacker-purple/50',
    inactive: 'text-hacker-text-dim hover:text-hacker-purple/70',
  },
  warning: {
    active: 'bg-hacker-warning/20 text-hacker-warning border border-hacker-warning/50',
    inactive: 'text-hacker-text-dim hover:text-hacker-warning/70',
  },
  blue: {
    active: 'bg-hacker-blue/20 text-hacker-blue border border-hacker-blue/50',
    inactive: 'text-hacker-text-dim hover:text-hacker-blue/70',
  },
  error: {
    active: 'bg-hacker-error/20 text-hacker-error border border-hacker-error/50',
    inactive: 'text-hacker-text-dim hover:text-hacker-error/70',
  },
};

/**
 * SubTabBar - Horizontal sub-navigation for tab panes
 *
 * @param {Object} props
 * @param {Array<{ key: string, label: string, color?: string, badge?: number }>} props.tabs - Tab definitions
 * @param {string} props.activeTab - Currently active tab key
 * @param {Function} props.setActiveTab - Tab change handler
 * @param {number[]} [props.dividers] - Indices where to show dividers (e.g., [1, 4] puts dividers after 1st and 4th tabs)
 * @param {Function} [props.onRefresh] - Optional refresh handler
 * @param {boolean} [props.loading] - Loading state for refresh button
 */
export function SubTabBar({
  tabs,
  activeTab,
  setActiveTab,
  dividers = [],
  onRefresh,
  loading = false
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-1 bg-hacker-surface/50 rounded-lg p-1 border border-hacker-green/20 flex-wrap">
        {tabs.map((tab, index) => {
          const color = tab.color || 'green';
          const colorClasses = COLOR_CLASSES[color] || COLOR_CLASSES.green;
          const isActive = activeTab === tab.key;

          return (
            <Fragment key={tab.key}>
              {dividers.includes(index) && (
                <span className="text-hacker-text-dim/30 mx-1">|</span>
              )}
              <button
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1 ${
                  isActive ? colorClasses.active : colorClasses.inactive
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] bg-hacker-error rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="hacker-btn text-xs"
        >
          {loading ? '[LOADING...]' : '[REFRESH]'}
        </button>
      )}
    </div>
  );
}

export default SubTabBar;

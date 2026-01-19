/**
 * TerminalTabBar Component
 * Tab bar displayed above the terminal for multi-tab support
 */

import { useState, useCallback } from 'react';
import TerminalTabItem from './TerminalTabItem';
import NewTabDialog from './NewTabDialog';
import { MAX_TABS_PER_PROJECT } from './constants';

function TerminalTabBar({
  tabs = [],
  activeTabId,
  onTabSelect,
  onTabCreate,
  onTabClose,
  onTabRename,
  onTabColorChange,
  isLoading = false,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [showNewTabDialog, setShowNewTabDialog] = useState(false);

  const handleOpenNewTabDialog = useCallback(() => {
    if (tabs.length >= MAX_TABS_PER_PROJECT) {
      return;
    }
    setShowNewTabDialog(true);
  }, [tabs.length]);

  const handleCreateTab = useCallback(async (options = {}) => {
    setIsCreating(true);
    try {
      await onTabCreate(options);
    } finally {
      setIsCreating(false);
    }
  }, [onTabCreate]);

  // Don't render if no tabs
  if (tabs.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="flex items-end gap-0.5 px-3 pt-2 bg-transparent">
      {/* Tab items */}
      {tabs.map((tab) => (
        <TerminalTabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onSelect={onTabSelect}
          onClose={onTabClose}
          onRename={(newName) => onTabRename(tab.id, newName)}
          onColorChange={onTabColorChange}
          canClose={tabs.length > 1}
        />
      ))}

      {/* Add tab button */}
      {tabs.length < MAX_TABS_PER_PROJECT && (
        <button
          onClick={handleOpenNewTabDialog}
          disabled={isCreating || isLoading}
          className={`
            flex items-center justify-center w-7 h-7 rounded-t-lg
            text-text-secondary hover:text-text-primary
            bg-glass-light/30 hover:bg-glass-light
            border-t border-l border-r border-transparent hover:border-border-subtle/50
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="New tab (Ctrl+T)"
        >
          {isCreating ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      )}

      {/* New tab dialog */}
      <NewTabDialog
        isOpen={showNewTabDialog}
        onClose={() => setShowNewTabDialog(false)}
        onCreate={handleCreateTab}
        tabCount={tabs.length}
      />

      {/* Loading indicator */}
      {isLoading && tabs.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-text-secondary text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading tabs...
        </div>
      )}

      {/* Tab count indicator */}
      <div className="ml-auto flex items-center px-2 text-xs text-text-secondary">
        {tabs.length}/{MAX_TABS_PER_PROJECT}
      </div>
    </div>
  );
}

export default TerminalTabBar;

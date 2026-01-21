/**
 * TerminalTabItem Component
 * Individual tab button for the terminal tab bar
 */

import { useState, useRef } from 'react';
import { getTabColor } from './constants';
import TerminalTabColorPicker from './TerminalTabColorPicker';

/**
 * Get display name for a tab
 * Priority: displayName > extract from sessionName > fallback to Tab N
 */
function getTabDisplayName(tab) {
  if (tab.displayName) {
    return tab.displayName;
  }
  // For first tab (tabOrder 0), try to extract project name from sessionName
  // sessionName format: sp-ProjectName or sp-ProjectName-TabName
  if (tab.sessionName && (tab.tabOrder === 0 || tab.tabOrder === null)) {
    const match = tab.sessionName.match(/^sp-(.+?)(?:-\d+)?$/);
    if (match) {
      return match[1]; // Return project name
    }
  }
  return `Tab ${(tab.tabOrder ?? 0) + 1}`;
}

function TerminalTabItem({
  tab,
  isActive,
  onSelect,
  onClose,
  onRename,
  onColorChange,
  canClose = true,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tab.displayName || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const inputRef = useRef(null);
  const tabRef = useRef(null);

  const colorConfig = getTabColor(tab.tabColor);
  const displayName = getTabDisplayName(tab);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditValue(tab.displayName || '');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleRenameSubmit = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== tab.displayName) {
      onRename(editValue.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(tab.displayName || '');
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  return (
    <div
      ref={tabRef}
      className={`
        group relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg cursor-pointer
        transition-all duration-150 select-none min-w-[80px] max-w-[160px]
        ${isActive
          ? 'bg-glass-medium border-t border-l border-r border-border-subtle'
          : 'bg-glass-light/50 hover:bg-glass-light border-t border-l border-r border-transparent hover:border-border-subtle/50'
        }
      `}
      onClick={() => onSelect(tab.id)}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Color indicator dot */}
      {colorConfig && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: colorConfig.hex }}
        />
      )}

      {/* Tab name */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none text-sm text-text-primary w-full min-w-[50px]"
          maxLength={50}
          autoFocus
        />
      ) : (
        <span className="text-sm text-text-primary truncate">
          {displayName}
        </span>
      )}

      {/* Close button (shown on hover if canClose) */}
      {canClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(tab.id);
          }}
          className="
            opacity-0 group-hover:opacity-100 ml-auto
            w-4 h-4 flex items-center justify-center rounded
            text-text-secondary hover:text-text-primary hover:bg-glass-light
            transition-all
          "
          title="Close tab"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <TabContextMenu
          tab={tab}
          canClose={canClose}
          onClose={handleCloseContextMenu}
          onRename={() => {
            handleCloseContextMenu();
            setEditValue(tab.displayName || '');
            setIsEditing(true);
            setTimeout(() => inputRef.current?.select(), 0);
          }}
          onChangeColor={() => {
            handleCloseContextMenu();
            setShowColorPicker(true);
          }}
          onCloseTab={() => {
            handleCloseContextMenu();
            onClose(tab.id);
          }}
        />
      )}

      {/* Color picker */}
      {showColorPicker && (
        <TerminalTabColorPicker
          currentColor={tab.tabColor}
          onColorChange={(color) => onColorChange(tab.id, color)}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
}

/**
 * Context menu for tab right-click
 */
function TabContextMenu({ tab, canClose, onClose, onRename, onChangeColor, onCloseTab }) {
  const menuRef = useRef(null);

  // Close on outside click
  useState(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute top-full left-0 mt-1 z-50 py-1 rounded-lg bg-glass-medium backdrop-blur-md border border-border-subtle shadow-lg min-w-[140px]"
    >
      <button
        onClick={onRename}
        className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-glass-light transition-colors"
      >
        Rename
      </button>
      <button
        onClick={onChangeColor}
        className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-glass-light transition-colors"
      >
        Change Color
      </button>
      {canClose && (
        <>
          <div className="h-px bg-border-subtle my-1" />
          <button
            onClick={onCloseTab}
            className="w-full px-3 py-1.5 text-left text-sm text-hacker-error hover:bg-glass-light transition-colors"
          >
            Close Tab
          </button>
        </>
      )}
    </div>
  );
}

export default TerminalTabItem;

/**
 * Keyboard Shortcuts Hook
 * Global keyboard shortcut handler for Command Portal
 */

import { useEffect, useCallback, useState } from 'react';

// Default keyboard shortcuts mapping
export const DEFAULT_SHORTCUTS = {
  'Ctrl+Shift+P': 'openCommandPalette',
  'Ctrl+Shift+K': 'openCommandPalette', // Alternative
  'Ctrl+1': 'switchToSession1',
  'Ctrl+2': 'switchToSession2',
  'Ctrl+3': 'switchToSession3',
  'Ctrl+4': 'switchToSession4',
  'Ctrl+5': 'switchToSession5',
  'Ctrl+6': 'switchToSession6',
  'Ctrl+7': 'switchToSession7',
  'Ctrl+8': 'switchToSession8',
  'Ctrl+9': 'switchToSession9',
  'Ctrl+N': 'newSession',
  'Ctrl+W': 'closeSession',
  'Ctrl+F': 'focusSearch',
  'Ctrl+,': 'openSettings',
  'Ctrl+B': 'toggleSidebar',
  'Ctrl+Shift+B': 'toggleRightSidebar',
  'Escape': 'exitFocusMode',
  'F11': 'toggleFullscreen',
  'Ctrl+Shift+A': 'openAdmin',
  'Ctrl+T': 'openTemplates',
  'Ctrl+Shift+N': 'openNotes',
  'Ctrl+Shift+T': 'openThemes',
  'Ctrl+/': 'showShortcuts',
};

// Human-readable descriptions for each action
export const ACTION_DESCRIPTIONS = {
  openCommandPalette: 'Open Command Palette',
  switchToSession1: 'Switch to Session 1',
  switchToSession2: 'Switch to Session 2',
  switchToSession3: 'Switch to Session 3',
  switchToSession4: 'Switch to Session 4',
  switchToSession5: 'Switch to Session 5',
  switchToSession6: 'Switch to Session 6',
  switchToSession7: 'Switch to Session 7',
  switchToSession8: 'Switch to Session 8',
  switchToSession9: 'Switch to Session 9',
  newSession: 'New Session',
  closeSession: 'Close Current Session',
  focusSearch: 'Focus Search',
  openSettings: 'Open Settings',
  toggleSidebar: 'Toggle Left Sidebar',
  toggleRightSidebar: 'Toggle Right Sidebar',
  exitFocusMode: 'Exit Focus Mode / Close Modal',
  toggleFullscreen: 'Toggle Fullscreen',
  openAdmin: 'Open Admin Dashboard',
  openTemplates: 'Open Session Templates',
  openNotes: 'Open Session Notes',
  openThemes: 'Open Theme Picker',
  showShortcuts: 'Show Keyboard Shortcuts',
};

/**
 * Parse a keyboard event into a shortcut string
 */
function parseKeyboardEvent(event) {
  const parts = [];

  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');

  // Get the key, handling special cases
  let key = event.key;

  // Normalize key names
  if (key === ' ') key = 'Space';
  if (key === 'ArrowUp') key = 'Up';
  if (key === 'ArrowDown') key = 'Down';
  if (key === 'ArrowLeft') key = 'Left';
  if (key === 'ArrowRight') key = 'Right';

  // Don't add modifier keys as the main key
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    return null;
  }

  // Capitalize single letters
  if (key.length === 1) {
    key = key.toUpperCase();
  }

  parts.push(key);

  return parts.join('+');
}

/**
 * Custom hook for keyboard shortcuts
 * @param {Object} handlers - Object mapping action names to handler functions
 * @param {Object} options - Configuration options
 */
export function useKeyboardShortcuts(handlers = {}, options = {}) {
  const {
    enabled = true,
    shortcuts = DEFAULT_SHORTCUTS,
    ignoreInputs = true, // Ignore shortcuts when focused on inputs
  } = options;

  const [lastAction, setLastAction] = useState(null);

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Ignore if focused on input elements (unless it's Escape)
    if (ignoreInputs && event.key !== 'Escape') {
      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isContentEditable = activeElement?.isContentEditable;

      if (tagName === 'input' || tagName === 'textarea' || isContentEditable) {
        return;
      }
    }

    const shortcutString = parseKeyboardEvent(event);
    if (!shortcutString) return;

    const action = shortcuts[shortcutString];
    if (!action) return;

    const handler = handlers[action];
    if (handler && typeof handler === 'function') {
      event.preventDefault();
      event.stopPropagation();
      handler(event);
      setLastAction({ action, shortcut: shortcutString, timestamp: Date.now() });
    }
  }, [enabled, shortcuts, handlers, ignoreInputs]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    lastAction,
    shortcuts,
    actions: ACTION_DESCRIPTIONS,
  };
}

/**
 * Get all shortcuts grouped by category
 */
export function getShortcutsByCategory() {
  return {
    'Navigation': [
      { keys: 'Ctrl+B', action: 'toggleSidebar', description: 'Toggle Left Sidebar' },
      { keys: 'Ctrl+Shift+B', action: 'toggleRightSidebar', description: 'Toggle Right Sidebar' },
      { keys: 'Ctrl+1-9', action: 'switchToSession', description: 'Switch to Session 1-9' },
      { keys: 'F11', action: 'toggleFullscreen', description: 'Toggle Fullscreen' },
    ],
    'Commands': [
      { keys: 'Ctrl+Shift+P', action: 'openCommandPalette', description: 'Open Command Palette' },
      { keys: 'Ctrl+F', action: 'focusSearch', description: 'Focus Search' },
      { keys: 'Ctrl+/', action: 'showShortcuts', description: 'Show Keyboard Shortcuts' },
    ],
    'Sessions': [
      { keys: 'Ctrl+N', action: 'newSession', description: 'New Session' },
      { keys: 'Ctrl+W', action: 'closeSession', description: 'Close Current Session' },
      { keys: 'Ctrl+T', action: 'openTemplates', description: 'Open Session Templates' },
      { keys: 'Ctrl+Shift+N', action: 'openNotes', description: 'Open Session Notes' },
    ],
    'General': [
      { keys: 'Ctrl+,', action: 'openSettings', description: 'Open Settings' },
      { keys: 'Ctrl+Shift+A', action: 'openAdmin', description: 'Open Admin Dashboard' },
      { keys: 'Escape', action: 'exitFocusMode', description: 'Exit Focus Mode / Close Modal' },
    ],
  };
}

export default useKeyboardShortcuts;

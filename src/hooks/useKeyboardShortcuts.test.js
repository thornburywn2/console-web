/**
 * useKeyboardShortcuts Hook Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useKeyboardShortcuts,
  DEFAULT_SHORTCUTS,
  ACTION_DESCRIPTIONS,
  getShortcutsByCategory
} from './useKeyboardShortcuts';

// Helper to create a keyboard event
function createKeyboardEvent(key, modifiers = {}) {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey: modifiers.ctrl || modifiers.ctrlKey || false,
    shiftKey: modifiers.shift || modifiers.shiftKey || false,
    altKey: modifiers.alt || modifiers.altKey || false,
    metaKey: modifiers.meta || modifiers.metaKey || false,
    bubbles: true,
    cancelable: true,
  });
}

describe('DEFAULT_SHORTCUTS', () => {
  it('should have command palette shortcut', () => {
    expect(DEFAULT_SHORTCUTS['Ctrl+Shift+P']).toBe('openCommandPalette');
  });

  it('should have session switching shortcuts', () => {
    expect(DEFAULT_SHORTCUTS['Ctrl+1']).toBe('switchToSession1');
    expect(DEFAULT_SHORTCUTS['Ctrl+9']).toBe('switchToSession9');
  });

  it('should have navigation shortcuts', () => {
    expect(DEFAULT_SHORTCUTS['Ctrl+]']).toBe('nextSession');
    expect(DEFAULT_SHORTCUTS['Ctrl+[']).toBe('previousSession');
  });

  it('should have sidebar toggle shortcuts', () => {
    expect(DEFAULT_SHORTCUTS['Ctrl+B']).toBe('toggleSidebar');
    expect(DEFAULT_SHORTCUTS['Ctrl+Shift+B']).toBe('toggleRightSidebar');
  });

  it('should have escape shortcut', () => {
    expect(DEFAULT_SHORTCUTS['Escape']).toBe('exitFocusMode');
  });
});

describe('ACTION_DESCRIPTIONS', () => {
  it('should have descriptions for all default shortcuts', () => {
    const actions = Object.values(DEFAULT_SHORTCUTS);
    for (const action of actions) {
      expect(ACTION_DESCRIPTIONS[action]).toBeDefined();
      expect(typeof ACTION_DESCRIPTIONS[action]).toBe('string');
    }
  });

  it('should have human-readable descriptions', () => {
    expect(ACTION_DESCRIPTIONS.openCommandPalette).toBe('Open Command Palette');
    expect(ACTION_DESCRIPTIONS.toggleSidebar).toBe('Toggle Left Sidebar');
    expect(ACTION_DESCRIPTIONS.exitFocusMode).toBe('Exit Focus Mode / Close Modal');
  });
});

describe('getShortcutsByCategory', () => {
  it('should return categories object', () => {
    const categories = getShortcutsByCategory();
    expect(categories).toBeDefined();
    expect(typeof categories).toBe('object');
  });

  it('should have Navigation category', () => {
    const categories = getShortcutsByCategory();
    expect(categories.Navigation).toBeDefined();
    expect(Array.isArray(categories.Navigation)).toBe(true);
  });

  it('should have Commands category', () => {
    const categories = getShortcutsByCategory();
    expect(categories.Commands).toBeDefined();
    expect(categories.Commands.some(s => s.action === 'openCommandPalette')).toBe(true);
  });

  it('should have Sessions category', () => {
    const categories = getShortcutsByCategory();
    expect(categories.Sessions).toBeDefined();
    expect(categories.Sessions.some(s => s.action === 'newSession')).toBe(true);
  });

  it('should have General category', () => {
    const categories = getShortcutsByCategory();
    expect(categories.General).toBeDefined();
    expect(categories.General.some(s => s.action === 'openSettings')).toBe(true);
  });

  it('should have shortcut items with required fields', () => {
    const categories = getShortcutsByCategory();
    const allShortcuts = Object.values(categories).flat();

    for (const shortcut of allShortcuts) {
      expect(shortcut.keys).toBeDefined();
      expect(shortcut.action).toBeDefined();
      expect(shortcut.description).toBeDefined();
    }
  });
});

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return shortcuts and actions', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      expect(result.current.shortcuts).toBe(DEFAULT_SHORTCUTS);
      expect(result.current.actions).toBe(ACTION_DESCRIPTIONS);
      expect(result.current.lastAction).toBeNull();
    });

    it('should accept custom shortcuts', () => {
      const customShortcuts = { 'Ctrl+M': 'myAction' };
      const { result } = renderHook(() =>
        useKeyboardShortcuts({}, { shortcuts: customShortcuts })
      );

      expect(result.current.shortcuts).toBe(customShortcuts);
    });
  });

  describe('keyboard event handling', () => {
    it('should call handler for matching shortcut', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('P', { ctrl: true, shift: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call handler when disabled', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      renderHook(() => useKeyboardShortcuts(handlers, { enabled: false }));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('P', { ctrl: true, shift: true }));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should update lastAction when shortcut triggered', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      const { result } = renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('P', { ctrl: true, shift: true }));
      });

      expect(result.current.lastAction).toBeDefined();
      expect(result.current.lastAction.action).toBe('openCommandPalette');
      expect(result.current.lastAction.shortcut).toBe('Ctrl+Shift+P');
    });

    it('should not call handler for unmatched shortcuts', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('X', { ctrl: true }));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle Escape key', () => {
      const handler = vi.fn();
      const handlers = { exitFocusMode: handler };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('Escape'));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle function keys', () => {
      const handler = vi.fn();
      const handlers = { toggleFullscreen: handler };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('F11'));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('input element handling', () => {
    let input;

    beforeEach(() => {
      input = document.createElement('input');
      document.body.appendChild(input);
    });

    afterEach(() => {
      document.body.removeChild(input);
    });

    it('should ignore shortcuts when focused on input by default', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        input.focus();
        input.dispatchEvent(createKeyboardEvent('P', { ctrl: true, shift: true }));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow Escape when focused on input', () => {
      const handler = vi.fn();
      const handlers = { exitFocusMode: handler };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        input.focus();
        document.dispatchEvent(createKeyboardEvent('Escape'));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not ignore inputs when ignoreInputs is false', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      renderHook(() => useKeyboardShortcuts(handlers, { ignoreInputs: false }));

      act(() => {
        input.focus();
        document.dispatchEvent(createKeyboardEvent('P', { ctrl: true, shift: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('modifier key handling', () => {
    it('should not trigger on modifier keys alone', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('Control'));
        document.dispatchEvent(createKeyboardEvent('Shift'));
        document.dispatchEvent(createKeyboardEvent('Alt'));
        document.dispatchEvent(createKeyboardEvent('Meta'));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle Ctrl+number combinations', () => {
      const handler = vi.fn();
      const handlers = {
        switchToSession1: handler,
        switchToSession2: handler,
      };

      renderHook(() => useKeyboardShortcuts(handlers));

      act(() => {
        document.dispatchEvent(createKeyboardEvent('1', { ctrl: true }));
        document.dispatchEvent(createKeyboardEvent('2', { ctrl: true }));
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const handler = vi.fn();
      const handlers = { openCommandPalette: handler };

      const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
      unmount();

      act(() => {
        document.dispatchEvent(createKeyboardEvent('P', { ctrl: true, shift: true }));
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

/**
 * useTheme Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, THEMES } from './useTheme';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('initialization', () => {
    it('should initialize with default theme when no stored theme', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('dark');
    });

    it('should load theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('dracula');
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('dracula');
    });

    it('should fall back to default if stored theme is invalid', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-theme');
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('dark');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error');
      });
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should change theme', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('nord');
      });

      expect(result.current.theme).toBe('nord');
    });

    it('should persist theme to localStorage', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('cyberpunk');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('cw-theme', 'cyberpunk');
    });

    it('should not change theme for invalid theme id', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('invalid-theme');
      });

      expect(result.current.theme).toBe('dark');
      expect(consoleWarn).toHaveBeenCalledWith('Invalid theme: invalid-theme');
      consoleWarn.mockRestore();
    });

    it('should handle localStorage setItem errors', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage error');
      });
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('sepia');
      });

      // Should still update state even if localStorage fails
      expect(result.current.theme).toBe('sepia');
    });
  });

  describe('cycleTheme', () => {
    it('should cycle to the next theme', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.cycleTheme();
      });

      // dark -> dracula (next theme in THEMES array)
      expect(result.current.theme).toBe('dracula');
    });

    it('should wrap around to first theme after last', () => {
      localStorageMock.getItem.mockReturnValueOnce('one-dark'); // Last theme
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.cycleTheme();
      });

      // one-dark -> dark (first theme)
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('currentTheme', () => {
    it('should return current theme object', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.currentTheme).toEqual(
        expect.objectContaining({
          id: 'dark',
          name: 'Dark',
        })
      );
    });

    it('should update when theme changes', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('nord');
      });

      expect(result.current.currentTheme).toEqual(
        expect.objectContaining({
          id: 'nord',
          name: 'Nord',
        })
      );
    });
  });

  describe('isDark', () => {
    it('should return true for dark themes', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(true);
    });

    it('should return false for light theme', () => {
      localStorageMock.getItem.mockReturnValueOnce('light');
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('themes', () => {
    it('should expose all available themes', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.themes).toEqual(THEMES);
      expect(result.current.themes.length).toBe(15);
    });
  });

  describe('DOM application', () => {
    it('should set data-theme attribute on document', () => {
      renderHook(() => useTheme());
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update data-theme when theme changes', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('cyberpunk');
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk');
    });
  });
});

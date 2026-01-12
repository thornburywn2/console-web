/**
 * Theme Management Hook
 * Handles theme selection, persistence, and application
 */

import { useState, useEffect, useCallback } from 'react';

// Available themes - all optimized for WCAG accessibility
export const THEMES = [
  { id: 'dark', name: 'Dark', description: 'Soft dark theme with green accents - easy on the eyes' },
  { id: 'dracula', name: 'Dracula', description: 'Popular dark theme with purple accents' },
  { id: 'nord', name: 'Nord', description: 'Arctic, north-bluish color palette' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Vibrant neon colors with readable contrast' },
  { id: 'sepia', name: 'Sepia', description: 'Warm amber tones for reduced eye strain at night' },
  { id: 'light', name: 'Light', description: 'Clean off-white theme for bright environments' },
];

const THEME_STORAGE_KEY = 'ccm-theme';
const DEFAULT_THEME = 'dark';

/**
 * Custom hook for theme management
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    // Try to load theme from localStorage
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && THEMES.some(t => t.id === stored)) {
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
    return DEFAULT_THEME;
  });

  // Apply theme to document
  const applyTheme = useCallback((themeId) => {
    document.documentElement.setAttribute('data-theme', themeId);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const themeColors = {
      dark: '#121217',
      dracula: '#282a36',
      nord: '#2e3440',
      cyberpunk: '#0f1419',
      sepia: '#1c1814',
      light: '#f8f9fb',
    };

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColors[themeId] || themeColors.dark);
    }
  }, []);

  // Apply theme on mount and theme change
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Set theme and persist
  const setTheme = useCallback((themeId) => {
    if (!THEMES.some(t => t.id === themeId)) {
      console.warn(`Invalid theme: ${themeId}`);
      return;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // Ignore localStorage errors
    }

    setThemeState(themeId);
  }, []);

  // Cycle to next theme
  const cycleTheme = useCallback(() => {
    const currentIndex = THEMES.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex].id);
  }, [theme, setTheme]);

  // Get current theme info
  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

  return {
    theme,
    setTheme,
    cycleTheme,
    themes: THEMES,
    currentTheme,
    isDark: theme !== 'light',
  };
}

export default useTheme;

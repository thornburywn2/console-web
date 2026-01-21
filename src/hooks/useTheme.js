/**
 * Theme Management Hook
 * Handles theme selection, persistence, and application
 */

import { useState, useEffect, useCallback } from 'react';

// Available themes - all optimized for WCAG accessibility
// Includes OpenCode-compatible themes for consistency across tools
export const THEMES = [
  // Original console-web themes
  { id: 'dark', name: 'Dark', description: 'Soft dark theme with green accents - easy on the eyes' },
  { id: 'dracula', name: 'Dracula', description: 'Popular dark theme with purple accents' },
  { id: 'nord', name: 'Nord', description: 'Arctic, north-bluish color palette' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Vibrant neon colors with readable contrast' },
  { id: 'sepia', name: 'Sepia', description: 'Warm amber tones for reduced eye strain at night' },
  { id: 'light', name: 'Light', description: 'Clean off-white theme for bright environments' },
  // OpenCode-compatible themes
  { id: 'matrix', name: 'Matrix', description: 'Hacker-style green on black theme' },
  { id: 'tokyonight', name: 'Tokyo Night', description: 'Clean dark theme celebrating Downtown Tokyo at night' },
  { id: 'catppuccin', name: 'Catppuccin Mocha', description: 'Soothing pastel theme - the darkest variant' },
  { id: 'catppuccin-macchiato', name: 'Catppuccin Macchiato', description: 'Medium contrast pastel theme' },
  { id: 'gruvbox', name: 'Gruvbox', description: 'Retro groove color scheme with warm tones' },
  { id: 'kanagawa', name: 'Kanagawa', description: 'Inspired by the famous painting by Katsushika Hokusai' },
  { id: 'everforest', name: 'Everforest', description: 'Comfortable green-based color scheme' },
  { id: 'ayu', name: 'Ayu Dark', description: 'Clean and modern with golden accents' },
  { id: 'one-dark', name: 'One Dark', description: 'Atom One Dark - classic and clean' },
];

const THEME_STORAGE_KEY = 'cw-theme';
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
      // OpenCode-compatible themes
      matrix: '#000000',
      tokyonight: '#1a1b26',
      catppuccin: '#1e1e2e',
      'catppuccin-macchiato': '#24273a',
      gruvbox: '#282828',
      kanagawa: '#1f1f28',
      everforest: '#2d353b',
      ayu: '#0d1017',
      'one-dark': '#282c34',
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

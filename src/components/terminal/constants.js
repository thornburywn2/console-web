/**
 * Terminal Constants
 */

// Debug flags
export const CLIPBOARD_DEBUG = false; // Set to true to debug clipboard issues
export const PASTE_DEBUG = false; // Set to true to debug paste duplication

// xterm.js theme configuration - glassmorphism style
export const XTERM_THEME = {
  background: 'transparent', // Transparent to show glass effect
  foreground: '#e8eff7',
  cursor: '#10b981',
  cursorAccent: '#0c0c0c',
  selectionBackground: 'rgba(16, 185, 129, 0.3)',
  black: '#1a1a1a',
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  magenta: '#8b5cf6',
  cyan: '#06b6d4',
  white: '#e8eff7',
  brightBlack: '#4b5563',
  brightRed: '#f87171',
  brightGreen: '#34d399',
  brightYellow: '#fbbf24',
  brightBlue: '#60a5fa',
  brightMagenta: '#a78bfa',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
};

// xterm.js configuration options
export const XTERM_OPTIONS = {
  cursorBlink: true,
  cursorStyle: 'block',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
  fontSize: 14,
  lineHeight: 1.2,
  letterSpacing: 0,
  allowProposedApi: true,
  scrollback: 10000,
  convertEol: true,
  scrollOnUserInput: true,
  rightClickSelectsWord: false, // Allow browser's default right-click menu
};

// =============================================================================
// MULTI-TAB TERMINAL CONSTANTS (v1.0.27)
// =============================================================================

// Tab color presets matching the glassmorphism theme
export const TAB_COLORS = {
  green: {
    bg: 'bg-hacker-green',
    text: 'text-hacker-green',
    border: 'border-hacker-green',
    hex: '#10b981',
    name: 'Green',
  },
  cyan: {
    bg: 'bg-hacker-cyan',
    text: 'text-hacker-cyan',
    border: 'border-hacker-cyan',
    hex: '#06b6d4',
    name: 'Cyan',
  },
  purple: {
    bg: 'bg-hacker-purple',
    text: 'text-hacker-purple',
    border: 'border-hacker-purple',
    hex: '#8b5cf6',
    name: 'Purple',
  },
  warning: {
    bg: 'bg-hacker-warning',
    text: 'text-hacker-warning',
    border: 'border-hacker-warning',
    hex: '#f59e0b',
    name: 'Warning',
  },
  blue: {
    bg: 'bg-hacker-blue',
    text: 'text-hacker-blue',
    border: 'border-hacker-blue',
    hex: '#3b82f6',
    name: 'Blue',
  },
  error: {
    bg: 'bg-hacker-error',
    text: 'text-hacker-error',
    border: 'border-hacker-error',
    hex: '#ef4444',
    name: 'Red',
  },
  pink: {
    bg: 'bg-pink-500',
    text: 'text-pink-500',
    border: 'border-pink-500',
    hex: '#ec4899',
    name: 'Pink',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    border: 'border-orange-500',
    hex: '#f97316',
    name: 'Orange',
  },
};

// Maximum number of tabs per project
export const MAX_TABS_PER_PROJECT = 8;

// Tab color keys for iteration
export const TAB_COLOR_KEYS = Object.keys(TAB_COLORS);

/**
 * Get the display color for a tab
 * @param {string|null} colorKey - The color key (e.g., 'green', 'cyan')
 * @returns {object|null} Color config object or null for default
 */
export function getTabColor(colorKey) {
  if (!colorKey) return null;
  return TAB_COLORS[colorKey] || null;
}

/**
 * Get the next available default name for a tab
 * @param {number} tabOrder - The tab's order index
 * @returns {string} Default tab name
 */
export function getDefaultTabName(tabOrder) {
  return `Tab ${tabOrder + 1}`;
}

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

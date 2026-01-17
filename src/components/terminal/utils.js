/**
 * Terminal Utility Functions
 */

import { CLIPBOARD_DEBUG, PASTE_DEBUG } from './constants';

// Debug logging helpers
export const clipboardLog = (...args) => CLIPBOARD_DEBUG && console.log('[Clipboard]', ...args);
export const pasteLog = (...args) => PASTE_DEBUG && console.log('[Paste]', ...args);

// Cache terminal buffers per project path (survives component re-renders)
export const terminalBufferCache = new Map();

// Helper to copy text to clipboard with fallback
export const copyTextToClipboard = (text) => {
  if (!text || text.length === 0) return;

  navigator.clipboard.writeText(text)
    .then(() => {
      console.log('Copied to clipboard:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    })
    .catch(err => {
      // Fallback for non-secure contexts: use execCommand
      console.warn('Clipboard API failed, trying fallback:', err);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Copied via fallback');
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    });
};

// Check if terminal renderer is ready
export const checkTerminalReady = (term) => {
  if (!term) return false;
  try {
    // Check if the render service and dimensions are available
    return !!(term._core?._renderService?._renderer?.value?.dimensions);
  } catch {
    return false;
  }
};

// Attempt fit with retries
export const attemptFit = (fitAddon, term, onResize, isTerminalReady, retries = 0, maxRetries = 10) => {
  try {
    if (isTerminalReady()) {
      fitAddon.fit();
      onResize(term.cols, term.rows);
    } else if (retries < maxRetries) {
      setTimeout(() => attemptFit(fitAddon, term, onResize, isTerminalReady, retries + 1, maxRetries), 50 * (retries + 1));
    }
  } catch (err) {
    if (retries < maxRetries) {
      setTimeout(() => attemptFit(fitAddon, term, onResize, isTerminalReady, retries + 1, maxRetries), 50 * (retries + 1));
    } else {
      console.error('Initial fit error after retries:', err);
    }
  }
};

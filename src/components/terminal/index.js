/**
 * Terminal Components Index
 */

export {
  CLIPBOARD_DEBUG,
  PASTE_DEBUG,
  XTERM_THEME,
  XTERM_OPTIONS,
  TAB_COLORS,
  MAX_TABS_PER_PROJECT,
  TAB_COLOR_KEYS,
  getTabColor,
  getDefaultTabName,
} from './constants';
export {
  clipboardLog,
  pasteLog,
  terminalBufferCache,
  copyTextToClipboard,
  checkTerminalReady,
  attemptFit
} from './utils';
export { CompletionToast, CopyToast, LoadingOverlay } from './TerminalToast';

// Multi-tab components (v1.0.27)
export { default as TerminalTabBar } from './TerminalTabBar';
export { default as TerminalTabItem } from './TerminalTabItem';
export { default as TerminalTabColorPicker } from './TerminalTabColorPicker';

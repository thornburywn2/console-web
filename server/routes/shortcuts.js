/**
 * Keyboard Shortcuts API Routes
 * Manages keyboard shortcut customization
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('shortcuts');

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS = [
  { action: 'openCommandPalette', keys: 'Ctrl+Shift+P', description: 'Open command palette', category: 'navigation' },
  { action: 'openGlobalSearch', keys: 'Ctrl+/', description: 'Open global search', category: 'navigation' },
  { action: 'toggleAdmin', keys: 'Ctrl+Shift+A', description: 'Toggle admin dashboard', category: 'navigation' },
  { action: 'toggleFocusMode', keys: 'Ctrl+Shift+F', description: 'Toggle focus mode', category: 'view' },
  { action: 'cycleTheme', keys: 'Ctrl+Shift+T', description: 'Cycle through themes', category: 'view' },
  { action: 'openThemePicker', keys: 'Ctrl+Alt+T', description: 'Open theme picker', category: 'view' },
  { action: 'showShortcuts', keys: 'Ctrl+?', description: 'Show keyboard shortcuts', category: 'help' },
  { action: 'newSession', keys: 'Ctrl+N', description: 'New terminal session', category: 'session' },
  { action: 'closeSession', keys: 'Ctrl+W', description: 'Close current session', category: 'session' },
  { action: 'nextSession', keys: 'Ctrl+Tab', description: 'Switch to next session', category: 'session' },
  { action: 'prevSession', keys: 'Ctrl+Shift+Tab', description: 'Switch to previous session', category: 'session' },
  { action: 'clearTerminal', keys: 'Ctrl+L', description: 'Clear terminal', category: 'terminal' },
  { action: 'copySelection', keys: 'Ctrl+Shift+C', description: 'Copy selected text', category: 'terminal' },
  { action: 'pasteClipboard', keys: 'Ctrl+Shift+V', description: 'Paste from clipboard', category: 'terminal' },
  { action: 'openSnippets', keys: 'Ctrl+Shift+S', description: 'Open snippet palette', category: 'tools' },
  { action: 'openPrompts', keys: 'Ctrl+Shift+L', description: 'Open prompt library', category: 'tools' },
  { action: 'toggleLeftSidebar', keys: 'Ctrl+B', description: 'Toggle left sidebar', category: 'view' },
  { action: 'toggleRightSidebar', keys: 'Ctrl+Shift+B', description: 'Toggle right sidebar', category: 'view' },
  { action: 'saveCheckpoint', keys: 'Ctrl+S', description: 'Save checkpoint', category: 'session' },
  { action: 'openCheckpoints', keys: 'Ctrl+Shift+K', description: 'Open checkpoints panel', category: 'session' },
];

export function createShortcutsRouter(prisma) {
  const router = Router();

  /**
   * GET /api/shortcuts
   * Get all keyboard shortcuts (defaults + custom overrides)
   */
  router.get('/', async (req, res) => {
    try {
      // Get custom shortcuts from database
      const customShortcuts = await prisma.keyboardShortcut.findMany({
        orderBy: { category: 'asc' }
      });

      // Create map of custom shortcuts for quick lookup
      const customMap = new Map(customShortcuts.map(s => [s.action, s]));

      // Merge defaults with custom overrides
      const shortcuts = DEFAULT_SHORTCUTS.map(defaultShortcut => {
        const custom = customMap.get(defaultShortcut.action);
        if (custom) {
          return {
            ...defaultShortcut,
            ...custom,
            isCustom: true
          };
        }
        return { ...defaultShortcut, isCustom: false, isEnabled: true };
      });

      // Add any custom shortcuts not in defaults
      customShortcuts.forEach(custom => {
        if (!DEFAULT_SHORTCUTS.find(d => d.action === custom.action)) {
          shortcuts.push({ ...custom, isCustom: true });
        }
      });

      res.json(shortcuts);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch shortcuts',
        operation: 'fetch shortcuts',
        requestId: req.id
      });
    }
  });

  /**
   * GET /api/shortcuts/defaults
   * Get only default shortcuts (for reset)
   */
  router.get('/defaults', (req, res) => {
    res.json(DEFAULT_SHORTCUTS);
  });

  /**
   * PUT /api/shortcuts/:action
   * Update a keyboard shortcut
   */
  router.put('/:action', async (req, res) => {
    try {
      const { action } = req.params;
      const { keys, description, isEnabled } = req.body;

      const shortcut = await prisma.keyboardShortcut.upsert({
        where: { action },
        update: {
          keys: keys || undefined,
          description: description || undefined,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          isCustom: true
        },
        create: {
          action,
          keys: keys || DEFAULT_SHORTCUTS.find(d => d.action === action)?.keys || '',
          description: description || DEFAULT_SHORTCUTS.find(d => d.action === action)?.description || '',
          category: DEFAULT_SHORTCUTS.find(d => d.action === action)?.category || 'custom',
          isCustom: true,
          isEnabled: isEnabled !== undefined ? isEnabled : true
        }
      });

      res.json(shortcut);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update shortcut',
        operation: 'update shortcut',
        requestId: req.id,
        context: { action: req.params.action }
      });
    }
  });

  /**
   * DELETE /api/shortcuts/:action
   * Reset a shortcut to default
   */
  router.delete('/:action', async (req, res) => {
    try {
      const { action } = req.params;

      await prisma.keyboardShortcut.deleteMany({
        where: { action }
      });

      // Return the default shortcut
      const defaultShortcut = DEFAULT_SHORTCUTS.find(d => d.action === action);
      if (defaultShortcut) {
        res.json({ ...defaultShortcut, isCustom: false, isEnabled: true });
      } else {
        res.json({ message: 'Shortcut removed' });
      }
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to reset shortcut',
        operation: 'reset shortcut',
        requestId: req.id,
        context: { action: req.params.action }
      });
    }
  });

  /**
   * POST /api/shortcuts/reset
   * Reset all shortcuts to defaults
   */
  router.post('/reset', async (req, res) => {
    try {
      await prisma.keyboardShortcut.deleteMany({});
      res.json(DEFAULT_SHORTCUTS.map(s => ({ ...s, isCustom: false, isEnabled: true })));
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to reset shortcuts',
        operation: 'reset all shortcuts',
        requestId: req.id
      });
    }
  });

  return router;
}

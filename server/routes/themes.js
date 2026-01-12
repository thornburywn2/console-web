/**
 * Theme Management API Routes
 * Manages custom and built-in themes
 */

import { Router } from 'express';

// Default built-in themes
const BUILT_IN_THEMES = [
  {
    name: 'dark',
    displayName: 'Dark (Default)',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      bgCard: 'rgba(30, 41, 59, 0.8)',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      accentPrimary: '#3b82f6',
      accentSecondary: '#8b5cf6',
      accentSuccess: '#10b981',
      accentWarning: '#f59e0b',
      accentDanger: '#ef4444',
      borderPrimary: 'rgba(148, 163, 184, 0.1)',
      borderAccent: 'rgba(59, 130, 246, 0.5)'
    }
  },
  {
    name: 'dracula',
    displayName: 'Dracula',
    colors: {
      bgPrimary: '#282a36',
      bgSecondary: '#44475a',
      bgTertiary: '#6272a4',
      bgCard: 'rgba(68, 71, 90, 0.8)',
      textPrimary: '#f8f8f2',
      textSecondary: '#bd93f9',
      textMuted: '#6272a4',
      accentPrimary: '#bd93f9',
      accentSecondary: '#ff79c6',
      accentSuccess: '#50fa7b',
      accentWarning: '#ffb86c',
      accentDanger: '#ff5555',
      borderPrimary: 'rgba(98, 114, 164, 0.3)',
      borderAccent: 'rgba(189, 147, 249, 0.5)'
    }
  },
  {
    name: 'monokai',
    displayName: 'Monokai',
    colors: {
      bgPrimary: '#272822',
      bgSecondary: '#3e3d32',
      bgTertiary: '#49483e',
      bgCard: 'rgba(62, 61, 50, 0.8)',
      textPrimary: '#f8f8f2',
      textSecondary: '#a6e22e',
      textMuted: '#75715e',
      accentPrimary: '#a6e22e',
      accentSecondary: '#f92672',
      accentSuccess: '#a6e22e',
      accentWarning: '#e6db74',
      accentDanger: '#f92672',
      borderPrimary: 'rgba(117, 113, 94, 0.3)',
      borderAccent: 'rgba(166, 226, 46, 0.5)'
    }
  },
  {
    name: 'nord',
    displayName: 'Nord',
    colors: {
      bgPrimary: '#2e3440',
      bgSecondary: '#3b4252',
      bgTertiary: '#434c5e',
      bgCard: 'rgba(59, 66, 82, 0.8)',
      textPrimary: '#eceff4',
      textSecondary: '#88c0d0',
      textMuted: '#4c566a',
      accentPrimary: '#88c0d0',
      accentSecondary: '#81a1c1',
      accentSuccess: '#a3be8c',
      accentWarning: '#ebcb8b',
      accentDanger: '#bf616a',
      borderPrimary: 'rgba(76, 86, 106, 0.3)',
      borderAccent: 'rgba(136, 192, 208, 0.5)'
    }
  },
  {
    name: 'solarized-dark',
    displayName: 'Solarized Dark',
    colors: {
      bgPrimary: '#002b36',
      bgSecondary: '#073642',
      bgTertiary: '#586e75',
      bgCard: 'rgba(7, 54, 66, 0.8)',
      textPrimary: '#839496',
      textSecondary: '#93a1a1',
      textMuted: '#657b83',
      accentPrimary: '#268bd2',
      accentSecondary: '#2aa198',
      accentSuccess: '#859900',
      accentWarning: '#b58900',
      accentDanger: '#dc322f',
      borderPrimary: 'rgba(101, 123, 131, 0.3)',
      borderAccent: 'rgba(38, 139, 210, 0.5)'
    }
  },
  {
    name: 'light',
    displayName: 'Light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#e2e8f0',
      bgCard: 'rgba(248, 250, 252, 0.9)',
      textPrimary: '#1e293b',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      accentPrimary: '#3b82f6',
      accentSecondary: '#8b5cf6',
      accentSuccess: '#10b981',
      accentWarning: '#f59e0b',
      accentDanger: '#ef4444',
      borderPrimary: 'rgba(226, 232, 240, 0.8)',
      borderAccent: 'rgba(59, 130, 246, 0.5)'
    }
  },
  {
    name: 'github-dark',
    displayName: 'GitHub Dark',
    colors: {
      bgPrimary: '#0d1117',
      bgSecondary: '#161b22',
      bgTertiary: '#21262d',
      bgCard: 'rgba(22, 27, 34, 0.8)',
      textPrimary: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#484f58',
      accentPrimary: '#58a6ff',
      accentSecondary: '#bc8cff',
      accentSuccess: '#3fb950',
      accentWarning: '#d29922',
      accentDanger: '#f85149',
      borderPrimary: 'rgba(48, 54, 61, 0.8)',
      borderAccent: 'rgba(88, 166, 255, 0.5)'
    }
  }
];

export function createThemesRouter(prisma) {
  const router = Router();

  /**
   * Initialize built-in themes in database
   */
  async function initializeBuiltInThemes() {
    try {
      for (const theme of BUILT_IN_THEMES) {
        await prisma.theme.upsert({
          where: { name: theme.name },
          update: {
            displayName: theme.displayName,
            colors: theme.colors,
            isBuiltIn: true
          },
          create: {
            name: theme.name,
            displayName: theme.displayName,
            colors: theme.colors,
            isBuiltIn: true,
            isActive: theme.name === 'dark' // Default theme
          }
        });
      }
    } catch (error) {
      console.error('Error initializing themes:', error);
    }
  }

  // Initialize themes on router creation
  initializeBuiltInThemes();

  /**
   * Get all themes
   */
  router.get('/', async (req, res) => {
    try {
      const themes = await prisma.theme.findMany({
        orderBy: [
          { isBuiltIn: 'desc' },
          { name: 'asc' }
        ]
      });
      res.json(themes);
    } catch (error) {
      console.error('Error fetching themes:', error);
      res.status(500).json({ error: 'Failed to fetch themes' });
    }
  });

  /**
   * Get active theme
   */
  router.get('/active', async (req, res) => {
    try {
      const theme = await prisma.theme.findFirst({
        where: { isActive: true }
      });
      res.json(theme || BUILT_IN_THEMES[0]);
    } catch (error) {
      console.error('Error fetching active theme:', error);
      res.status(500).json({ error: 'Failed to fetch active theme' });
    }
  });

  /**
   * Get a single theme by name
   */
  router.get('/:name', async (req, res) => {
    try {
      const { name } = req.params;

      const theme = await prisma.theme.findUnique({
        where: { name }
      });

      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      res.json(theme);
    } catch (error) {
      console.error('Error fetching theme:', error);
      res.status(500).json({ error: 'Failed to fetch theme' });
    }
  });

  /**
   * Create a custom theme
   */
  router.post('/', async (req, res) => {
    try {
      const { name, displayName, colors } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Theme name is required' });
      }

      if (!colors || typeof colors !== 'object') {
        return res.status(400).json({ error: 'Theme colors are required' });
      }

      const theme = await prisma.theme.create({
        data: {
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          displayName: displayName?.trim() || name.trim(),
          colors,
          isBuiltIn: false,
          isActive: false
        }
      });

      res.status(201).json(theme);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Theme name already exists' });
      }
      console.error('Error creating theme:', error);
      res.status(500).json({ error: 'Failed to create theme' });
    }
  });

  /**
   * Update a custom theme
   */
  router.put('/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const { displayName, colors } = req.body;

      // Check if theme exists and is not built-in
      const existing = await prisma.theme.findUnique({ where: { name } });
      if (!existing) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      if (existing.isBuiltIn) {
        return res.status(403).json({ error: 'Cannot modify built-in themes' });
      }

      const theme = await prisma.theme.update({
        where: { name },
        data: {
          ...(displayName !== undefined && { displayName: displayName.trim() }),
          ...(colors !== undefined && { colors })
        }
      });

      res.json(theme);
    } catch (error) {
      console.error('Error updating theme:', error);
      res.status(500).json({ error: 'Failed to update theme' });
    }
  });

  /**
   * Delete a custom theme
   */
  router.delete('/:name', async (req, res) => {
    try {
      const { name } = req.params;

      // Check if theme exists and is not built-in
      const existing = await prisma.theme.findUnique({ where: { name } });
      if (!existing) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      if (existing.isBuiltIn) {
        return res.status(403).json({ error: 'Cannot delete built-in themes' });
      }

      // If deleting active theme, switch to default
      if (existing.isActive) {
        await prisma.theme.update({
          where: { name: 'dark' },
          data: { isActive: true }
        });
      }

      await prisma.theme.delete({ where: { name } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting theme:', error);
      res.status(500).json({ error: 'Failed to delete theme' });
    }
  });

  /**
   * Set active theme
   */
  router.put('/:name/activate', async (req, res) => {
    try {
      const { name } = req.params;

      // Check if theme exists
      const theme = await prisma.theme.findUnique({ where: { name } });
      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      // Deactivate all themes
      await prisma.theme.updateMany({
        data: { isActive: false }
      });

      // Activate selected theme
      const updated = await prisma.theme.update({
        where: { name },
        data: { isActive: true }
      });

      res.json(updated);
    } catch (error) {
      console.error('Error activating theme:', error);
      res.status(500).json({ error: 'Failed to activate theme' });
    }
  });

  /**
   * Duplicate a theme for customization
   */
  router.post('/:name/duplicate', async (req, res) => {
    try {
      const { name } = req.params;
      const { newName } = req.body;

      const original = await prisma.theme.findUnique({ where: { name } });
      if (!original) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      const duplicateName = newName?.trim().toLowerCase().replace(/\s+/g, '-') ||
        `${original.name}-custom`;

      const duplicate = await prisma.theme.create({
        data: {
          name: duplicateName,
          displayName: `${original.displayName} (Custom)`,
          colors: original.colors,
          isBuiltIn: false,
          isActive: false
        }
      });

      res.status(201).json(duplicate);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Theme name already exists' });
      }
      console.error('Error duplicating theme:', error);
      res.status(500).json({ error: 'Failed to duplicate theme' });
    }
  });

  return router;
}

/**
 * Command Snippets API Routes
 * Manages reusable terminal commands with categories
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';

const log = createLogger('snippets');

export function createSnippetsRouter(prisma) {
  const router = Router();

  /**
   * Get all snippets with optional filtering
   */
  router.get('/', async (req, res) => {
    try {
      const { category, favorite, search, tag, limit = 100, offset = 0 } = req.query;

      const where = {};

      if (category) {
        where.category = category;
      }

      if (favorite === 'true') {
        where.isFavorite = true;
      }

      if (tag) {
        where.tags = { has: tag };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { command: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [snippets, total] = await Promise.all([
        prisma.commandSnippet.findMany({
          where,
          orderBy: [
            { isFavorite: 'desc' },
            { usageCount: 'desc' },
            { createdAt: 'desc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.commandSnippet.count({ where })
      ]);

      res.json({ snippets, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch snippets');
      res.status(500).json({ error: 'Failed to fetch snippets' });
    }
  });

  /**
   * Get snippet categories
   */
  router.get('/categories', async (req, res) => {
    try {
      const categories = await prisma.commandSnippet.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { category: { not: null } },
        orderBy: { _count: { id: 'desc' } }
      });

      res.json(categories.map(c => ({
        name: c.category,
        count: c._count.id
      })));
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch snippet categories');
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  /**
   * Get all unique tags
   */
  router.get('/tags', async (req, res) => {
    try {
      const snippets = await prisma.commandSnippet.findMany({
        select: { tags: true }
      });

      const tagCounts = {};
      snippets.forEach(s => {
        (s.tags || []).forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const tags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      res.json(tags);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch snippet tags');
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  /**
   * Get a single snippet by ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const snippet = await prisma.commandSnippet.findUnique({
        where: { id }
      });

      if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found' });
      }

      res.json(snippet);
    } catch (error) {
      log.error({ error: error.message, snippetId: req.params.id, requestId: req.id }, 'failed to fetch snippet');
      res.status(500).json({ error: 'Failed to fetch snippet' });
    }
  });

  /**
   * Create a new snippet
   */
  router.post('/', async (req, res) => {
    try {
      const { name, command, description, category, tags, isFavorite } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Snippet name is required' });
      }

      if (!command?.trim()) {
        return res.status(400).json({ error: 'Command is required' });
      }

      const snippet = await prisma.commandSnippet.create({
        data: {
          name: name.trim(),
          command: command.trim(),
          description: description?.trim() || null,
          category: category?.trim() || null,
          tags: tags || [],
          isFavorite: isFavorite || false
        }
      });

      res.status(201).json(snippet);
    } catch (error) {
      log.error({ error: error.message, name: req.body.name, requestId: req.id }, 'failed to create snippet');
      res.status(500).json({ error: 'Failed to create snippet' });
    }
  });

  /**
   * Update a snippet
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, command, description, category, tags, isFavorite } = req.body;

      const snippet = await prisma.commandSnippet.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(command !== undefined && { command: command.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(category !== undefined && { category: category?.trim() || null }),
          ...(tags !== undefined && { tags }),
          ...(isFavorite !== undefined && { isFavorite })
        }
      });

      res.json(snippet);
    } catch (error) {
      log.error({ error: error.message, snippetId: req.params.id, requestId: req.id }, 'failed to update snippet');
      res.status(500).json({ error: 'Failed to update snippet' });
    }
  });

  /**
   * Delete a snippet
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.commandSnippet.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, snippetId: req.params.id, requestId: req.id }, 'failed to delete snippet');
      res.status(500).json({ error: 'Failed to delete snippet' });
    }
  });

  /**
   * Run a snippet (track usage, return command for execution)
   */
  router.post('/:id/run', async (req, res) => {
    try {
      const { id } = req.params;

      const snippet = await prisma.commandSnippet.findUnique({
        where: { id }
      });

      if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found' });
      }

      // Update usage statistics
      await prisma.commandSnippet.update({
        where: { id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date()
        }
      });

      res.json({
        command: snippet.command,
        snippetId: id,
        snippetName: snippet.name
      });
    } catch (error) {
      log.error({ error: error.message, snippetId: req.params.id, requestId: req.id }, 'failed to run snippet');
      res.status(500).json({ error: 'Failed to run snippet' });
    }
  });

  /**
   * Toggle favorite status
   */
  router.put('/:id/favorite', async (req, res) => {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;

      const snippet = await prisma.commandSnippet.update({
        where: { id },
        data: { isFavorite: isFavorite ?? true }
      });

      res.json(snippet);
    } catch (error) {
      log.error({ error: error.message, snippetId: req.params.id, requestId: req.id }, 'failed to toggle snippet favorite');
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  /**
   * Duplicate a snippet
   */
  router.post('/:id/duplicate', async (req, res) => {
    try {
      const { id } = req.params;

      const original = await prisma.commandSnippet.findUnique({
        where: { id }
      });

      if (!original) {
        return res.status(404).json({ error: 'Snippet not found' });
      }

      const duplicate = await prisma.commandSnippet.create({
        data: {
          name: `${original.name} (Copy)`,
          command: original.command,
          description: original.description,
          category: original.category,
          tags: original.tags,
          isFavorite: false,
          usageCount: 0
        }
      });

      res.status(201).json(duplicate);
    } catch (error) {
      log.error({ error: error.message, snippetId: req.params.id, requestId: req.id }, 'failed to duplicate snippet');
      res.status(500).json({ error: 'Failed to duplicate snippet' });
    }
  });

  return router;
}

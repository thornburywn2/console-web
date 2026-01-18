/**
 * Command Snippets API Routes
 * Manages reusable terminal commands with categories
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import { snippetSchema, snippetUpdateSchema } from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';
import { buildOwnershipFilter, getOwnerIdForCreate } from '../middleware/rbac.js';
import { enforceQuota } from '../middleware/quotas.js';

const log = createLogger('snippets');

export function createSnippetsRouter(prisma) {
  const router = Router();

  /**
   * Get all snippets with optional filtering
   */
  router.get('/', async (req, res) => {
    try {
      const { category, favorite, search, tag, limit = 100, offset = 0 } = req.query;

      // RBAC: Build ownership filter (Phase 2)
      const ownershipFilter = buildOwnershipFilter(req, { includePublic: false });

      const where = {
        ...ownershipFilter, // Apply RBAC ownership filter
      };

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
        // Combine search OR with ownership filter
        where.AND = [
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { command: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch snippets', operation: 'fetch snippets', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch categories', operation: 'fetch snippet categories', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch tags', operation: 'fetch snippet tags', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch snippet', operation: 'fetch snippet', requestId: req.id });
    }
  });

  /**
   * Create a new snippet
   */
  router.post('/', enforceQuota(prisma, 'snippet'), validateBody(snippetSchema), async (req, res) => {
    try {
      const { title, command, description, category, tags, shortcut } = req.validatedBody;

      const snippet = await prisma.commandSnippet.create({
        data: {
          name: title,
          command,
          description: description || null,
          category: category || null,
          tags: tags || [],
          isFavorite: false,
          ownerId: getOwnerIdForCreate(req)
        }
      });

      res.status(201).json(snippet);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to create snippet', operation: 'create snippet', requestId: req.id });
    }
  });

  /**
   * Update a snippet
   */
  router.put('/:id', validateBody(snippetUpdateSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, command, description, category, tags, shortcut } = req.validatedBody;

      const snippet = await prisma.commandSnippet.update({
        where: { id },
        data: {
          ...(title !== undefined && { name: title }),
          ...(command !== undefined && { command }),
          ...(description !== undefined && { description: description || null }),
          ...(category !== undefined && { category: category || null }),
          ...(tags !== undefined && { tags })
        }
      });

      res.json(snippet);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to update snippet', operation: 'update snippet', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to delete snippet', operation: 'delete snippet', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to run snippet', operation: 'run snippet', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to toggle favorite', operation: 'toggle snippet favorite', requestId: req.id });
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
          usageCount: 0,
          ownerId: getOwnerIdForCreate(req)
        }
      });

      res.status(201).json(duplicate);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to duplicate snippet', operation: 'duplicate snippet', requestId: req.id });
    }
  });

  return router;
}

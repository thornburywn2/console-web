/**
 * Prompt Library API Routes
 * Manages reusable prompts with variables and categories
 */

import { Router } from 'express';

export function createPromptsRouter(prisma) {
  const router = Router();

  /**
   * Get all prompts with optional filtering
   */
  router.get('/', async (req, res) => {
    try {
      const { category, favorite, search, limit = 100, offset = 0 } = req.query;

      const where = {};

      if (category) {
        where.category = category;
      }

      if (favorite === 'true') {
        where.isFavorite = true;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [prompts, total] = await Promise.all([
        prisma.prompt.findMany({
          where,
          orderBy: [
            { isFavorite: 'desc' },
            { usageCount: 'desc' },
            { updatedAt: 'desc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.prompt.count({ where })
      ]);

      res.json({ prompts, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ error: 'Failed to fetch prompts' });
    }
  });

  /**
   * Get prompt categories
   */
  router.get('/categories', async (req, res) => {
    try {
      const categories = await prisma.prompt.groupBy({
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
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  /**
   * Get a single prompt by ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const prompt = await prisma.prompt.findUnique({
        where: { id }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      res.json(prompt);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).json({ error: 'Failed to fetch prompt' });
    }
  });

  /**
   * Create a new prompt
   */
  router.post('/', async (req, res) => {
    try {
      const { name, content, description, category, variables, isFavorite } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Prompt name is required' });
      }

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Prompt content is required' });
      }

      const prompt = await prisma.prompt.create({
        data: {
          name: name.trim(),
          content: content.trim(),
          description: description?.trim() || null,
          category: category?.trim() || null,
          variables: variables || null,
          isFavorite: isFavorite || false
        }
      });

      res.status(201).json(prompt);
    } catch (error) {
      console.error('Error creating prompt:', error);
      res.status(500).json({ error: 'Failed to create prompt' });
    }
  });

  /**
   * Update a prompt
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, content, description, category, variables, isFavorite } = req.body;

      const prompt = await prisma.prompt.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(content !== undefined && { content: content.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(category !== undefined && { category: category?.trim() || null }),
          ...(variables !== undefined && { variables }),
          ...(isFavorite !== undefined && { isFavorite })
        }
      });

      res.json(prompt);
    } catch (error) {
      console.error('Error updating prompt:', error);
      res.status(500).json({ error: 'Failed to update prompt' });
    }
  });

  /**
   * Delete a prompt
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.prompt.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      res.status(500).json({ error: 'Failed to delete prompt' });
    }
  });

  /**
   * Execute a prompt (interpolate variables and track usage)
   */
  router.post('/:id/execute', async (req, res) => {
    try {
      const { id } = req.params;
      const { variables = {} } = req.body;

      const prompt = await prisma.prompt.findUnique({
        where: { id }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Interpolate variables in the content
      let interpolatedContent = prompt.content;

      // Replace {{variable}} patterns
      interpolatedContent = interpolatedContent.replace(
        /\{\{(\w+)\}\}/g,
        (match, varName) => {
          if (variables[varName] !== undefined) {
            return variables[varName];
          }
          // Check for default in prompt variables
          const promptVar = prompt.variables?.find(v => v.name === varName);
          if (promptVar?.default) {
            return promptVar.default;
          }
          return match; // Keep original if no value
        }
      );

      // Update usage statistics
      await prisma.prompt.update({
        where: { id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date()
        }
      });

      res.json({
        original: prompt.content,
        interpolated: interpolatedContent,
        variables: variables,
        promptId: id,
        promptName: prompt.name
      });
    } catch (error) {
      console.error('Error executing prompt:', error);
      res.status(500).json({ error: 'Failed to execute prompt' });
    }
  });

  /**
   * Toggle favorite status
   */
  router.put('/:id/favorite', async (req, res) => {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;

      const prompt = await prisma.prompt.update({
        where: { id },
        data: { isFavorite: isFavorite ?? true }
      });

      res.json(prompt);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  /**
   * Duplicate a prompt
   */
  router.post('/:id/duplicate', async (req, res) => {
    try {
      const { id } = req.params;

      const original = await prisma.prompt.findUnique({
        where: { id }
      });

      if (!original) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      const duplicate = await prisma.prompt.create({
        data: {
          name: `${original.name} (Copy)`,
          content: original.content,
          description: original.description,
          category: original.category,
          variables: original.variables,
          isFavorite: false,
          usageCount: 0
        }
      });

      res.status(201).json(duplicate);
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      res.status(500).json({ error: 'Failed to duplicate prompt' });
    }
  });

  return router;
}

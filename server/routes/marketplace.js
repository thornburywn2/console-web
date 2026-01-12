/**
 * Agent Marketplace API Routes
 * Browse, search, and install AI agents from the catalog
 */

import { Router } from 'express';
import {
  AGENT_CATALOG,
  getAgentById,
  getAgentsByCategory,
  searchAgents,
  getCategoriesWithCounts,
  getAgentsByTrigger
} from '../data/agentCatalog.js';

export function createMarketplaceRouter(prisma) {
  const router = Router();

  /**
   * GET /api/marketplace/categories
   * List all agent categories with counts
   */
  router.get('/categories', async (req, res) => {
    try {
      const categories = getCategoriesWithCounts();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  /**
   * GET /api/marketplace/agents
   * List all catalog agents with optional filtering
   * Query params: category, trigger, search, installed
   */
  router.get('/agents', async (req, res) => {
    try {
      const { category, trigger, search, installed } = req.query;

      let agents = [...AGENT_CATALOG.agents];

      // Filter by category
      if (category) {
        agents = agents.filter(a => a.category === category);
      }

      // Filter by trigger type
      if (trigger) {
        agents = agents.filter(a => a.supportedTriggers.includes(trigger));
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        agents = agents.filter(a =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some(t => t.toLowerCase().includes(q))
        );
      }

      // Get installed agent catalog IDs
      const installedAgents = await prisma.agent.findMany({
        where: { catalogId: { not: null } },
        select: { catalogId: true }
      });
      const installedIds = new Set(installedAgents.map(a => a.catalogId));

      // Add installed status to each agent
      agents = agents.map(agent => ({
        ...agent,
        isInstalled: installedIds.has(agent.id)
      }));

      // Filter by installation status if requested
      if (installed === 'true') {
        agents = agents.filter(a => a.isInstalled);
      } else if (installed === 'false') {
        agents = agents.filter(a => !a.isInstalled);
      }

      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  /**
   * GET /api/marketplace/agents/:id
   * Get detailed info for a specific catalog agent
   */
  router.get('/agents/:id', async (req, res) => {
    try {
      const agent = getAgentById(req.params.id);

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found in catalog' });
      }

      // Check if installed
      const installed = await prisma.agent.findFirst({
        where: { catalogId: agent.id }
      });

      res.json({
        ...agent,
        isInstalled: !!installed,
        installedAgentId: installed?.id || null
      });
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  });

  /**
   * POST /api/marketplace/agents/:id/install
   * Install an agent from the catalog
   * Body: { projectId?, config: { field: value } }
   */
  router.post('/agents/:id/install', async (req, res) => {
    try {
      const catalogAgent = getAgentById(req.params.id);

      if (!catalogAgent) {
        return res.status(404).json({ error: 'Agent not found in catalog' });
      }

      // Check if already installed
      const existing = await prisma.agent.findFirst({
        where: { catalogId: catalogAgent.id }
      });

      if (existing) {
        return res.status(400).json({
          error: 'Agent already installed',
          agentId: existing.id
        });
      }

      const { projectId, config = {} } = req.body;

      // Build the command with config values
      let command = catalogAgent.command;
      for (const [key, value] of Object.entries(config)) {
        command = command.replace(`{{${key}}}`, value);
      }

      // Build trigger config from config fields
      const triggerConfig = {};
      for (const field of catalogAgent.configFields) {
        triggerConfig[field.name] = config[field.name] ?? field.default;
      }

      // Create the agent
      const agent = await prisma.agent.create({
        data: {
          name: catalogAgent.name,
          description: catalogAgent.description,
          triggerType: catalogAgent.defaultTrigger,
          triggerConfig,
          actions: [{
            type: catalogAgent.actionType,
            config: {
              command,
              originalCommand: catalogAgent.command
            }
          }],
          enabled: true,
          projectId: projectId || null,
          catalogId: catalogAgent.id,
          catalogMeta: {
            author: catalogAgent.author,
            version: catalogAgent.version,
            category: catalogAgent.category,
            tags: catalogAgent.tags,
            icon: catalogAgent.icon
          }
        }
      });

      res.json({
        success: true,
        agent,
        message: `${catalogAgent.name} installed successfully`
      });
    } catch (error) {
      console.error('Error installing agent:', error);
      res.status(500).json({ error: 'Failed to install agent' });
    }
  });

  /**
   * DELETE /api/marketplace/agents/:id/uninstall
   * Uninstall an agent that was installed from the catalog
   */
  router.delete('/agents/:id/uninstall', async (req, res) => {
    try {
      const catalogId = req.params.id;

      const agent = await prisma.agent.findFirst({
        where: { catalogId }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not installed' });
      }

      await prisma.agent.delete({
        where: { id: agent.id }
      });

      res.json({
        success: true,
        message: 'Agent uninstalled successfully'
      });
    } catch (error) {
      console.error('Error uninstalling agent:', error);
      res.status(500).json({ error: 'Failed to uninstall agent' });
    }
  });

  /**
   * GET /api/marketplace/installed
   * List all agents installed from the marketplace
   */
  router.get('/installed', async (req, res) => {
    try {
      const agents = await prisma.agent.findMany({
        where: { catalogId: { not: null } },
        include: {
          project: {
            select: { name: true, path: true }
          },
          executions: {
            take: 5,
            orderBy: { startedAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Enrich with catalog info
      const enriched = agents.map(agent => {
        const catalogInfo = getAgentById(agent.catalogId);
        return {
          ...agent,
          catalog: catalogInfo ? {
            name: catalogInfo.name,
            description: catalogInfo.description,
            version: catalogInfo.version,
            icon: catalogInfo.icon,
            category: catalogInfo.category,
            tags: catalogInfo.tags
          } : null
        };
      });

      res.json(enriched);
    } catch (error) {
      console.error('Error fetching installed agents:', error);
      res.status(500).json({ error: 'Failed to fetch installed agents' });
    }
  });

  /**
   * PUT /api/marketplace/agents/:id/update
   * Update an installed agent's configuration
   */
  router.put('/agents/:id/update', async (req, res) => {
    try {
      const catalogId = req.params.id;
      const { config = {}, enabled, triggerType } = req.body;

      const agent = await prisma.agent.findFirst({
        where: { catalogId }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not installed' });
      }

      const catalogAgent = getAgentById(catalogId);

      // Rebuild command with new config
      let command = catalogAgent?.command || '';
      for (const [key, value] of Object.entries(config)) {
        command = command.replace(`{{${key}}}`, value);
      }

      const updateData = {};

      if (Object.keys(config).length > 0) {
        updateData.triggerConfig = {
          ...agent.triggerConfig,
          ...config
        };
        updateData.actions = [{
          type: catalogAgent?.actionType || 'shell',
          config: {
            command,
            originalCommand: catalogAgent?.command
          }
        }];
      }

      if (enabled !== undefined) {
        updateData.enabled = enabled;
      }

      if (triggerType) {
        updateData.triggerType = triggerType;
      }

      const updated = await prisma.agent.update({
        where: { id: agent.id },
        data: updateData
      });

      res.json({
        success: true,
        agent: updated
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  /**
   * GET /api/marketplace/stats
   * Get marketplace statistics
   */
  router.get('/stats', async (req, res) => {
    try {
      const totalCatalog = AGENT_CATALOG.agents.length;
      const categories = AGENT_CATALOG.categories.length;

      const installedCount = await prisma.agent.count({
        where: { catalogId: { not: null } }
      });

      const executionCount = await prisma.agentExecution.count({
        where: {
          agent: { catalogId: { not: null } }
        }
      });

      // Get most popular categories
      const installedAgents = await prisma.agent.findMany({
        where: { catalogId: { not: null } },
        select: { catalogMeta: true }
      });

      const categoryCounts = {};
      for (const agent of installedAgents) {
        const category = agent.catalogMeta?.category;
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      }

      res.json({
        totalAgents: totalCatalog,
        totalCategories: categories,
        installedCount,
        executionCount,
        popularCategories: Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category, count]) => ({ category, count }))
      });
    } catch (error) {
      console.error('Error fetching marketplace stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  return router;
}

export default createMarketplaceRouter;

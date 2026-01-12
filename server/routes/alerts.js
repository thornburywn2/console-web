/**
 * Alert Rules API Routes
 * Manages system monitoring alerts and thresholds
 */

import { Router } from 'express';

export function createAlertsRouter(prisma) {
  const router = Router();

  /**
   * Get all alert rules
   */
  router.get('/', async (req, res) => {
    try {
      const { type, enabled } = req.query;

      const where = {};

      if (type) {
        where.type = type.toUpperCase();
      }

      if (enabled !== undefined) {
        where.enabled = enabled === 'true';
      }

      const rules = await prisma.alertRule.findMany({
        where,
        orderBy: [
          { enabled: 'desc' },
          { type: 'asc' },
          { name: 'asc' }
        ]
      });

      res.json(rules);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      res.status(500).json({ error: 'Failed to fetch alert rules' });
    }
  });

  /**
   * Get a single alert rule by ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const rule = await prisma.alertRule.findUnique({
        where: { id }
      });

      if (!rule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }

      res.json(rule);
    } catch (error) {
      console.error('Error fetching alert rule:', error);
      res.status(500).json({ error: 'Failed to fetch alert rule' });
    }
  });

  /**
   * Create a new alert rule
   */
  router.post('/', async (req, res) => {
    try {
      const {
        name,
        description,
        type,
        condition,
        threshold,
        duration,
        enabled,
        notifySound,
        notifyDesktop,
        cooldownMins
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Alert name is required' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Alert type is required' });
      }

      if (!condition) {
        return res.status(400).json({ error: 'Alert condition is required' });
      }

      if (threshold === undefined || threshold === null) {
        return res.status(400).json({ error: 'Alert threshold is required' });
      }

      const rule = await prisma.alertRule.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          type: type.toUpperCase(),
          condition: condition.toUpperCase(),
          threshold: parseFloat(threshold),
          duration: duration || null,
          enabled: enabled ?? true,
          notifySound: notifySound ?? true,
          notifyDesktop: notifyDesktop ?? true,
          cooldownMins: cooldownMins ?? 5
        }
      });

      res.status(201).json(rule);
    } catch (error) {
      console.error('Error creating alert rule:', error);
      res.status(500).json({ error: 'Failed to create alert rule' });
    }
  });

  /**
   * Update an alert rule
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        type,
        condition,
        threshold,
        duration,
        enabled,
        notifySound,
        notifyDesktop,
        cooldownMins
      } = req.body;

      const rule = await prisma.alertRule.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(type !== undefined && { type: type.toUpperCase() }),
          ...(condition !== undefined && { condition: condition.toUpperCase() }),
          ...(threshold !== undefined && { threshold: parseFloat(threshold) }),
          ...(duration !== undefined && { duration }),
          ...(enabled !== undefined && { enabled }),
          ...(notifySound !== undefined && { notifySound }),
          ...(notifyDesktop !== undefined && { notifyDesktop }),
          ...(cooldownMins !== undefined && { cooldownMins })
        }
      });

      res.json(rule);
    } catch (error) {
      console.error('Error updating alert rule:', error);
      res.status(500).json({ error: 'Failed to update alert rule' });
    }
  });

  /**
   * Delete an alert rule
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.alertRule.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      res.status(500).json({ error: 'Failed to delete alert rule' });
    }
  });

  /**
   * Toggle alert rule enabled status
   */
  router.put('/:id/toggle', async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const rule = await prisma.alertRule.update({
        where: { id },
        data: { enabled: enabled ?? true }
      });

      res.json(rule);
    } catch (error) {
      console.error('Error toggling alert rule:', error);
      res.status(500).json({ error: 'Failed to toggle alert rule' });
    }
  });

  /**
   * Test an alert rule (simulate trigger)
   */
  router.post('/:id/test', async (req, res) => {
    try {
      const { id } = req.params;

      const rule = await prisma.alertRule.findUnique({
        where: { id }
      });

      if (!rule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }

      // Return rule info for client-side notification test
      res.json({
        rule,
        testTriggered: true,
        message: `Alert "${rule.name}" test triggered`
      });
    } catch (error) {
      console.error('Error testing alert rule:', error);
      res.status(500).json({ error: 'Failed to test alert rule' });
    }
  });

  /**
   * Record alert trigger
   */
  router.post('/:id/trigger', async (req, res) => {
    try {
      const { id } = req.params;
      const { currentValue } = req.body;

      const rule = await prisma.alertRule.update({
        where: { id },
        data: {
          lastTriggered: new Date(),
          triggerCount: { increment: 1 }
        }
      });

      res.json({
        rule,
        triggered: true,
        currentValue
      });
    } catch (error) {
      console.error('Error recording alert trigger:', error);
      res.status(500).json({ error: 'Failed to record trigger' });
    }
  });

  /**
   * Get alert trigger history
   */
  router.get('/:id/history', async (req, res) => {
    try {
      const { id } = req.params;

      const rule = await prisma.alertRule.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          lastTriggered: true,
          triggerCount: true
        }
      });

      if (!rule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }

      res.json(rule);
    } catch (error) {
      console.error('Error fetching alert history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  /**
   * Reset alert trigger count
   */
  router.post('/:id/reset', async (req, res) => {
    try {
      const { id } = req.params;

      const rule = await prisma.alertRule.update({
        where: { id },
        data: {
          triggerCount: 0,
          lastTriggered: null
        }
      });

      res.json(rule);
    } catch (error) {
      console.error('Error resetting alert:', error);
      res.status(500).json({ error: 'Failed to reset alert' });
    }
  });

  /**
   * Get default alert rule templates
   */
  router.get('/templates/defaults', async (req, res) => {
    try {
      const templates = [
        {
          name: 'High CPU Usage',
          description: 'Alert when CPU usage exceeds 80%',
          type: 'CPU',
          condition: 'GT',
          threshold: 80,
          duration: 60,
          cooldownMins: 5
        },
        {
          name: 'High Memory Usage',
          description: 'Alert when memory usage exceeds 85%',
          type: 'MEMORY',
          condition: 'GT',
          threshold: 85,
          duration: 30,
          cooldownMins: 5
        },
        {
          name: 'Disk Space Low',
          description: 'Alert when disk usage exceeds 90%',
          type: 'DISK',
          condition: 'GT',
          threshold: 90,
          duration: 0,
          cooldownMins: 60
        },
        {
          name: 'Service Down',
          description: 'Alert when a monitored service goes down',
          type: 'SERVICE',
          condition: 'EQ',
          threshold: 0,
          duration: 10,
          cooldownMins: 2
        },
        {
          name: 'Container Stopped',
          description: 'Alert when a container stops running',
          type: 'CONTAINER',
          condition: 'EQ',
          threshold: 0,
          duration: 5,
          cooldownMins: 2
        }
      ];

      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  return router;
}

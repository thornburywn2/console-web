/**
 * Alert Rules API Routes
 * Manages system monitoring alerts and thresholds
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import { alertSchema, alertUpdateSchema } from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('alerts');

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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch alert rules', operation: 'fetch alert rules', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch alert rule', operation: 'fetch alert rule', requestId: req.id });
    }
  });

  /**
   * Create a new alert rule
   */
  router.post('/', validateBody(alertSchema), async (req, res) => {
    try {
      const {
        name,
        description,
        metric,
        condition,
        threshold,
        duration,
        enabled,
        cooldownMinutes
      } = req.validatedBody;

      const rule = await prisma.alertRule.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          type: metric.toUpperCase(),
          condition: condition.toUpperCase(),
          threshold,
          duration: duration || null,
          enabled: enabled ?? true,
          notifySound: true,
          notifyDesktop: true,
          cooldownMins: cooldownMinutes ?? 5
        }
      });

      res.status(201).json(rule);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to create alert rule', operation: 'create alert rule', requestId: req.id });
    }
  });

  /**
   * Update an alert rule
   */
  router.put('/:id', validateBody(alertUpdateSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        metric,
        condition,
        threshold,
        duration,
        enabled,
        cooldownMinutes
      } = req.validatedBody;

      const rule = await prisma.alertRule.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(metric !== undefined && { type: metric.toUpperCase() }),
          ...(condition !== undefined && { condition: condition.toUpperCase() }),
          ...(threshold !== undefined && { threshold }),
          ...(duration !== undefined && { duration }),
          ...(enabled !== undefined && { enabled }),
          ...(cooldownMinutes !== undefined && { cooldownMins: cooldownMinutes })
        }
      });

      res.json(rule);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to update alert rule', operation: 'update alert rule', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to delete alert rule', operation: 'delete alert rule', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to toggle alert rule', operation: 'toggle alert rule', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to test alert rule', operation: 'test alert rule', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to record trigger', operation: 'record alert trigger', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch history', operation: 'fetch alert history', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to reset alert', operation: 'reset alert', requestId: req.id });
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
      return sendSafeError(res, error, { userMessage: 'Failed to fetch templates', operation: 'fetch alert templates', requestId: req.id });
    }
  });

  return router;
}

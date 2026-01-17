/**
 * Embedded Browser API Routes
 * Browser sessions for agent UI inspection
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('browser');

export function createBrowserRouter(prisma) {
  const router = Router();

  // =============================================================================
  // BROWSER SESSION CRUD
  // =============================================================================

  /**
   * Get all browser sessions
   */
  router.get('/', async (req, res) => {
    try {
      const { projectId, sessionId, isActive, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (projectId) where.projectId = projectId;
      if (sessionId) where.sessionId = sessionId;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const [sessions, total] = await Promise.all([
        prisma.browserSession.findMany({
          where,
          include: {
            screenshots: {
              orderBy: { timestamp: 'desc' },
              take: 5 // Only include recent screenshots
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.browserSession.count({ where })
      ]);

      res.json({
        sessions,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch browser sessions',
        operation: 'fetch browser sessions',
        requestId: req.id,
      });
    }
  });

  /**
   * Get a single browser session
   */
  router.get('/:id', async (req, res) => {
    try {
      const session = await prisma.browserSession.findUnique({
        where: { id: req.params.id },
        include: {
          screenshots: {
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Browser session not found' });
      }

      res.json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch browser session',
        operation: 'fetch browser session',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * Create a new browser session
   */
  router.post('/', async (req, res) => {
    try {
      const { projectId, sessionId, url, title, viewport } = req.body;

      if (!url?.trim()) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const session = await prisma.browserSession.create({
        data: {
          projectId,
          sessionId,
          url: url.trim(),
          title,
          viewport: viewport || { width: 1280, height: 720 },
          isActive: true
        }
      });

      res.status(201).json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create browser session',
        operation: 'create browser session',
        requestId: req.id,
      });
    }
  });

  /**
   * Update a browser session
   */
  router.put('/:id', async (req, res) => {
    try {
      const { url, title, viewport, isActive, consoleLogs, networkLogs } = req.body;

      const existing = await prisma.browserSession.findUnique({
        where: { id: req.params.id }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Browser session not found' });
      }

      const updateData = {};
      if (url !== undefined) updateData.url = url.trim();
      if (title !== undefined) updateData.title = title;
      if (viewport !== undefined) updateData.viewport = viewport;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (consoleLogs !== undefined) updateData.consoleLogs = consoleLogs;
      if (networkLogs !== undefined) updateData.networkLogs = networkLogs;

      const session = await prisma.browserSession.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          screenshots: {
            orderBy: { timestamp: 'desc' },
            take: 10
          }
        }
      });

      res.json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update browser session',
        operation: 'update browser session',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * Navigate to a URL
   */
  router.post('/:id/navigate', async (req, res) => {
    try {
      const { url } = req.body;

      if (!url?.trim()) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const session = await prisma.browserSession.update({
        where: { id: req.params.id },
        data: {
          url: url.trim(),
          title: null // Will be updated when page loads
        }
      });

      res.json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to navigate',
        operation: 'navigate browser',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * Close a browser session
   */
  router.post('/:id/close', async (req, res) => {
    try {
      const session = await prisma.browserSession.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });

      res.json(session);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to close browser session',
        operation: 'close browser session',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * Delete a browser session
   */
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.browserSession.delete({
        where: { id: req.params.id }
      });

      res.json({ success: true, id: req.params.id });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete browser session',
        operation: 'delete browser session',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  // =============================================================================
  // SCREENSHOTS
  // =============================================================================

  /**
   * Add a screenshot
   */
  router.post('/:id/screenshots', async (req, res) => {
    try {
      const { url, dataUrl, thumbnail, annotation } = req.body;

      if (!dataUrl) {
        return res.status(400).json({ error: 'dataUrl is required' });
      }

      const session = await prisma.browserSession.findUnique({
        where: { id: req.params.id }
      });

      if (!session) {
        return res.status(404).json({ error: 'Browser session not found' });
      }

      const screenshot = await prisma.browserScreenshot.create({
        data: {
          browserSessionId: req.params.id,
          url: url || session.url,
          dataUrl,
          thumbnail,
          annotation
        }
      });

      res.status(201).json(screenshot);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to add screenshot',
        operation: 'add screenshot',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * Get screenshots for a session
   */
  router.get('/:id/screenshots', async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const [screenshots, total] = await Promise.all([
        prisma.browserScreenshot.findMany({
          where: { browserSessionId: req.params.id },
          orderBy: { timestamp: 'desc' },
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.browserScreenshot.count({
          where: { browserSessionId: req.params.id }
        })
      ]);

      res.json({
        screenshots,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch screenshots',
        operation: 'fetch screenshots',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * Delete a screenshot
   */
  router.delete('/:sessionId/screenshots/:screenshotId', async (req, res) => {
    try {
      await prisma.browserScreenshot.delete({
        where: { id: req.params.screenshotId }
      });

      res.json({ success: true, id: req.params.screenshotId });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete screenshot',
        operation: 'delete screenshot',
        requestId: req.id,
        context: { screenshotId: req.params.screenshotId },
      });
    }
  });

  // =============================================================================
  // CONSOLE & NETWORK LOGS
  // =============================================================================

  /**
   * Append console logs
   */
  router.post('/:id/console', async (req, res) => {
    try {
      const { logs } = req.body;

      if (!Array.isArray(logs)) {
        return res.status(400).json({ error: 'logs array is required' });
      }

      const session = await prisma.browserSession.findUnique({
        where: { id: req.params.id }
      });

      if (!session) {
        return res.status(404).json({ error: 'Browser session not found' });
      }

      // Append new logs, keeping max 1000
      const updatedLogs = [...(session.consoleLogs || []), ...logs].slice(-1000);

      await prisma.browserSession.update({
        where: { id: req.params.id },
        data: { consoleLogs: updatedLogs }
      });

      res.json({ success: true, count: updatedLogs.length });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to append console logs',
        operation: 'append console logs',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  /**
   * Append network logs
   */
  router.post('/:id/network', async (req, res) => {
    try {
      const { logs } = req.body;

      if (!Array.isArray(logs)) {
        return res.status(400).json({ error: 'logs array is required' });
      }

      const session = await prisma.browserSession.findUnique({
        where: { id: req.params.id }
      });

      if (!session) {
        return res.status(404).json({ error: 'Browser session not found' });
      }

      // Append new logs, keeping max 500
      const updatedLogs = [...(session.networkLogs || []), ...logs].slice(-500);

      await prisma.browserSession.update({
        where: { id: req.params.id },
        data: { networkLogs: updatedLogs }
      });

      res.json({ success: true, count: updatedLogs.length });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to append network logs',
        operation: 'append network logs',
        requestId: req.id,
        context: { sessionId: req.params.id },
      });
    }
  });

  // =============================================================================
  // CLEANUP
  // =============================================================================

  /**
   * Cleanup old browser sessions
   */
  router.post('/cleanup', async (req, res) => {
    try {
      const { days = 7 } = req.body;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      // Delete inactive sessions older than cutoff
      const result = await prisma.browserSession.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: cutoff }
        }
      });

      res.json({ success: true, deleted: result.count });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to cleanup',
        operation: 'cleanup browser sessions',
        requestId: req.id,
      });
    }
  });

  return router;
}

export default createBrowserRouter;

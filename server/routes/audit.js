/**
 * Audit Log API Routes
 * Enterprise Mission Control - Phase 4
 * Admin-only access to security audit trail
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';
import { requireAdmin } from '../middleware/rbac.js';

const log = createLogger('audit');

export function createAuditRouter(prisma) {
  const router = Router();

  // All audit routes require admin role
  router.use(requireAdmin);

  /**
   * Get audit logs with filtering and pagination
   * GET /api/audit-logs
   * Query params:
   *   - userId: Filter by user
   *   - action: Filter by action (CREATE, READ, UPDATE, DELETE, EXECUTE)
   *   - resource: Filter by resource type
   *   - resourceId: Filter by specific resource
   *   - startDate: Filter from date
   *   - endDate: Filter to date
   *   - search: Search in metadata
   *   - limit: Results per page (default 50, max 200)
   *   - offset: Pagination offset
   *   - sort: Sort field (timestamp, action, resource)
   *   - order: Sort order (asc, desc)
   */
  router.get('/', async (req, res) => {
    try {
      const {
        userId,
        action,
        resource,
        resourceId,
        startDate,
        endDate,
        search,
        limit = 50,
        offset = 0,
        sort = 'timestamp',
        order = 'desc',
      } = req.query;

      // Build where clause
      const where = {};

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = action.toUpperCase();
      }

      if (resource) {
        where.resource = resource.toLowerCase();
      }

      if (resourceId) {
        where.resourceId = resourceId;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.gte = new Date(startDate);
        }
        if (endDate) {
          where.timestamp.lte = new Date(endDate);
        }
      }

      if (search) {
        where.OR = [
          { userId: { contains: search, mode: 'insensitive' } },
          { resource: { contains: search, mode: 'insensitive' } },
          { ipAddress: { contains: search } },
        ];
      }

      // Validate and cap limit
      const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 50), 200);
      const parsedOffset = Math.max(0, parseInt(offset) || 0);

      // Validate sort field
      const validSortFields = ['timestamp', 'action', 'resource', 'userId'];
      const sortField = validSortFields.includes(sort) ? sort : 'timestamp';
      const sortOrder = order === 'asc' ? 'asc' : 'desc';

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { [sortField]: sortOrder },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        logs,
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + logs.length < total,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch audit logs',
        operation: 'fetch audit logs',
        requestId: req.id,
      });
    }
  });

  /**
   * Get audit log statistics
   * GET /api/audit-logs/stats
   */
  router.get('/stats', async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const [
        totalLogs,
        actionCounts,
        resourceCounts,
        recentActivity,
        uniqueUsers,
      ] = await Promise.all([
        // Total logs in period
        prisma.auditLog.count({
          where: { timestamp: { gte: startDate } },
        }),

        // Group by action
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: { action: true },
          where: { timestamp: { gte: startDate } },
        }),

        // Group by resource
        prisma.auditLog.groupBy({
          by: ['resource'],
          _count: { resource: true },
          where: { timestamp: { gte: startDate } },
          orderBy: { _count: { resource: 'desc' } },
          take: 10,
        }),

        // Activity by day
        prisma.$queryRaw`
          SELECT
            DATE(timestamp) as date,
            COUNT(*)::int as count
          FROM "AuditLog"
          WHERE timestamp >= ${startDate}
          GROUP BY DATE(timestamp)
          ORDER BY date DESC
        `,

        // Unique users
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: { timestamp: { gte: startDate } },
        }),
      ]);

      res.json({
        period: { days: parseInt(days), startDate },
        totalLogs,
        uniqueUsers: uniqueUsers.length,
        byAction: actionCounts.reduce((acc, item) => {
          acc[item.action] = item._count.action;
          return acc;
        }, {}),
        byResource: resourceCounts.map((item) => ({
          resource: item.resource,
          count: item._count.resource,
        })),
        dailyActivity: recentActivity,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch audit statistics',
        operation: 'fetch audit stats',
        requestId: req.id,
      });
    }
  });

  /**
   * Get a single audit log entry
   * GET /api/audit-logs/:id
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const logEntry = await prisma.auditLog.findUnique({
        where: { id },
      });

      if (!logEntry) {
        return res.status(404).json({ error: 'Audit log entry not found' });
      }

      res.json(logEntry);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch audit log entry',
        operation: 'fetch audit log',
        requestId: req.id,
        context: { logId: req.params.id },
      });
    }
  });

  /**
   * Get audit logs for a specific user
   * GET /api/audit-logs/user/:userId
   */
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 50), 200);
      const parsedOffset = Math.max(0, parseInt(offset) || 0);

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.auditLog.count({ where: { userId } }),
      ]);

      res.json({
        logs,
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + logs.length < total,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch user audit logs',
        operation: 'fetch user audit logs',
        requestId: req.id,
        context: { userId: req.params.userId },
      });
    }
  });

  /**
   * Get audit logs for a specific resource
   * GET /api/audit-logs/resource/:resource/:resourceId
   */
  router.get('/resource/:resource/:resourceId', async (req, res) => {
    try {
      const { resource, resourceId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 50), 200);
      const parsedOffset = Math.max(0, parseInt(offset) || 0);

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { resource, resourceId },
          orderBy: { timestamp: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.auditLog.count({ where: { resource, resourceId } }),
      ]);

      res.json({
        logs,
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + logs.length < total,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch resource audit logs',
        operation: 'fetch resource audit logs',
        requestId: req.id,
        context: { resource: req.params.resource, resourceId: req.params.resourceId },
      });
    }
  });

  /**
   * Export audit logs as CSV
   * GET /api/audit-logs/export
   */
  router.get('/export/csv', async (req, res) => {
    try {
      const { startDate, endDate, action, resource } = req.query;

      const where = {};

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      if (action) where.action = action.toUpperCase();
      if (resource) where.resource = resource.toLowerCase();

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 10000, // Cap export at 10k records
      });

      // Build CSV
      const headers = ['ID', 'Timestamp', 'User ID', 'Action', 'Resource', 'Resource ID', 'IP Address', 'User Agent', 'Metadata'];
      const rows = logs.map((log) => [
        log.id,
        log.timestamp.toISOString(),
        log.userId,
        log.action,
        log.resource,
        log.resourceId || '',
        log.ipAddress || '',
        log.userAgent || '',
        log.metadata ? JSON.stringify(log.metadata) : '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => {
            // Escape quotes and wrap in quotes if contains comma
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',')
        ),
      ].join('\n');

      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to export audit logs',
        operation: 'export audit logs',
        requestId: req.id,
      });
    }
  });

  /**
   * Purge old audit logs (SUPER_ADMIN only)
   * DELETE /api/audit-logs/purge
   */
  router.delete('/purge', async (req, res) => {
    try {
      // Check for SUPER_ADMIN role
      const userRole = req.dbUser?.role || 'VIEWER';
      if (userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only super admins can purge audit logs' });
      }

      const { olderThanDays = 90 } = req.query;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));

      const result = await prisma.auditLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } },
      });

      // Log the purge action itself
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id || 'system',
          action: 'DELETE',
          resource: 'audit_log',
          metadata: {
            operation: 'purge',
            olderThanDays: parseInt(olderThanDays),
            deletedCount: result.count,
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      res.json({
        success: true,
        deletedCount: result.count,
        cutoffDate,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to purge audit logs',
        operation: 'purge audit logs',
        requestId: req.id,
      });
    }
  });

  return router;
}

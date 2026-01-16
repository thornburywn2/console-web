/**
 * Monitoring Routes
 * Handles metrics, uptime, network, and cost tracking
 */

import { Router } from 'express';
import os from 'os';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { createLogger } from '../services/logger.js';

const log = createLogger('monitoring');

// Store previous CPU stats for delta-based calculation
let prevCpuStatsMonitoring = null;

// ============================================
// Metrics Router - Resource metrics API
// ============================================
export function createMetricsRouter(prisma) {
  const router = Router();

  // Get metrics for a specific type
  router.get('/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const { minutes = 60 } = req.query;

      const since = new Date(Date.now() - parseInt(minutes) * 60 * 1000);

      const metrics = await prisma.resourceMetric.findMany({
        where: {
          type: type.toUpperCase(),
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'asc' },
        select: {
          value: true,
          timestamp: true,
        },
      });

      res.json({
        data: metrics.map(m => ({
          value: m.value,
          timestamp: m.timestamp.toISOString(),
        })),
      });
    } catch (error) {
      log.error({ error: error.message, type: req.params.type, requestId: req.id }, 'failed to fetch metrics');
      res.json({ data: [] });
    }
  });

  // Get current system metrics
  router.get('/', async (req, res) => {
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const loadAvg = os.loadavg();

      // CPU usage using delta calculation from /proc/stat
      let cpuPercent = 0;
      try {
        // Read CPU stats from /proc/stat
        const stat = readFileSync('/proc/stat', 'utf-8');
        const cpuLine = stat.split('\n')[0]; // "cpu  user nice system idle iowait irq softirq"
        const parts = cpuLine.split(/\s+/).slice(1).map(Number);
        const idle = parts[3] + (parts[4] || 0); // idle + iowait
        const total = parts.reduce((a, b) => a + b, 0);

        // Calculate CPU usage from delta between readings
        if (prevCpuStatsMonitoring) {
          const deltaIdle = idle - prevCpuStatsMonitoring.idle;
          const deltaTotal = total - prevCpuStatsMonitoring.total;
          if (deltaTotal > 0) {
            const deltaBusy = deltaTotal - deltaIdle;
            cpuPercent = (deltaBusy / deltaTotal) * 100;
          }
        } else {
          // First reading - use load average as approximation
          cpuPercent = Math.min(100, (loadAvg[0] / cpus.length) * 100);
        }

        // Store current stats for next delta calculation
        prevCpuStatsMonitoring = { idle, total };

        // Clamp to valid range
        cpuPercent = Math.max(0, Math.min(100, cpuPercent));

        // If that gives unrealistic values, fall back to load average
        if (isNaN(cpuPercent)) {
          cpuPercent = Math.min(100, (loadAvg[0] / cpus.length) * 100);
        }
      } catch {
        // Fall back to load average
        cpuPercent = Math.min(100, (loadAvg[0] / cpus.length) * 100);
      }

      // Memory usage
      const memoryPercent = ((totalMem - freeMem) / totalMem) * 100;

      // Disk usage
      let diskPercent = 0;
      try {
        const df = execSync('df -h / | tail -1').toString();
        const parts = df.split(/\s+/);
        diskPercent = parseFloat(parts[4]?.replace('%', '') || '0');
      } catch (e) {
        // Ignore disk errors
      }

      res.json({
        cpu: cpuPercent,
        memory: memoryPercent,
        disk: diskPercent,
        uptime: os.uptime(),
        loadAverage: loadAvg,
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get system metrics');
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  return router;
}

// ============================================
// Uptime Router - Service uptime tracking
// ============================================
export function createUptimeRouter(prisma) {
  const router = Router();

  // Get all service uptime data
  router.get('/', async (req, res) => {
    try {
      // Get services from database or return defaults
      const services = await prisma.uptimeService.findMany({
        include: {
          checks: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
        },
      });

      // Calculate uptime percentages
      const result = services.map(service => {
        const checks = service.checks || [];
        const successCount = checks.filter(c => c.status === 'up').length;
        const uptime = checks.length > 0 ? (successCount / checks.length) * 100 : 100;

        // Group checks by day for history
        const history = [];
        const byDay = {};
        checks.forEach(check => {
          const date = check.timestamp.toISOString().split('T')[0];
          if (!byDay[date]) byDay[date] = { up: 0, total: 0 };
          byDay[date].total++;
          if (check.status === 'up') byDay[date].up++;
        });

        Object.entries(byDay).forEach(([date, data]) => {
          history.push({
            date,
            uptime: (data.up / data.total) * 100,
            status: data.up === data.total ? 'up' : 'degraded',
          });
        });

        return {
          id: service.id,
          name: service.name,
          url: service.url,
          endpoint: service.endpoint,
          status: service.lastStatus || 'unknown',
          uptime,
          responseTime: service.lastResponseTime,
          avgResponseTime: service.avgResponseTime,
          totalChecks: checks.length,
          failures: checks.filter(c => c.status !== 'up').length,
          lastCheck: service.lastCheck,
          history,
        };
      });

      res.json({ services: result });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch uptime data');
      // Return empty for graceful degradation
      res.json({ services: [] });
    }
  });

  // Check a specific service now
  router.post('/:id/check', async (req, res) => {
    try {
      const { id } = req.params;

      const service = await prisma.uptimeService.findUnique({
        where: { id },
      });

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      // Perform health check
      const startTime = Date.now();
      let status = 'down';
      let responseTime = 0;

      try {
        const url = service.url || `http://${service.endpoint}`;
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        responseTime = Date.now() - startTime;
        status = response.ok ? 'up' : 'degraded';
      } catch (e) {
        responseTime = Date.now() - startTime;
        status = 'down';
      }

      // Record check
      await prisma.uptimeCheck.create({
        data: {
          serviceId: id,
          status,
          responseTime,
        },
      });

      // Update service
      await prisma.uptimeService.update({
        where: { id },
        data: {
          lastStatus: status,
          lastResponseTime: responseTime,
          lastCheck: new Date(),
        },
      });

      res.json({ status, responseTime });
    } catch (error) {
      log.error({ error: error.message, serviceId: req.params.id, requestId: req.id }, 'failed to check service');
      res.status(500).json({ error: 'Failed to check service' });
    }
  });

  // Add a new service to monitor
  router.post('/', async (req, res) => {
    try {
      const { name, url, endpoint, checkInterval } = req.body;

      if (!name || (!url && !endpoint)) {
        return res.status(400).json({ error: 'Name and URL or endpoint required' });
      }

      const service = await prisma.uptimeService.create({
        data: {
          name,
          url,
          endpoint,
          checkInterval: checkInterval || 60,
        },
      });

      res.json({ service });
    } catch (error) {
      log.error({ error: error.message, serviceName: req.body.name, requestId: req.id }, 'failed to add service');
      res.status(500).json({ error: 'Failed to add service' });
    }
  });

  // Remove a service
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.uptimeService.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, serviceId: req.params.id, requestId: req.id }, 'failed to remove service');
      res.status(500).json({ error: 'Failed to remove service' });
    }
  });

  return router;
}

// ============================================
// Network Router - Network statistics
// ============================================
export function createNetworkRouter(prisma) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const interfaces = [];
      const netInterfaces = os.networkInterfaces();

      for (const [name, addrs] of Object.entries(netInterfaces)) {
        if (!addrs) continue;

        const ipv4 = addrs.find(a => a.family === 'IPv4' && !a.internal);

        // Try to get interface stats from /sys
        let rxBytes = 0, txBytes = 0, rxPackets = 0, txPackets = 0;
        let rxErrors = 0, txErrors = 0;

        try {
          rxBytes = parseInt(execSync(`cat /sys/class/net/${name}/statistics/rx_bytes 2>/dev/null`).toString().trim()) || 0;
          txBytes = parseInt(execSync(`cat /sys/class/net/${name}/statistics/tx_bytes 2>/dev/null`).toString().trim()) || 0;
          rxPackets = parseInt(execSync(`cat /sys/class/net/${name}/statistics/rx_packets 2>/dev/null`).toString().trim()) || 0;
          txPackets = parseInt(execSync(`cat /sys/class/net/${name}/statistics/tx_packets 2>/dev/null`).toString().trim()) || 0;
          rxErrors = parseInt(execSync(`cat /sys/class/net/${name}/statistics/rx_errors 2>/dev/null`).toString().trim()) || 0;
          txErrors = parseInt(execSync(`cat /sys/class/net/${name}/statistics/tx_errors 2>/dev/null`).toString().trim()) || 0;
        } catch (e) {
          // Ignore
        }

        interfaces.push({
          name,
          address: ipv4?.address || null,
          mac: ipv4?.mac || addrs[0]?.mac || null,
          isUp: rxBytes > 0 || txBytes > 0,
          rxBytes,
          txBytes,
          rxPackets,
          txPackets,
          rxErrors,
          txErrors,
          rxRate: 0, // Would need history to calculate
          txRate: 0,
          mtu: 1500,
        });
      }

      res.json({ interfaces });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get network stats');
      res.status(500).json({ error: 'Failed to get network stats' });
    }
  });

  return router;
}

// ============================================
// Cost Router - API cost tracking
// ============================================
export function createCostRouter(prisma) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const { range = '7d' } = req.query;

      // Calculate date range
      let days = 7;
      if (range === '24h') days = 1;
      else if (range === '30d') days = 30;
      else if (range === '90d') days = 90;

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get usage data
      const usage = await prisma.aPIUsage.findMany({
        where: {
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Calculate totals
      let totalCost = 0;
      let totalTokens = 0;
      const byProvider = {};
      const byModel = {};
      const dailyCosts = {};

      usage.forEach(u => {
        const cost = u.cost || 0;
        totalCost += cost;
        totalTokens += (u.inputTokens || 0) + (u.outputTokens || 0);

        // By provider
        if (!byProvider[u.provider]) {
          byProvider[u.provider] = { cost: 0, requests: 0 };
        }
        byProvider[u.provider].cost += cost;
        byProvider[u.provider].requests++;

        // By model
        if (!byModel[u.model]) {
          byModel[u.model] = { inputTokens: 0, outputTokens: 0, cost: 0 };
        }
        byModel[u.model].inputTokens += u.inputTokens || 0;
        byModel[u.model].outputTokens += u.outputTokens || 0;
        byModel[u.model].cost += cost;

        // Daily
        const date = u.timestamp.toISOString().split('T')[0];
        if (!dailyCosts[date]) dailyCosts[date] = 0;
        dailyCosts[date] += cost;
      });

      // Convert byModel to array
      const modelArray = Object.entries(byModel).map(([name, data]) => ({
        name,
        ...data,
      })).sort((a, b) => b.cost - a.cost);

      // Convert daily costs to array
      const dailyArray = Object.values(dailyCosts);

      // Calculate projected monthly
      const avgDaily = totalCost / days;
      const projectedMonthly = avgDaily * 30;

      res.json({
        totalCost,
        totalTokens,
        totalRequests: usage.length,
        costChange: 0, // Would need previous period to calculate
        byProvider,
        byModel: modelArray,
        dailyCosts: dailyArray,
        projectedMonthly,
      });
    } catch (error) {
      log.error({ error: error.message, range: req.query.range, requestId: req.id }, 'failed to get cost data');
      res.json({
        totalCost: 0,
        totalTokens: 0,
        totalRequests: 0,
        byProvider: {},
        byModel: [],
        dailyCosts: [],
        projectedMonthly: 0,
      });
    }
  });

  // Log API usage
  router.post('/', async (req, res) => {
    try {
      const { sessionId, projectId, model, provider, inputTokens, outputTokens, cost, duration } = req.body;

      const usage = await prisma.aPIUsage.create({
        data: {
          sessionId,
          projectId,
          model: model || 'unknown',
          provider: provider || 'anthropic',
          inputTokens: inputTokens || 0,
          outputTokens: outputTokens || 0,
          cost,
          duration,
        },
      });

      res.json({ usage });
    } catch (error) {
      log.error({ error: error.message, model: req.body.model, requestId: req.id }, 'failed to log API usage');
      res.status(500).json({ error: 'Failed to log usage' });
    }
  });

  return router;
}

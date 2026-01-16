/**
 * Metrics Collection Service
 * Collects and stores system metrics for historical tracking
 */

import os from 'os';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { createLogger } from './logger.js';

const log = createLogger('metrics');

export class MetricsCollector {
  constructor(prisma, options = {}) {
    this.prisma = prisma;
    this.intervalMs = options.intervalMs || 60000; // Default 1 minute
    this.retentionDays = options.retentionDays || 7;
    this.timer = null;
    this.isRunning = false;
    this.prevCpuStats = null; // Store previous CPU stats for delta calculation
  }

  /**
   * Start collecting metrics
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.collectAndStore();

    this.timer = setInterval(() => {
      this.collectAndStore();
    }, this.intervalMs);

    log.info({ intervalMs: this.intervalMs }, 'metrics collector started');
  }

  /**
   * Stop collecting metrics
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    log.info('metrics collector stopped');
  }

  /**
   * Collect current system metrics
   */
  collectMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();

    // CPU usage using delta calculation from /proc/stat
    let cpuUsage = 0;
    try {
      // Read CPU stats from /proc/stat
      const stat = readFileSync('/proc/stat', 'utf-8');
      const cpuLine = stat.split('\n')[0]; // "cpu  user nice system idle iowait irq softirq"
      const parts = cpuLine.split(/\s+/).slice(1).map(Number);
      const idle = parts[3] + (parts[4] || 0); // idle + iowait
      const total = parts.reduce((a, b) => a + b, 0);

      // Calculate CPU usage from delta between readings
      if (this.prevCpuStats) {
        const deltaIdle = idle - this.prevCpuStats.idle;
        const deltaTotal = total - this.prevCpuStats.total;
        if (deltaTotal > 0) {
          const deltaBusy = deltaTotal - deltaIdle;
          cpuUsage = (deltaBusy / deltaTotal) * 100;
        }
      } else {
        // First reading - use load average as approximation
        cpuUsage = Math.min(100, (loadAvg[0] / cpus.length) * 100);
      }

      // Store current stats for next delta calculation
      this.prevCpuStats = { idle, total };

      // Clamp to valid range
      cpuUsage = Math.max(0, Math.min(100, cpuUsage));

      // If that gives unrealistic values, fall back to load average
      if (isNaN(cpuUsage)) {
        cpuUsage = Math.min(100, (loadAvg[0] / cpus.length) * 100);
      }
    } catch {
      // Fall back to load average
      cpuUsage = Math.min(100, (loadAvg[0] / cpus.length) * 100);
    }

    // Memory percentage
    const memoryUsage = (usedMem / totalMem) * 100;

    // Disk usage
    let diskUsage = null;
    try {
      const dfOutput = execSync('df -B1 / | tail -1', { encoding: 'utf-8' });
      const parts = dfOutput.trim().split(/\s+/);
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      diskUsage = (used / total) * 100;
    } catch {
      // Ignore disk errors
    }

    // Network stats (if available)
    let networkIn = 0;
    let networkOut = 0;
    try {
      const interfaces = os.networkInterfaces();
      // Just return bytes from first non-internal interface
      for (const [name, addrs] of Object.entries(interfaces)) {
        if (name !== 'lo' && addrs && addrs.length > 0) {
          break;
        }
      }
    } catch {
      // Ignore network errors
    }

    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskUsage,
      networkIn,
      networkOut,
      timestamp: new Date()
    };
  }

  /**
   * Store collected metrics
   */
  async collectAndStore() {
    try {
      const metrics = this.collectMetrics();

      await this.prisma.$transaction([
        this.prisma.resourceMetric.create({
          data: { type: 'CPU', value: metrics.cpu }
        }),
        this.prisma.resourceMetric.create({
          data: { type: 'MEMORY', value: metrics.memory }
        }),
        ...(metrics.disk !== null ? [
          this.prisma.resourceMetric.create({
            data: { type: 'DISK', value: metrics.disk }
          })
        ] : []),
        ...(metrics.networkIn > 0 ? [
          this.prisma.resourceMetric.create({
            data: { type: 'NETWORK_IN', value: metrics.networkIn }
          })
        ] : []),
        ...(metrics.networkOut > 0 ? [
          this.prisma.resourceMetric.create({
            data: { type: 'NETWORK_OUT', value: metrics.networkOut }
          })
        ] : [])
      ]);

      // Cleanup old metrics
      await this.cleanup();

    } catch (error) {
      log.error({ error: error.message }, 'error collecting metrics');
    }
  }

  /**
   * Cleanup old metrics beyond retention period
   */
  async cleanup() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      await this.prisma.resourceMetric.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });
    } catch (error) {
      log.error({ error: error.message }, 'error cleaning up metrics');
    }
  }

  /**
   * Get historical metrics
   */
  async getHistory(type, hours = 24, resolution = 60) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const metrics = await this.prisma.resourceMetric.findMany({
        where: {
          type: type.toUpperCase(),
          timestamp: { gte: cutoffDate }
        },
        orderBy: { timestamp: 'asc' }
      });

      // Optionally downsample if too many points
      if (resolution && metrics.length > resolution) {
        const step = Math.floor(metrics.length / resolution);
        return metrics.filter((_, i) => i % step === 0);
      }

      return metrics;
    } catch (error) {
      log.error({ error: error.message, type }, 'error getting metric history');
      return [];
    }
  }

  /**
   * Get aggregated stats
   */
  async getStats(type, hours = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const result = await this.prisma.resourceMetric.aggregate({
        where: {
          type: type.toUpperCase(),
          timestamp: { gte: cutoffDate }
        },
        _avg: { value: true },
        _min: { value: true },
        _max: { value: true },
        _count: true
      });

      return {
        type,
        hours,
        average: result._avg.value,
        min: result._min.value,
        max: result._max.value,
        samples: result._count
      };
    } catch (error) {
      log.error({ error: error.message, type }, 'error getting metric stats');
      return null;
    }
  }
}

/**
 * Create metrics API routes
 */
export function createMetricsRouter(prisma, collector, Router) {
  const router = Router();

  /**
   * Get current system metrics
   */
  router.get('/current', (req, res) => {
    try {
      const metrics = collector.collectMetrics();
      res.json(metrics);
    } catch (error) {
      log.error({ error: error.message }, 'error getting current metrics');
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  /**
   * Get historical metrics for a specific type
   */
  router.get('/history/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const { hours = 24, resolution = 60 } = req.query;

      const metrics = await collector.getHistory(
        type,
        parseInt(hours),
        parseInt(resolution)
      );

      res.json({
        type,
        hours: parseInt(hours),
        data: metrics
      });
    } catch (error) {
      log.error({ error: error.message, type: req.params.type }, 'error getting metric history');
      res.status(500).json({ error: 'Failed to get history' });
    }
  });

  /**
   * Get aggregated statistics
   */
  router.get('/stats/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const { hours = 24 } = req.query;

      const stats = await collector.getStats(type, parseInt(hours));

      if (!stats) {
        return res.status(404).json({ error: 'No data found' });
      }

      res.json(stats);
    } catch (error) {
      log.error({ error: error.message, type: req.params.type }, 'error getting metric stats');
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  /**
   * Get all metrics overview
   */
  router.get('/overview', async (req, res) => {
    try {
      const { hours = 24 } = req.query;
      const h = parseInt(hours);

      const [cpu, memory, disk] = await Promise.all([
        collector.getStats('CPU', h),
        collector.getStats('MEMORY', h),
        collector.getStats('DISK', h)
      ]);

      const current = collector.collectMetrics();

      res.json({
        current,
        history: {
          hours: h,
          cpu,
          memory,
          disk
        }
      });
    } catch (error) {
      log.error({ error: error.message }, 'error getting metrics overview');
      res.status(500).json({ error: 'Failed to get overview' });
    }
  });

  return router;
}

/**
 * Observability Routes
 *
 * API endpoints for managing the observability stack (Jaeger, Loki, Promtail)
 * and querying traces/logs through the admin interface.
 */

import express from 'express';
import { createLogger } from '../services/logger.js';
import {
  getStackStatus,
  startObservabilityStack,
  stopObservabilityStack,
  restartObservabilityStack,
  getServiceEndpoints,
  isStackConfigured,
} from '../services/observabilityStack.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('observability-routes');

// Jaeger and Loki endpoints (localhost only)
const JAEGER_URL = process.env.JAEGER_URL || 'http://localhost:16686';
const LOKI_URL = process.env.LOKI_URL || 'http://localhost:3100';

/**
 * Create observability routes
 *
 * @returns {import('express').Router} Express router
 */
export function createObservabilityRouter() {
  const router = express.Router();

  // =========================================================================
  // STACK MANAGEMENT
  // =========================================================================

  /**
   * GET /api/observability/stack/status
   * Get the status of all observability containers
   */
  router.get('/stack/status', async (req, res) => {
    try {
      const status = await getStackStatus();
      res.json(status);
    } catch (error) {
      log.error({ error: error.message }, 'Failed to get stack status');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get observability stack status',
        operation: 'get stack status',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/observability/stack/start
   * Start the observability stack
   */
  router.post('/stack/start', async (req, res) => {
    try {
      const result = await startObservabilityStack();
      res.json(result);
    } catch (error) {
      log.error({ error: error.message }, 'Failed to start stack');
      return sendSafeError(res, error, {
        userMessage: 'Failed to start observability stack',
        operation: 'start stack',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/observability/stack/stop
   * Stop the observability stack
   */
  router.post('/stack/stop', async (req, res) => {
    try {
      const result = await stopObservabilityStack();
      res.json(result);
    } catch (error) {
      log.error({ error: error.message }, 'Failed to stop stack');
      return sendSafeError(res, error, {
        userMessage: 'Failed to stop observability stack',
        operation: 'stop stack',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/observability/stack/restart
   * Restart the observability stack
   */
  router.post('/stack/restart', async (req, res) => {
    try {
      const result = await restartObservabilityStack();
      res.json(result);
    } catch (error) {
      log.error({ error: error.message }, 'Failed to restart stack');
      return sendSafeError(res, error, {
        userMessage: 'Failed to restart observability stack',
        operation: 'restart stack',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/endpoints
   * Get service endpoint URLs
   */
  router.get('/endpoints', (req, res) => {
    res.json(getServiceEndpoints());
  });

  // =========================================================================
  // JAEGER TRACE QUERIES
  // =========================================================================

  /**
   * GET /api/observability/services
   * Get list of traced services from Jaeger
   */
  router.get('/services', async (req, res) => {
    try {
      const response = await fetch(`${JAEGER_URL}/api/services`);
      if (!response.ok) {
        throw new Error(`Jaeger returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      log.error({ error: error.message }, 'Failed to get services from Jaeger');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get services. Is Jaeger running?',
        operation: 'get services',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/operations/:service
   * Get operations for a service from Jaeger
   */
  router.get('/operations/:service', async (req, res) => {
    try {
      const { service } = req.params;
      const response = await fetch(`${JAEGER_URL}/api/services/${encodeURIComponent(service)}/operations`);
      if (!response.ok) {
        throw new Error(`Jaeger returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      log.error({ error: error.message, service: req.params.service }, 'Failed to get operations');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get operations from Jaeger',
        operation: 'get operations',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/traces
   * Search traces in Jaeger
   *
   * Query params:
   * - service: Service name (required)
   * - operation: Operation name (optional)
   * - start: Start time in microseconds (optional)
   * - end: End time in microseconds (optional)
   * - limit: Max traces (default: 20)
   * - minDuration: Minimum duration filter (optional)
   * - maxDuration: Maximum duration filter (optional)
   * - tags: JSON object of tags to filter (optional)
   */
  router.get('/traces', async (req, res) => {
    try {
      const {
        service,
        operation,
        start,
        end,
        limit = 20,
        minDuration,
        maxDuration,
        tags,
      } = req.query;

      if (!service) {
        return res.status(400).json({ error: 'service parameter is required' });
      }

      // Build Jaeger query URL
      const params = new URLSearchParams();
      params.set('service', service);
      params.set('limit', String(limit));

      if (operation) params.set('operation', operation);
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      if (minDuration) params.set('minDuration', minDuration);
      if (maxDuration) params.set('maxDuration', maxDuration);
      if (tags) params.set('tags', tags);

      const url = `${JAEGER_URL}/api/traces?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Jaeger returned ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      log.error({ error: error.message }, 'Failed to search traces');
      return sendSafeError(res, error, {
        userMessage: 'Failed to search traces. Is Jaeger running?',
        operation: 'search traces',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/traces/:traceId
   * Get a specific trace by ID
   */
  router.get('/traces/:traceId', async (req, res) => {
    try {
      const { traceId } = req.params;
      const response = await fetch(`${JAEGER_URL}/api/traces/${encodeURIComponent(traceId)}`);

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'Trace not found' });
        }
        throw new Error(`Jaeger returned ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      log.error({ error: error.message, traceId: req.params.traceId }, 'Failed to get trace');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get trace details',
        operation: 'get trace',
        requestId: req.id,
      });
    }
  });

  // =========================================================================
  // LOKI LOG QUERIES
  // =========================================================================

  /**
   * GET /api/observability/loki/labels
   * Get available labels from Loki
   */
  router.get('/loki/labels', async (req, res) => {
    try {
      const response = await fetch(`${LOKI_URL}/loki/api/v1/labels`);
      if (!response.ok) {
        throw new Error(`Loki returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      log.error({ error: error.message }, 'Failed to get Loki labels');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get labels. Is Loki running?',
        operation: 'get loki labels',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/loki/labels/:label/values
   * Get values for a specific label
   */
  router.get('/loki/labels/:label/values', async (req, res) => {
    try {
      const { label } = req.params;
      const response = await fetch(`${LOKI_URL}/loki/api/v1/label/${encodeURIComponent(label)}/values`);
      if (!response.ok) {
        throw new Error(`Loki returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      log.error({ error: error.message, label: req.params.label }, 'Failed to get label values');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get label values from Loki',
        operation: 'get label values',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/loki/query
   * Execute a LogQL query
   *
   * Query params:
   * - query: LogQL query (required)
   * - start: Start time (optional, RFC3339 or Unix timestamp)
   * - end: End time (optional)
   * - limit: Max entries (default: 100)
   * - direction: 'forward' or 'backward' (default: backward)
   */
  router.get('/loki/query', async (req, res) => {
    try {
      const {
        query,
        start,
        end,
        limit = 100,
        direction = 'backward',
      } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'query parameter is required' });
      }

      // Basic LogQL validation
      if (!query.startsWith('{') && !query.includes('|')) {
        return res.status(400).json({
          error: 'Invalid LogQL query. Query must start with a stream selector like {job="app"}',
        });
      }

      const params = new URLSearchParams();
      params.set('query', query);
      params.set('limit', String(limit));
      params.set('direction', direction);

      if (start) params.set('start', start);
      if (end) params.set('end', end);

      const url = `${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text();
        log.error({ status: response.status, body: errorBody }, 'Loki query failed');
        throw new Error(`Loki query failed: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      log.error({ error: error.message, query: req.query.query }, 'Failed to execute Loki query');
      return sendSafeError(res, error, {
        userMessage: 'Failed to execute log query. Check query syntax.',
        operation: 'loki query',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/loki/streams
   * Get active log streams
   */
  router.get('/loki/streams', async (req, res) => {
    try {
      // Query for recent streams
      const now = Date.now() * 1000000; // Nanoseconds
      const oneHourAgo = (Date.now() - 3600000) * 1000000;

      const params = new URLSearchParams();
      params.set('query', '{job=~".+"}');
      params.set('start', String(oneHourAgo));
      params.set('end', String(now));
      params.set('limit', '1');

      const response = await fetch(`${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Loki returned ${response.status}`);
      }

      const data = await response.json();

      // Extract unique stream labels
      const streams = new Set();
      if (data.data?.result) {
        for (const stream of data.data.result) {
          streams.add(JSON.stringify(stream.stream));
        }
      }

      res.json({
        status: 'success',
        data: Array.from(streams).map(s => JSON.parse(s)),
      });
    } catch (error) {
      log.error({ error: error.message }, 'Failed to get Loki streams');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get active log streams',
        operation: 'get streams',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/observability/health
   * Check health of all observability services
   */
  router.get('/health', async (req, res) => {
    const health = {
      jaeger: { status: 'unknown' },
      loki: { status: 'unknown' },
      promtail: { status: 'unknown' },
    };

    // Check Jaeger
    try {
      const response = await fetch(`${JAEGER_URL}/`, { signal: AbortSignal.timeout(3000) });
      health.jaeger.status = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      health.jaeger.status = 'unavailable';
    }

    // Check Loki
    try {
      const response = await fetch(`${LOKI_URL}/ready`, { signal: AbortSignal.timeout(3000) });
      health.loki.status = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      health.loki.status = 'unavailable';
    }

    // Check Promtail
    try {
      const response = await fetch('http://localhost:9080/ready', { signal: AbortSignal.timeout(3000) });
      health.promtail.status = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      health.promtail.status = 'unavailable';
    }

    const allHealthy = Object.values(health).every(s => s.status === 'healthy');

    res.json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: health,
    });
  });

  return router;
}

export default createObservabilityRouter;

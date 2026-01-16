/**
 * Prometheus Metrics Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  websocketConnections,
  terminalSessions,
  dbQueryDuration,
  dbQueryTotal,
  slowQueryTotal,
  agentExecutions,
  agentExecutionDuration,
  dockerContainers,
  gitOperations,
  errorTotal,
  rateLimitHits,
  metricsMiddleware,
  recordWebSocketConnection,
  recordTerminalSession,
  recordAgentExecution,
  recordDockerContainers,
  recordGitOperation,
  recordRateLimitHit,
  resetMetrics,
} from './prometheusMetrics.js';

// Reset metrics before each test
beforeEach(() => {
  resetMetrics();
});

describe('Prometheus Metrics Service', () => {
  describe('Metrics Registration', () => {
    it('should have HTTP request duration histogram', () => {
      expect(httpRequestDuration).toBeDefined();
      expect(httpRequestDuration.name).toBe('consoleweb_http_request_duration_seconds');
    });

    it('should have HTTP request counter', () => {
      expect(httpRequestTotal).toBeDefined();
      expect(httpRequestTotal.name).toBe('consoleweb_http_requests_total');
    });

    it('should have active connections gauge', () => {
      expect(activeConnections).toBeDefined();
      expect(activeConnections.name).toBe('consoleweb_active_connections');
    });

    it('should have websocket connections gauge', () => {
      expect(websocketConnections).toBeDefined();
      expect(websocketConnections.name).toBe('consoleweb_websocket_connections');
    });

    it('should have terminal sessions gauge', () => {
      expect(terminalSessions).toBeDefined();
      expect(terminalSessions.name).toBe('consoleweb_terminal_sessions');
    });

    it('should have database query metrics', () => {
      expect(dbQueryDuration).toBeDefined();
      expect(dbQueryTotal).toBeDefined();
      expect(slowQueryTotal).toBeDefined();
    });

    it('should have agent metrics', () => {
      expect(agentExecutions).toBeDefined();
      expect(agentExecutionDuration).toBeDefined();
    });

    it('should have Docker containers gauge', () => {
      expect(dockerContainers).toBeDefined();
      expect(dockerContainers.name).toBe('consoleweb_docker_containers');
    });

    it('should have git operations counter', () => {
      expect(gitOperations).toBeDefined();
      expect(gitOperations.name).toBe('consoleweb_git_operations_total');
    });

    it('should have error counter', () => {
      expect(errorTotal).toBeDefined();
      expect(errorTotal.name).toBe('consoleweb_errors_total');
    });

    it('should have rate limit hits counter', () => {
      expect(rateLimitHits).toBeDefined();
      expect(rateLimitHits.name).toBe('consoleweb_rate_limit_hits_total');
    });
  });

  describe('Helper Functions', () => {
    describe('recordWebSocketConnection', () => {
      it('should increment on connect', async () => {
        recordWebSocketConnection(true);
        const metrics = await websocketConnections.get();
        expect(metrics.values[0].value).toBe(1);
      });

      it('should decrement on disconnect', async () => {
        recordWebSocketConnection(true);
        recordWebSocketConnection(false);
        const metrics = await websocketConnections.get();
        expect(metrics.values[0].value).toBe(0);
      });
    });

    describe('recordTerminalSession', () => {
      it('should increment on active', async () => {
        recordTerminalSession(true);
        const metrics = await terminalSessions.get();
        expect(metrics.values[0].value).toBe(1);
      });

      it('should decrement on inactive', async () => {
        recordTerminalSession(true);
        recordTerminalSession(false);
        const metrics = await terminalSessions.get();
        expect(metrics.values[0].value).toBe(0);
      });
    });

    describe('recordAgentExecution', () => {
      it('should record execution count', async () => {
        recordAgentExecution('test-agent', 'success');
        const metrics = await agentExecutions.get();
        expect(metrics.values.length).toBeGreaterThan(0);
      });

      it('should record execution duration', async () => {
        recordAgentExecution('test-agent', 'success', 5.5);
        const metrics = await agentExecutionDuration.get();
        expect(metrics.values.length).toBeGreaterThan(0);
      });

      it('should not record duration if undefined', async () => {
        resetMetrics();
        recordAgentExecution('test-agent', 'success');
        const metrics = await agentExecutionDuration.get();
        expect(metrics.values.length).toBe(0);
      });
    });

    describe('recordDockerContainers', () => {
      it('should set container counts by status', async () => {
        recordDockerContainers(5, 3, 1);
        const metrics = await dockerContainers.get();

        const running = metrics.values.find(v => v.labels.status === 'running');
        const stopped = metrics.values.find(v => v.labels.status === 'stopped');
        const paused = metrics.values.find(v => v.labels.status === 'paused');

        expect(running?.value).toBe(5);
        expect(stopped?.value).toBe(3);
        expect(paused?.value).toBe(1);
      });
    });

    describe('recordGitOperation', () => {
      it('should record successful operations', async () => {
        recordGitOperation('commit', true);
        const metrics = await gitOperations.get();
        const value = metrics.values.find(
          v => v.labels.operation === 'commit' && v.labels.success === 'true'
        );
        expect(value?.value).toBe(1);
      });

      it('should record failed operations', async () => {
        recordGitOperation('push', false);
        const metrics = await gitOperations.get();
        const value = metrics.values.find(
          v => v.labels.operation === 'push' && v.labels.success === 'false'
        );
        expect(value?.value).toBe(1);
      });
    });

    describe('recordRateLimitHit', () => {
      it('should record rate limit hits', async () => {
        recordRateLimitHit('api', '/api/test');
        const metrics = await rateLimitHits.get();
        expect(metrics.values.length).toBeGreaterThan(0);
      });

      it('should normalize path', async () => {
        recordRateLimitHit('strict', '/api/users/123');
        const metrics = await rateLimitHits.get();
        // Path should be normalized (123 -> {id})
        const value = metrics.values.find(v => v.labels.path === '/api/users/{id}');
        expect(value).toBeDefined();
      });
    });
  });

  describe('Metrics Middleware', () => {
    it('should skip /metrics endpoint', () => {
      const mockReq = { path: '/metrics' };
      const mockRes = {};
      const mockNext = vi.fn();

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should track active connections', async () => {
      const mockReq = { path: '/api/test', method: 'GET' };
      const listeners = {};
      const mockRes = {
        on: vi.fn((event, callback) => {
          listeners[event] = callback;
        }),
        statusCode: 200,
      };
      const mockNext = vi.fn();

      metricsMiddleware(mockReq, mockRes, mockNext);

      // Connection should be active
      let metrics = await activeConnections.get();
      expect(metrics.values[0].value).toBe(1);

      // Simulate response finish
      listeners.finish();

      // Connection should be decremented
      metrics = await activeConnections.get();
      expect(metrics.values[0].value).toBe(0);
    });

    it('should track request metrics on finish', async () => {
      const mockReq = { path: '/api/test', method: 'GET', route: { path: '/api/test' } };
      const listeners = {};
      const mockRes = {
        on: vi.fn((event, callback) => {
          listeners[event] = callback;
        }),
        statusCode: 200,
      };
      const mockNext = vi.fn();

      metricsMiddleware(mockReq, mockRes, mockNext);
      listeners.finish();

      const totalMetrics = await httpRequestTotal.get();
      expect(totalMetrics.values.length).toBeGreaterThan(0);
    });

    it('should track 5xx errors', async () => {
      const mockReq = { path: '/api/error', method: 'GET' };
      const listeners = {};
      const mockRes = {
        on: vi.fn((event, callback) => {
          listeners[event] = callback;
        }),
        statusCode: 500,
      };
      const mockNext = vi.fn();

      metricsMiddleware(mockReq, mockRes, mockNext);
      listeners.finish();

      const errorMetrics = await errorTotal.get();
      const http5xx = errorMetrics.values.find(v => v.labels.type === 'http_5xx');
      expect(http5xx?.value).toBe(1);
    });

    it('should track 4xx errors', async () => {
      const mockReq = { path: '/api/notfound', method: 'GET' };
      const listeners = {};
      const mockRes = {
        on: vi.fn((event, callback) => {
          listeners[event] = callback;
        }),
        statusCode: 404,
      };
      const mockNext = vi.fn();

      metricsMiddleware(mockReq, mockRes, mockNext);
      listeners.finish();

      const errorMetrics = await errorTotal.get();
      const http4xx = errorMetrics.values.find(v => v.labels.type === 'http_4xx');
      expect(http4xx?.value).toBe(1);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', async () => {
      // Add some metrics
      recordWebSocketConnection(true);
      recordTerminalSession(true);
      recordGitOperation('test', true);

      // Reset
      resetMetrics();

      // Verify gauges are reset
      const wsMetrics = await websocketConnections.get();
      const termMetrics = await terminalSessions.get();

      // After reset, gauges should be 0 or empty
      expect(wsMetrics.values.length === 0 || wsMetrics.values[0]?.value === 0).toBe(true);
    });
  });
});

/**
 * OpenTelemetry Distributed Tracing Service
 *
 * Provides distributed tracing for request correlation across services.
 * Integrates with Jaeger/Tempo for trace visualization.
 *
 * IMPORTANT: This file must be loaded BEFORE any other imports in server/index.js
 * to ensure all auto-instrumentations work correctly.
 */

import { createLogger } from './logger.js';

const log = createLogger('tracing');

// Flag to track initialization
let isInitialized = false;
let sdk = null;

/**
 * Check if OpenTelemetry is configured
 */
export function isTracingEnabled() {
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}

/**
 * Initialize OpenTelemetry SDK
 *
 * Call this at the very beginning of your application, before any other imports.
 * The SDK will auto-instrument HTTP, Express, and other common libraries.
 *
 * @returns {Promise<void>}
 */
export async function initTracing() {
  if (isInitialized) {
    log.warn('OpenTelemetry already initialized');
    return;
  }

  if (!isTracingEnabled()) {
    log.info('OpenTelemetry disabled - OTEL_EXPORTER_OTLP_ENDPOINT not configured');
    return;
  }

  try {
    // Dynamic imports to avoid loading when not needed
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = await import('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions');

    // Create trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {},
    });

    // Create SDK with auto-instrumentations
    sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'console-web',
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version || 'unknown',
        environment: process.env.NODE_ENV || 'development',
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Configure specific instrumentations
          '@opentelemetry/instrumentation-http': {
            // Don't trace health checks and metrics endpoints
            ignoreIncomingPaths: ['/health', '/metrics', '/favicon.ico'],
          },
          '@opentelemetry/instrumentation-express': {
            // Capture request/response headers (filtered)
            requestHook: (span, info) => {
              // Add custom attributes
              if (info.request.headers['x-request-id']) {
                span.setAttribute('request.id', info.request.headers['x-request-id']);
              }
            },
          },
          '@opentelemetry/instrumentation-pg': {
            // Enable query parameter capture for debugging (masked in production)
            enhancedDatabaseReporting: process.env.NODE_ENV !== 'production',
          },
          // Disable noisy instrumentations
          '@opentelemetry/instrumentation-dns': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    // Start the SDK
    await sdk.start();
    isInitialized = true;

    log.info({
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      serviceName: process.env.OTEL_SERVICE_NAME || 'console-web',
    }, 'OpenTelemetry tracing initialized');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await shutdown();
    });
  } catch (error) {
    log.error({ error: error.message }, 'Failed to initialize OpenTelemetry');
    // Don't throw - tracing failure shouldn't crash the app
  }
}

/**
 * Shutdown the OpenTelemetry SDK gracefully
 */
export async function shutdown() {
  if (!sdk) return;

  try {
    await sdk.shutdown();
    log.info('OpenTelemetry shut down successfully');
  } catch (error) {
    log.error({ error: error.message }, 'Error shutting down OpenTelemetry');
  }
}

/**
 * Get the current active span (if any)
 */
export async function getActiveSpan() {
  if (!isInitialized) return null;

  try {
    const { trace } = await import('@opentelemetry/api');
    return trace.getActiveSpan();
  } catch {
    return null;
  }
}

/**
 * Create a custom span for manual instrumentation
 *
 * @param {string} name - Span name
 * @param {Function} fn - Function to execute within the span
 * @returns {Promise<any>} Result of the function
 */
export async function withSpan(name, fn) {
  if (!isInitialized) {
    return fn();
  }

  try {
    const { trace } = await import('@opentelemetry/api');
    const tracer = trace.getTracer('console-web');

    return tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: error.message }); // ERROR
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  } catch {
    return fn();
  }
}

/**
 * Add attributes to the current span
 *
 * @param {Object} attributes - Key-value pairs to add
 */
export async function addSpanAttributes(attributes) {
  if (!isInitialized) return;

  try {
    const span = await getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Record an event on the current span
 *
 * @param {string} name - Event name
 * @param {Object} attributes - Event attributes
 */
export async function recordSpanEvent(name, attributes = {}) {
  if (!isInitialized) return;

  try {
    const span = await getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Express middleware to add trace context to request
 */
export function tracingMiddleware() {
  return async (req, res, next) => {
    if (!isInitialized) {
      return next();
    }

    try {
      const span = await getActiveSpan();
      if (span) {
        // Add request ID to span
        if (req.id) {
          span.setAttribute('request.id', req.id);
        }

        // Add user info if available
        if (req.user?.id) {
          span.setAttribute('user.id', req.user.id);
        }

        // Expose trace ID in response header for debugging
        const spanContext = span.spanContext();
        if (spanContext?.traceId) {
          res.setHeader('X-Trace-Id', spanContext.traceId);
        }
      }
    } catch {
      // Ignore errors
    }

    next();
  };
}

export default {
  initTracing,
  isTracingEnabled,
  shutdown,
  getActiveSpan,
  withSpan,
  addSpanAttributes,
  recordSpanEvent,
  tracingMiddleware,
};

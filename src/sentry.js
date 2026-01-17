/**
 * Sentry Error Tracking (Frontend)
 *
 * Initializes Sentry for React application error tracking and performance monitoring.
 * Includes Session Replay for debugging user interactions.
 */

import * as Sentry from '@sentry/react';

/**
 * Sensitive data patterns to filter from Sentry reports
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
];

/**
 * Check if Sentry is configured and enabled
 */
export function isSentryEnabled() {
  return Boolean(import.meta.env.VITE_SENTRY_DSN);
}

/**
 * Initialize Sentry for the frontend
 * Call this in main.jsx before rendering the app
 */
export function initSentry() {
  if (!isSentryEnabled()) {
    console.info('[Sentry] Disabled - VITE_SENTRY_DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_APP_VERSION || 'unknown',

      // Only enable in production by default
      enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true',

      // Integrations
      integrations: [
        // Browser tracing for performance
        Sentry.browserTracingIntegration({
          // Capture interactions (clicks, navigation)
          enableInp: true,
        }),
        // Session replay for debugging
        Sentry.replayIntegration({
          // Mask all text by default for privacy
          maskAllText: true,
          // Block all media (images, videos)
          blockAllMedia: true,
          // Privacy settings
          maskAllInputs: true,
        }),
      ],

      // Performance monitoring sample rate
      tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),

      // Session replay sample rates
      replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_RATE || '0.1'),
      replaysOnErrorSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_ERROR_RATE || '1.0'),

      // Filter events before sending
      beforeSend(event, hint) {
        // Filter sensitive data from event
        if (event.request?.headers) {
          event.request.headers = filterSensitiveData(event.request.headers);
        }
        if (event.extra) {
          event.extra = filterSensitiveData(event.extra);
        }

        // Don't send chunk load errors (usually ad blockers)
        const message = event.message || hint?.originalException?.message || '';
        if (message.includes('Loading chunk') || message.includes('ChunkLoadError')) {
          return null;
        }

        return event;
      },

      // Ignore common non-actionable errors
      ignoreErrors: [
        // Network errors
        'Network Error',
        'Failed to fetch',
        'NetworkError',
        'Load failed',
        // AbortController
        'AbortError',
        'The operation was aborted',
        // Resize observer (common in React)
        'ResizeObserver loop',
        // Extension errors
        'Extension context invalidated',
        // Non-error rejections
        'Non-Error promise rejection captured',
        // Chunk loading (ad blockers, network issues)
        'Loading chunk',
        'ChunkLoadError',
      ],

      // Don't send errors from these URLs
      denyUrls: [
        // Browser extensions
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
        // Analytics
        /google-analytics\.com/i,
        /googletagmanager\.com/i,
      ],
    });

    console.info('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Filter sensitive data from objects
 */
function filterSensitiveData(obj, depth = 0) {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => filterSensitiveData(item, depth + 1));
  }

  const filtered = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      filtered[key] = '[FILTERED]';
    } else if (typeof value === 'object') {
      filtered[key] = filterSensitiveData(value, depth + 1);
    } else {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Capture an exception manually
 */
export function captureException(error, context = {}) {
  if (!isSentryEnabled()) {
    console.error('[Sentry disabled] Error:', error, context);
    return null;
  }

  return Sentry.withScope((scope) => {
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      scope.setExtras(filterSensitiveData(context.extra));
    }
    if (context.user) {
      scope.setUser(context.user);
    }

    return Sentry.captureException(error);
  });
}

/**
 * Capture a message manually
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!isSentryEnabled()) {
    console.info('[Sentry disabled] Message:', message, context);
    return null;
  }

  return Sentry.withScope((scope) => {
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      scope.setExtras(filterSensitiveData(context.extra));
    }

    return Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context
 */
export function setUser(user) {
  if (!isSentryEnabled()) return;

  Sentry.setUser(user ? {
    id: user.id,
    username: user.username,
    email: user.email,
  } : null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb) {
  if (!isSentryEnabled()) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Create an error boundary wrapper component
 * Use with React.lazy for route-level error boundaries
 */
export function createErrorBoundary(fallback) {
  return Sentry.withErrorBoundary(({ children }) => children, {
    fallback,
    showDialog: false, // Use custom dialog instead
  });
}

/**
 * Get the current Sentry event ID (useful for error feedback)
 */
export function getLastEventId() {
  return Sentry.lastEventId();
}

/**
 * Show Sentry feedback dialog for user to report issue
 */
export function showReportDialog(options = {}) {
  if (!isSentryEnabled()) return;

  const eventId = Sentry.lastEventId();
  if (eventId) {
    Sentry.showReportDialog({
      eventId,
      title: 'Something went wrong',
      subtitle: 'Our team has been notified. If you\'d like to help, tell us what happened.',
      subtitle2: '',
      labelName: 'Name',
      labelEmail: 'Email',
      labelComments: 'What happened?',
      labelClose: 'Close',
      labelSubmit: 'Send Report',
      ...options,
    });
  }
}

// Export Sentry for direct access if needed
export { Sentry };

export default {
  initSentry,
  isSentryEnabled,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  createErrorBoundary,
  getLastEventId,
  showReportDialog,
};

/**
 * Observability Constants
 */

// Internal tab constants
export const OTEL_TABS = {
  STACK: 'stack',
  TRACES: 'traces',
  LOGS: 'logs',
};

// Service emoji mapping
export const SERVICE_ICONS = {
  jaeger: '\u{1F50D}',
  loki: '\u{1F4DC}',
  promtail: '\u{1F4E1}',
};

// Status color helper
export const getStatusColor = (status) => {
  switch (status) {
    case 'running':
    case 'healthy':
      return 'text-hacker-green';
    case 'stopped':
    case 'unhealthy':
      return 'text-hacker-error';
    default:
      return 'text-hacker-warning';
  }
};

// Log level color helper
export const getLogLevelColor = (line) => {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('fatal')) return 'text-red-400';
  if (lower.includes('warn')) return 'text-yellow-400';
  if (lower.includes('info')) return 'text-blue-400';
  if (lower.includes('debug')) return 'text-gray-400';
  return 'text-hacker-text';
};

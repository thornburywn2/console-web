/**
 * Input Validation Helpers
 * Simple validation functions for common input types.
 * For Zod schemas, see ./validation.js
 *
 * @security These validators prevent injection attacks
 */

import { createLogger, logSecurityEvent } from '../services/logger.js';

const log = createLogger('validators');

/**
 * Validate and sanitize a shpool session name
 * Only allows alphanumeric, dash, and underscore
 *
 * @param {string} sessionName - The session name to validate
 * @returns {string|null} - The validated name or null if invalid
 */
export function validateSessionName(sessionName) {
  if (typeof sessionName !== 'string') return null;
  // Session names must start with sp- or cp- (legacy) and only contain safe characters
  if (!/^(sp|cp)-[a-zA-Z0-9_-]+$/.test(sessionName)) return null;
  if (sessionName.length > 100) return null;
  return sessionName;
}

/**
 * Validate and sanitize a systemd service name
 * Only allows alphanumeric, dash, underscore, and @
 *
 * @param {string} serviceName - The service name to validate
 * @returns {string|null} - The validated name or null if invalid
 */
export function validateServiceName(serviceName) {
  if (typeof serviceName !== 'string') return null;
  // Service names only contain safe characters (no shell metacharacters)
  if (!/^[a-zA-Z0-9_@.-]+$/.test(serviceName)) return null;
  if (serviceName.length > 256) return null;
  return serviceName;
}

/**
 * Validate a port number
 * Must be a positive integer between 1 and 65535
 *
 * @param {string|number} port - The port number to validate
 * @returns {number|null} - The validated port number or null if invalid
 */
export function validatePort(port) {
  const num = parseInt(port, 10);
  if (isNaN(num) || num < 1 || num > 65535) return null;
  return num;
}

/**
 * Validate a journalctl unit name
 *
 * @param {string} unit - The unit name to validate
 * @returns {string|null} - The validated unit name or null if invalid
 */
export function validateUnitName(unit) {
  if (typeof unit !== 'string') return null;
  if (!/^[a-zA-Z0-9_@.-]+$/.test(unit)) return null;
  if (unit.length > 256) return null;
  return unit;
}

/**
 * Validate a Docker container/image ID or name
 *
 * @param {string} id - The container/image ID or name
 * @returns {string|null} - The validated ID or null if invalid
 */
export function validateDockerId(id) {
  if (typeof id !== 'string') return null;
  // Docker IDs are hex, names can include alphanumeric, dash, underscore, dot
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id)) return null;
  if (id.length > 256) return null;
  return id;
}

/**
 * Validate a Unix signal name
 *
 * @param {string} signal - The signal name (e.g., SIGTERM, SIGKILL)
 * @returns {string|null} - The validated signal or null if invalid
 */
export function validateSignal(signal) {
  const validSignals = [
    'SIGTERM', 'SIGKILL', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGUSR1', 'SIGUSR2',
    'TERM', 'KILL', 'HUP', 'INT', 'QUIT', 'USR1', 'USR2'
  ];
  if (typeof signal !== 'string') return null;
  const upper = signal.toUpperCase();
  if (!validSignals.includes(upper)) return null;
  return upper;
}

export default {
  validateSessionName,
  validateServiceName,
  validatePort,
  validateUnitName,
  validateDockerId,
  validateSignal,
};

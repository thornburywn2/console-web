/**
 * Sovereign Stack Service Configuration
 * Defines the services in the sovereign technology stack for health monitoring
 */

/**
 * @typedef {Object} ServiceConfig
 * @property {string} name - Display name for the service
 * @property {number} port - Port number the service runs on
 * @property {string|null} url - Base URL for the service (null if internal only)
 * @property {string} healthEndpoint - Health check endpoint path
 * @property {string} icon - Icon identifier for UI display
 * @property {string} description - Brief description of the service
 * @property {string} containerPattern - Docker container name pattern for identification
 */

/**
 * Sovereign Stack service definitions
 * @type {Object.<string, ServiceConfig>}
 */
export const SOVEREIGN_SERVICES = {
  authentik: {
    name: 'Authentik SSO',
    port: 6201,
    url: 'http://localhost:9000',
    healthEndpoint: '/api/v3/core/health/',
    icon: 'shield',
    description: 'Identity & Access Management',
    containerPattern: 'authentik',
  },
  openwebui: {
    name: 'Open WebUI',
    port: 6202,
    url: 'http://localhost:6202',
    healthEndpoint: '/health',
    icon: 'chat',
    description: 'Voice & Chat Interface',
    containerPattern: 'open-webui',
  },
  silverbullet: {
    name: 'SilverBullet',
    port: 6203,
    url: 'http://localhost:6203',
    healthEndpoint: '/',
    icon: 'note',
    description: 'Knowledge Management',
    containerPattern: 'silverbullet',
  },
  plane: {
    name: 'Plane',
    port: 6204,
    url: 'http://localhost:6204',
    healthEndpoint: '/api/v1/health/',
    icon: 'kanban',
    description: 'Project Management',
    containerPattern: 'plane',
  },
  n8n: {
    name: 'n8n',
    port: 6205,
    url: 'http://localhost:6205',
    healthEndpoint: '/healthz',
    icon: 'workflow',
    description: 'Automation Platform',
    containerPattern: 'n8n',
  },
  voiceRouter: {
    name: 'Voice Router',
    port: 6206,
    url: null,
    healthEndpoint: '/health',
    icon: 'mic',
    description: 'Voice Intent Classification',
    containerPattern: 'voice-router',
  },
  monitoring: {
    name: 'Monitoring Dashboard',
    port: 9001,
    url: null,
    healthEndpoint: '/health',
    icon: 'chart',
    description: 'System Monitoring',
    containerPattern: 'monitoring',
  },
};

/**
 * Get service names that are enabled
 * @returns {string[]} Array of service keys
 */
export function getServiceKeys() {
  return Object.keys(SOVEREIGN_SERVICES);
}

/**
 * Get service by key
 * @param {string} key - Service key (e.g., 'authentik')
 * @returns {ServiceConfig|undefined} Service configuration or undefined
 */
export function getService(key) {
  return SOVEREIGN_SERVICES[key];
}

/**
 * Get all services with their keys
 * @returns {Array<{key: string, config: ServiceConfig}>}
 */
export function getAllServices() {
  return Object.entries(SOVEREIGN_SERVICES).map(([key, config]) => ({
    key,
    config,
  }));
}

export default SOVEREIGN_SERVICES;

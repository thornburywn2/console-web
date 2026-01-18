/**
 * Centralized API Service
 * Provides a standardized interface for all API calls with:
 * - Consistent error handling
 * - Request/response logging
 * - Automatic retry logic
 * - Response type validation (Phase 5.2)
 * - Request cancellation support
 * - Authentication header injection
 * - Sentry error tracking with request IDs
 */

import { captureException, addBreadcrumb, isSentryEnabled } from '../sentry.js';
import {
  validateResponse,
  schemas,
  systemStatsSchema,
  settingsSchema,
  projectsListSchema,
  projectsExtendedListSchema,
  sessionsListSchema,
  foldersListSchema,
  tagsListSchema,
  dockerContainersSchema,
  dockerImagesSchema,
  dockerVolumesSchema,
  servicesListSchema,
  processesResponseSchema,
  firewallStatusSchema,
  firewallRulesSchema,
  gitStatusSchema,
  gitCommitsSchema,
  gitBranchesSchema,
  gitDiffSchema,
  githubReposSchema,
  githubRunsSchema,
  aiUsageSchema,
  personasListSchema,
  agentsListSchema,
  agentExecutionsSchema,
  marketplaceAgentsSchema,
  promptsListSchema,
  snippetsListSchema,
  shortcutsListSchema,
  dashboardDataSchema,
  notesListSchema,
  metricsResponseSchema,
  scheduledTasksSchema,
  mcpServersSchema,
  cloudflareTunnelStatusSchema,
  codePuppyStatusSchema,
  aiderStatusSchema,
  tabbyStatusSchema,
} from './responseSchemas.js';

// =============================================================================
// Validation Configuration (Phase 5.2)
// =============================================================================

/**
 * Global validation configuration
 * Set VITE_API_VALIDATION=true to enable response validation
 */
const validationConfig = {
  enabled: import.meta.env.VITE_API_VALIDATION === 'true' || import.meta.env.DEV,
  logWarnings: import.meta.env.DEV,
  strictMode: false, // If true, throws on validation failure instead of returning data
};

/**
 * Enable or disable API response validation at runtime
 */
export function setValidationEnabled(enabled) {
  validationConfig.enabled = enabled;
}

/**
 * Check if validation is enabled
 */
export function isValidationEnabled() {
  return validationConfig.enabled;
}

// Request ID generator for tracing
let requestId = 0;
const generateRequestId = () => `req-${Date.now()}-${++requestId}`;

/**
 * API Error class with structured error information
 */
export class ApiError extends Error {
  constructor(message, status, details = null, requestId = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.requestId = requestId;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Check if error is a network error
   */
  isNetworkError() {
    return this.status === 0 || this.message === 'Network error';
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if error is a validation error
   */
  isValidationError() {
    return this.status === 400;
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError() {
    return this.status === 429;
  }

  /**
   * Check if error is a server error
   */
  isServerError() {
    return this.status >= 500;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    if (this.isNetworkError()) {
      return 'Unable to connect to the server. Please check your connection.';
    }
    if (this.isAuthError()) {
      return 'You are not authorized to perform this action.';
    }
    if (this.isRateLimitError()) {
      return 'Too many requests. Please slow down and try again.';
    }
    if (this.isServerError()) {
      return 'Server error. Please try again later.';
    }
    if (this.isValidationError() && this.details) {
      return this.details;
    }
    return this.message || 'An unexpected error occurred.';
  }
}

/**
 * Default API configuration
 */
const defaultConfig = {
  baseUrl: '/api',
  timeout: 30000,
  retries: 0,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Active request controllers for cancellation
 */
const activeRequests = new Map();

/**
 * Cancel a specific request by its ID
 */
export function cancelRequest(requestId) {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
    return true;
  }
  return false;
}

/**
 * Cancel all active requests
 */
export function cancelAllRequests() {
  for (const [id, controller] of activeRequests) {
    controller.abort();
    activeRequests.delete(id);
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Core fetch wrapper with error handling and retries
 */
async function fetchWithRetry(url, options, config) {
  const reqId = generateRequestId();
  const controller = new AbortController();
  activeRequests.set(reqId, controller);

  // Add breadcrumb for request start
  addBreadcrumb({
    category: 'http',
    message: `${options.method || 'GET'} ${url}`,
    level: 'info',
    data: { requestId: reqId, method: options.method || 'GET', url },
  });

  const mergedOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      ...defaultConfig.headers,
      ...options.headers,
      'X-Request-ID': reqId
    }
  };

  let lastError = null;
  const maxAttempts = (config.retries || 0) + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add timeout wrapper
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || defaultConfig.timeout);

      const response = await fetch(url, mergedOptions);
      clearTimeout(timeoutId);
      activeRequests.delete(reqId);

      // Handle non-OK responses
      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: 'Failed to parse error response' };
          }
        } else {
          const text = await response.text();
          errorData = { error: text || response.statusText };
        }

        const apiError = new ApiError(
          errorData.error || errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.details || null,
          reqId
        );

        // Capture server errors (5xx) to Sentry with request ID
        if (response.status >= 500) {
          captureException(apiError, {
            tags: {
              component: 'api',
              requestId: reqId,
              statusCode: String(response.status),
            },
            extra: {
              url,
              method: options.method || 'GET',
              requestId: reqId,
              responseStatus: response.status,
              errorDetails: errorData,
            },
          });
        }

        throw apiError;
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text();
      } else if (contentType?.includes('application/octet-stream')) {
        return await response.blob();
      }

      // Default to JSON
      try {
        return await response.json();
      } catch {
        return await response.text();
      }

    } catch (error) {
      activeRequests.delete(reqId);

      // Handle abort/cancellation
      if (error.name === 'AbortError') {
        throw new ApiError('Request cancelled or timed out', 0, null, reqId);
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        lastError = new ApiError('Network error', 0, null, reqId);
      } else if (error instanceof ApiError) {
        lastError = error;
      } else {
        lastError = new ApiError(error.message, 0, null, reqId);
      }

      // Don't retry for client errors (4xx) except rate limiting
      if (lastError.status >= 400 && lastError.status < 500 && lastError.status !== 429) {
        throw lastError;
      }

      // Retry with exponential backoff
      if (attempt < maxAttempts) {
        await sleep(config.retryDelay * Math.pow(2, attempt - 1));

        // Add breadcrumb for retry attempt
        addBreadcrumb({
          category: 'http',
          message: `Retry attempt ${attempt} for ${url}`,
          level: 'warning',
          data: { requestId: reqId, attempt, maxAttempts },
        });
      }
    }
  }

  // Capture final error if all retries failed and it's a server error
  if (lastError && lastError.status >= 500) {
    captureException(lastError, {
      tags: {
        component: 'api',
        requestId: reqId,
        statusCode: String(lastError.status),
        retriesFailed: 'true',
      },
      extra: {
        url,
        method: options.method || 'GET',
        requestId: reqId,
        attempts: maxAttempts,
      },
    });
  }

  throw lastError;
}

/**
 * Main API object with HTTP method helpers
 */
const api = {
  /**
   * GET request
   * @param {string} endpoint - API endpoint (without /api prefix)
   * @param {object} options - Additional fetch options
   * @param {object} config - Request configuration (retries, timeout)
   */
  async get(endpoint, options = {}, config = {}) {
    const url = `${defaultConfig.baseUrl}${endpoint}`;
    return fetchWithRetry(url, { method: 'GET', ...options }, { ...defaultConfig, ...config });
  },

  /**
   * POST request
   * @param {string} endpoint - API endpoint (without /api prefix)
   * @param {object} data - Request body
   * @param {object} options - Additional fetch options
   * @param {object} config - Request configuration
   */
  async post(endpoint, data = {}, options = {}, config = {}) {
    const url = `${defaultConfig.baseUrl}${endpoint}`;
    return fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    }, { ...defaultConfig, ...config });
  },

  /**
   * PUT request
   * @param {string} endpoint - API endpoint (without /api prefix)
   * @param {object} data - Request body
   * @param {object} options - Additional fetch options
   * @param {object} config - Request configuration
   */
  async put(endpoint, data = {}, options = {}, config = {}) {
    const url = `${defaultConfig.baseUrl}${endpoint}`;
    return fetchWithRetry(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    }, { ...defaultConfig, ...config });
  },

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint (without /api prefix)
   * @param {object} data - Request body
   * @param {object} options - Additional fetch options
   * @param {object} config - Request configuration
   */
  async patch(endpoint, data = {}, options = {}, config = {}) {
    const url = `${defaultConfig.baseUrl}${endpoint}`;
    return fetchWithRetry(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    }, { ...defaultConfig, ...config });
  },

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint (without /api prefix)
   * @param {object} options - Additional fetch options
   * @param {object} config - Request configuration
   */
  async delete(endpoint, options = {}, config = {}) {
    const url = `${defaultConfig.baseUrl}${endpoint}`;
    return fetchWithRetry(url, { method: 'DELETE', ...options }, { ...defaultConfig, ...config });
  },

  /**
   * Upload file with multipart form data
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @param {object} options - Additional options
   * @param {object} config - Request configuration
   */
  async upload(endpoint, formData, options = {}, config = {}) {
    const url = `${defaultConfig.baseUrl}${endpoint}`;
    return fetchWithRetry(url, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - browser will set it with boundary
      },
      ...options
    }, { ...defaultConfig, ...config, timeout: 120000 }); // Longer timeout for uploads
  }
};

// ============================================
// VALIDATION HELPERS (Phase 5.2)
// ============================================

/**
 * Wraps an API call with optional response validation
 * @param {Function} apiCall - The API method to call
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {string} context - Context for error logging
 * @returns {Promise<any>} The validated response data
 */
async function withValidation(apiCall, schema, context) {
  const data = await apiCall();
  if (validationConfig.enabled && schema) {
    return validateResponse(schema, data, context);
  }
  return data;
}

/**
 * Creates a validated API method
 * @param {Function} method - The original API method
 * @param {z.ZodSchema} schema - The response schema
 * @param {string} context - Context string for logging
 */
function validated(method, schema, context) {
  return async (...args) => {
    const data = await method(...args);
    if (validationConfig.enabled && schema) {
      return validateResponse(schema, data, context);
    }
    return data;
  };
}

// ============================================
// DOMAIN-SPECIFIC API METHODS
// ============================================

/**
 * Project-related API methods
 * Phase 5.2: Response validation enabled for list methods
 */
export const projectsApi = {
  list: validated(() => api.get('/projects'), projectsListSchema, 'projectsApi.list'),
  listExtended: validated(() => api.get('/admin/projects-extended'), projectsExtendedListSchema, 'projectsApi.listExtended'),
  get: (id) => api.get(`/projects/${encodeURIComponent(id)}`),
  getClaudeMd: (project) => api.get(`/admin/claude-md/${encodeURIComponent(project)}`),
  updateClaudeMd: (project, content) => api.put(`/admin/claude-md/${encodeURIComponent(project)}`, { content }),
  getStats: (project) => api.get(`/projects/${encodeURIComponent(project)}/stats`),
  favorite: (id) => api.post(`/projects/${encodeURIComponent(id)}/favorite`),
  unfavorite: (id) => api.delete(`/projects/${encodeURIComponent(id)}/favorite`)
};

/**
 * System/Admin API methods
 * Phase 5.2: Response validation enabled
 */
export const systemApi = {
  getStats: validated(() => api.get('/admin/system'), systemStatsSchema, 'systemApi.getStats'),
  getDashboard: validated(() => api.get('/dashboard'), dashboardDataSchema, 'systemApi.getDashboard'),
  getSettings: validated(() => api.get('/settings'), settingsSchema, 'systemApi.getSettings'),
  updateSettings: (settings) => api.put('/settings', settings),
  getHealth: () => api.get('/health')
};

/**
 * Docker API methods
 * Phase 5.2: Response validation enabled for list methods
 */
export const dockerApi = {
  listContainers: validated((all = true) => api.get(`/docker/containers?all=${all}`), dockerContainersSchema, 'dockerApi.listContainers'),
  listImages: validated(() => api.get('/docker/images'), dockerImagesSchema, 'dockerApi.listImages'),
  listVolumes: validated(() => api.get('/docker/volumes'), dockerVolumesSchema, 'dockerApi.listVolumes'),
  startContainer: (id) => api.post(`/docker/containers/${id}/start`),
  stopContainer: (id) => api.post(`/docker/containers/${id}/stop`),
  restartContainer: (id) => api.post(`/docker/containers/${id}/restart`),
  getContainerLogs: (id, tail = 100) => api.get(`/docker/containers/${id}/logs?tail=${tail}`),
  getContainerStats: (id) => api.get(`/docker/containers/${id}/stats`)
};

/**
 * Infrastructure API methods
 * Phase 5.2: Response validation enabled for list methods
 */
export const infraApi = {
  getServices: validated(() => api.get('/server/services'), servicesListSchema, 'infraApi.getServices'),
  getProcesses: validated(() => api.get('/infra/processes'), processesResponseSchema, 'infraApi.getProcesses'),
  getNetworkInterfaces: () => api.get('/infra/network/interfaces'),
  ping: (host, count = 4) => api.post('/infra/network/ping', { host, count }),
  dnsLookup: (host, type = 'A') => api.post('/infra/network/dns', { host, type }),
  portCheck: (host, port) => api.post('/infra/network/port-check', { host, port }),
  getPackages: (search, limit = 100) => api.get(`/infra/packages?search=${search}&limit=${limit}`),
  getSecurityStatus: () => api.get('/infra/security/fail2ban')
};

/**
 * Firewall API methods
 * Phase 5.2: Response validation enabled
 */
export const firewallApi = {
  getStatus: validated(() => api.get('/admin-users/firewall/status'), firewallStatusSchema, 'firewallApi.getStatus'),
  getRules: validated(() => api.get('/admin-users/firewall/rules'), firewallRulesSchema, 'firewallApi.getRules'),
  addRule: (rule) => api.post('/admin-users/firewall/rules', rule),
  deleteRule: (number) => api.delete(`/admin-users/firewall/rules/${number}`),
  enable: () => api.post('/admin-users/firewall/enable'),
  disable: () => api.post('/admin-users/firewall/disable'),
  setDefault: (direction, policy) => api.post('/admin-users/firewall/default', { direction, policy }),
  setLogging: (level) => api.post('/admin-users/firewall/logging', { level })
};

/**
 * Sessions API methods
 * Phase 5.2: Response validation enabled
 */
export const sessionsApi = {
  list: validated(() => api.get('/sessions'), sessionsListSchema, 'sessionsApi.list'),
  get: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  // Session operations
  setFolder: (sessionId, folderId) => api.put(`/sessions/${sessionId}/folder`, { folderId }),
  setPin: (sessionId, isPinned) => api.put(`/sessions/${sessionId}/pin`, { isPinned }),
  setArchive: (sessionId, isArchived) => api.put(`/sessions/${sessionId}/archive`, { isArchived }),
  addTag: (sessionId, tagId) => api.post(`/sessions/${sessionId}/tags/${tagId}`),
  removeTag: (sessionId, tagId) => api.delete(`/sessions/${sessionId}/tags/${tagId}`),
  // Bulk operations
  bulk: (action, sessionIds) => api.post('/sessions/bulk', { action, sessionIds }),
};

/**
 * Folders API methods
 * Phase 5.2: Response validation enabled
 */
export const foldersApi = {
  list: validated(() => api.get('/folders'), foldersListSchema, 'foldersApi.list'),
  get: (id) => api.get(`/folders/${id}`),
  create: (name, parentId = null) => api.post('/folders', { name, parentId }),
  update: (id, data) => api.put(`/folders/${id}`, data),
  delete: (id) => api.delete(`/folders/${id}`),
};

/**
 * Tags API methods
 * Phase 5.2: Response validation enabled
 */
export const tagsApi = {
  list: validated(() => api.get('/tags'), tagsListSchema, 'tagsApi.list'),
  get: (id) => api.get(`/tags/${id}`),
  create: (data) => api.post('/tags', data),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`),
};

/**
 * Prompts API methods
 * Phase 5.2: Response validation enabled
 */
export const promptsApi = {
  list: validated((params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.favorite) query.set('favorite', 'true');
    if (params.search) query.set('search', params.search);
    const qs = query.toString();
    return api.get(`/prompts${qs ? `?${qs}` : ''}`);
  }, promptsListSchema, 'promptsApi.list'),
  get: (id) => api.get(`/prompts/${id}`),
  getCategories: () => api.get('/prompts/categories'),
  create: (data) => api.post('/prompts', data),
  update: (id, data) => api.put(`/prompts/${id}`, data),
  delete: (id) => api.delete(`/prompts/${id}`),
  toggleFavorite: (id, isFavorite) => api.put(`/prompts/${id}/favorite`, { isFavorite }),
  execute: (id, variables = {}) => api.post(`/prompts/${id}/execute`, { variables }),
};

/**
 * Snippets API methods
 * Phase 5.2: Response validation enabled
 */
export const snippetsApi = {
  list: validated(() => api.get('/snippets'), snippetsListSchema, 'snippetsApi.list'),
  get: (id) => api.get(`/snippets/${id}`),
  create: (data) => api.post('/snippets', data),
  update: (id, data) => api.put(`/snippets/${id}`, data),
  delete: (id) => api.delete(`/snippets/${id}`),
  run: (id) => api.post(`/snippets/${id}/run`),
  toggleFavorite: (id, isFavorite) => api.put(`/snippets/${id}`, { isFavorite }),
};

/**
 * Cloudflare API methods
 * Phase 5.2: Response validation enabled
 */
export const cloudflareApi = {
  getSettings: () => api.get('/cloudflare/settings'),
  saveSettings: (settings) => api.post('/cloudflare/settings', settings),
  getTunnelStatus: validated(() => api.get('/cloudflare/tunnel/status'), cloudflareTunnelStatusSchema, 'cloudflareApi.getTunnelStatus'),
  getRoutes: () => api.get('/cloudflare/routes'),
  getMappedRoutes: () => api.get('/cloudflare/routes/mapped'),
  getProjectRoutes: (projectId) => api.get(`/cloudflare/routes/${encodeURIComponent(projectId)}`),
  publish: (data) => api.post('/cloudflare/publish', data),
  unpublish: (hostname) => api.delete(`/cloudflare/publish/${encodeURIComponent(hostname)}`),
  sync: () => api.post('/cloudflare/sync'),
  updatePort: (hostname, localPort) => api.put(`/cloudflare/routes/${encodeURIComponent(hostname)}/port`, { localPort }),
  toggleWebsocket: (hostname, enabled) => api.put(`/cloudflare/routes/${encodeURIComponent(hostname)}/websocket`, { enabled })
};

/**
 * Agents API methods
 * Phase 5.2: Response validation enabled
 */
export const agentsApi = {
  list: validated(() => api.get('/agents'), agentsListSchema, 'agentsApi.list'),
  get: (id) => api.get(`/agents/${id}`),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  run: (id) => api.post(`/agents/${id}/run`),
  stop: (id) => api.post(`/agents/${id}/stop`),
  toggle: (id) => api.post(`/agents/${id}/toggle`),
  getMarketplace: validated(() => api.get('/marketplace/agents'), marketplaceAgentsSchema, 'agentsApi.getMarketplace'),
  installFromMarketplace: (id) => api.post(`/marketplace/agents/${id}/install`)
};

/**
 * Search API methods
 */
export const searchApi = {
  search: (query, types = null, limit = 20) => {
    let url = `/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    if (types) url += `&types=${types}`;
    return api.get(url);
  },
  globalSearch: (query, category = 'all', limit = 20) => {
    const params = new URLSearchParams({ q: query, category, limit: String(limit) });
    return api.get(`/search/global?${params}`);
  },
  getSuggestions: (query, limit = 10) => api.get(`/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`),
  getRecent: () => api.get('/search/recent'),
  saveRecent: (query) => api.post('/search/recent', { query })
};

/**
 * Database browser API methods
 */
export const dbBrowserApi = {
  getTables: () => api.get('/db/tables'),
  getTableData: (table, page = 1, pageSize = 25) => api.get(`/db/tables/${table}/data?page=${page}&pageSize=${pageSize}`),
  executeQuery: (query) => api.post('/db/query', { query }),
  getTableSchema: (table) => api.get(`/db/tables/${table}/schema`)
};

/**
 * Git API methods
 * Phase 5.2: Response validation enabled
 */
export const gitApi = {
  getStatus: validated((project) => api.get(`/git/${encodeURIComponent(project)}/status`), gitStatusSchema, 'gitApi.getStatus'),
  getBranches: validated((project) => api.get(`/git/${encodeURIComponent(project)}/branches`), gitBranchesSchema, 'gitApi.getBranches'),
  getLog: validated((project, limit = 20) => api.get(`/git/${encodeURIComponent(project)}/log?limit=${limit}`), gitCommitsSchema, 'gitApi.getLog'),
  commit: (project, message, files) => api.post(`/git/${encodeURIComponent(project)}/commit`, { message, files }),
  push: (project) => api.post(`/git/${encodeURIComponent(project)}/push`),
  pull: (project) => api.post(`/git/${encodeURIComponent(project)}/pull`),
  checkout: (project, branch) => api.post(`/git/${encodeURIComponent(project)}/checkout`, { branch })
};

/**
 * Dependencies API methods
 */
export const dependenciesApi = {
  list: (projectPath) => api.get(`/dependencies/${encodeURIComponent(projectPath)}`),
  update: (projectPath, packageName) => api.post('/dependencies/update', { projectPath, packageName }),
  updateAll: (projectPath) => api.post('/dependencies/update-all', { projectPath }),
  auditFix: (projectPath) => api.post('/dependencies/audit-fix', { projectPath })
};

/**
 * Authentik SSO API methods
 */
export const authentikApi = {
  getStatus: () => api.get('/admin-users/authentik/status'),
  getSettings: () => api.get('/admin-users/authentik/settings'),
  saveSettings: (settings) => api.post('/admin-users/authentik/settings', settings),
  listUsers: (search = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return api.get(`/admin-users/authentik/users?${params}`);
  },
  createUser: (userData) => api.post('/admin-users/authentik/users', userData),
  listGroups: () => api.get('/admin-users/authentik/groups'),
};

/**
 * Server API methods (logs, services)
 */
export const serverApi = {
  getLogs: (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.unit) params.append('unit', filter.unit);
    if (filter.priority) params.append('priority', filter.priority);
    params.append('lines', filter.lines || 100);
    return api.get(`/server/logs?${params}`);
  },
  getServices: () => api.get('/server/services'),
};

/**
 * Extended Infrastructure API methods
 */
export const infraExtendedApi = {
  // Network
  getNetworkInterfaces: () => api.get('/infra/network/interfaces'),
  getNetworkConnections: () => api.get('/infra/network/connections'),
  ping: (host) => api.post('/infra/network/ping', { host }),
  dnsLookup: (host) => api.post('/infra/network/dns', { host }),

  // Packages
  getPackages: () => api.get('/infra/packages'),
  getPackageUpdates: () => api.get('/infra/packages/updates'),
  searchPackages: (query) => api.get(`/infra/packages/search?q=${encodeURIComponent(query)}`),
  installPackage: (packageName) => api.post('/infra/packages/install', { package: packageName }),
  upgradeAllPackages: () => api.post('/infra/packages/upgrade-all'),

  // Processes
  getProcesses: (sort = 'cpu') => api.get(`/infra/processes?sort=${sort}`),
  killProcess: (pid, signal = 'SIGTERM') => api.post(`/infra/processes/${pid}/kill`, { signal }),

  // Scheduled tasks
  getCronJobs: () => api.get('/infra/scheduled/cron'),
  getSystemdTimers: () => api.get('/infra/scheduled/timers'),
  addCronJob: (schedule, command) => api.post('/infra/scheduled/cron', { schedule, command }),
  deleteCronJob: (index) => api.delete(`/infra/scheduled/cron/${index}`),
  toggleTimer: (timerName) => api.post(`/infra/scheduled/timers/${timerName}/toggle`),

  // Security
  getFail2banStatus: () => api.get('/infra/security/fail2ban/status'),
  getSshSessions: () => api.get('/infra/security/ssh/sessions'),
  getSshFailedAttempts: () => api.get('/infra/security/ssh/failed'),
  getSshKeys: () => api.get('/infra/security/ssh/keys'),
  getOpenPorts: () => api.get('/infra/security/ports'),
  getLastLogins: () => api.get('/infra/security/last-logins'),
  unbanIp: (jail, ip) => api.post(`/infra/security/fail2ban/${jail}/unban`, { ip }),
};

/**
 * Stack (Sovereign Stack) API methods
 */
export const stackApi = {
  getServices: () => api.get('/stack/services'),
  getHealth: () => api.get('/stack/health'),
  restartService: (serviceId) => api.post(`/stack/services/${serviceId}/restart`),
};

/**
 * Server Users API methods (Linux users/groups)
 */
export const serverUsersApi = {
  listUsers: () => api.get('/admin-users/server/users'),
  listGroups: () => api.get('/admin-users/server/groups'),
  listShells: () => api.get('/admin-users/server/shells'),
  createUser: (userData) => api.post('/admin-users/server/users', userData),
  deleteUser: (username) => api.delete(`/admin-users/server/users/${username}`),
};

/**
 * Extended Firewall API methods
 */
export const firewallExtendedApi = {
  getStatus: () => api.get('/admin-users/firewall/status'),
  getLogs: () => api.get('/admin-users/firewall/logs'),
  getProjectPorts: () => api.get('/admin-users/firewall/project-ports'),
  enableFirewall: () => api.post('/admin-users/firewall/enable'),
  disableFirewall: () => api.post('/admin-users/firewall/disable'),
  addRule: (rule) => api.post('/admin-users/firewall/rules', rule),
  deleteRule: (ruleNumber) => api.delete(`/admin-users/firewall/rules/${ruleNumber}`),
  syncProjectPorts: () => api.post('/admin-users/firewall/sync-projects'),
};

/**
 * Admin API methods
 */
export const adminApi = {
  getHistory: (limit = 50) => api.get(`/admin/history?limit=${limit}`),
  getProjectsExtended: () => api.get('/admin/projects-extended'),
  getClaudeMd: (project) => api.get(`/admin/claude-md/${encodeURIComponent(project)}`),
  updateClaudeMd: (project, content) => api.put(`/admin/claude-md/${encodeURIComponent(project)}`, { content }),
};

/**
 * AI API methods (usage tracking, cost estimation)
 * Phase 5.2: Response validation enabled
 */
export const aiApi = {
  getUsage: validated((params = {}) => {
    const query = new URLSearchParams();
    if (params.sessionId) query.set('sessionId', params.sessionId);
    if (params.projectId) query.set('projectId', params.projectId);
    if (params.range) query.set('range', params.range);
    return api.get(`/ai/usage?${query}`);
  }, aiUsageSchema, 'aiApi.getUsage'),
};

/**
 * Marketplace API methods
 */
export const marketplaceApi = {
  getAgents: () => api.get('/marketplace/agents'),
  getCategories: () => api.get('/marketplace/categories'),
  getStats: () => api.get('/marketplace/stats'),
  installAgent: (id, config = {}) => api.post(`/marketplace/agents/${id}/install`, { config }),
  uninstallAgent: (id) => api.delete(`/marketplace/agents/${id}/uninstall`),
};

/**
 * Files API methods
 */
export const filesApi = {
  list: (path) => api.get(`/files/${encodeURIComponent(path)}`),
  get: (path) => api.get(`/files/content/${encodeURIComponent(path)}`),
  create: (path, content) => api.post('/files', { path, content }),
  update: (path, content) => api.put(`/files/${encodeURIComponent(path)}`, { content }),
  delete: (path) => api.delete(`/files/${encodeURIComponent(path)}`),
};

/**
 * MCP Server Catalog API methods
 */
export const mcpCatalogApi = {
  getCatalog: () => api.get('/mcp/catalog'),
  getInstalled: () => api.get('/mcp/catalog/installed'),
  install: (serverId, config = {}) => api.post(`/mcp/catalog/install/${serverId}`, config),
};

/**
 * Lifecycle API methods (security scanning, tools)
 */
export const lifecycleApi = {
  getToolsStatus: () => api.get('/lifecycle/tools/status'),
  installTool: (tool, command) => api.post('/lifecycle/tools/install', { tool, command }),
  runScan: (agent, command, project) => api.post('/lifecycle/scan', { agent, command, project }),
};

/**
 * Extended Agents API methods (runner status, metadata)
 */
export const agentsExtendedApi = {
  list: () => api.get('/agents'),
  get: (id) => api.get(`/agents/${id}`),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  run: (id) => api.post(`/agents/${id}/run`),
  stop: (id) => api.post(`/agents/${id}/stop`),
  toggle: (id) => api.post(`/agents/${id}/toggle`),
  getRunnerStatus: () => api.get('/agents/status/runner'),
  getTriggerTypes: () => api.get('/agents/meta/triggers'),
  getActionTypes: () => api.get('/agents/meta/actions'),
};

/**
 * Proxy API methods (for API tester)
 */
export const proxyApi = {
  request: (url, method, headers, body) => api.post('/proxy', { url, method, headers, body }),
};

/**
 * Logs API methods
 */
export const logsApi = {
  get: (path, lines = 1000) => api.get(`/logs/${encodeURIComponent(path)}?lines=${lines}`),
};

/**
 * Backups API methods
 */
export const backupsApi = {
  list: (projectPath) => api.get(`/backups/${encodeURIComponent(projectPath)}`),
  create: (projectPath, data) => api.post(`/backups/${encodeURIComponent(projectPath)}`, data),
  restore: (projectPath, backupId) => api.post(`/backups/${encodeURIComponent(projectPath)}/${backupId}/restore`),
  delete: (projectPath, backupId) => api.delete(`/backups/${encodeURIComponent(projectPath)}/${backupId}`),
  saveSchedule: (projectPath, schedule) => api.put(`/backups/${encodeURIComponent(projectPath)}/schedule`, schedule),
};

/**
 * Share API methods
 */
export const shareApi = {
  createSession: (data) => api.post('/share/session', data),
  revokeSession: (shareId) => api.delete(`/share/session/${encodeURIComponent(shareId)}`),
};

/**
 * Team API methods
 */
export const teamApi = {
  listMembers: () => api.get('/team/members'),
};

/**
 * Session handoff (extends sessionsApi)
 */
export const sessionHandoffApi = {
  handoff: (sessionId, data) => api.post(`/sessions/${sessionId}/handoff`, data),
};

/**
 * Uptime API methods
 */
export const uptimeApi = {
  getServices: () => api.get('/uptime'),
};

/**
 * Project Templates/Compliance API methods
 */
export const projectTemplatesApi = {
  checkPath: (projectPath) => api.post('/project-templates/check-path', { projectPath }),
  migrate: (projectPath, options) => api.post('/project-templates/migrate', { projectPath, options }),
};

/**
 * Status Page API methods
 */
export const statusApi = {
  getStatus: () => api.get('/status'),
};

/**
 * Ports API methods
 */
export const portsApi = {
  getStatus: () => api.get('/ports/status'),
  scan: (start, end) => api.get(`/ports/scan?start=${start}&end=${end}`),
  suggest: (base) => api.get(`/ports/suggest?base=${base}`),
  check: (port) => api.get(`/ports/check/${port}`),
  kill: (pid) => api.post(`/ports/kill/${pid}`),
};

/**
 * Session History API methods
 */
export const sessionHistoryApi = {
  getHistory: (sessionId) => api.get(`/sessions/${sessionId}/history`),
};

/**
 * Comments API methods
 */
export const commentsApi = {
  list: (sessionId, line) => api.get(`/sessions/${sessionId}/comments?line=${line}`),
  getCounts: (sessionId) => api.get(`/sessions/${sessionId}/comments/counts`),
  create: (sessionId, data) => api.post(`/sessions/${sessionId}/comments`, data),
  delete: (sessionId, commentId) => api.delete(`/sessions/${sessionId}/comments/${commentId}`),
};

/**
 * AI Costs API methods
 */
export const aiCostsApi = {
  getCosts: (range = '7d') => api.get(`/ai/costs?range=${range}`),
};

/**
 * Commands API methods
 */
export const commandsApi = {
  getHistory: () => api.get('/commands/history'),
};

/**
 * Network API methods
 */
export const networkApi = {
  getStats: () => api.get('/network'),
};

/**
 * Docker Extended API methods (container stats)
 */
export const dockerStatsApi = {
  getContainerStats: () => api.get('/docker/containers/stats'),
};

/**
 * Tests API methods
 */
export const testsApi = {
  run: (projectPath, testName) => api.post('/tests/run', { projectPath, testName }),
};

/**
 * Files Content API methods
 */
export const filesContentApi = {
  getContent: (filePath) => api.get(`/files/${encodeURIComponent(filePath)}/content`),
};

/**
 * GitHub API methods
 * Phase 5.2: Response validation enabled
 */
export const githubApi = {
  getAuthStatus: () => api.get('/github/auth'),
  authenticate: (accessToken) => api.post('/github/auth', { accessToken }),
  disconnect: () => api.delete('/github/auth'),
  getRepos: validated((page = 1, perPage = 30) => api.get(`/github/repos?page=${page}&per_page=${perPage}`), githubReposSchema, 'githubApi.getRepos'),
  searchRepos: (query, page = 1) => api.get(`/github/repos/search?q=${encodeURIComponent(query)}&page=${page}`),
  cloneRepo: (owner, repo) => api.post('/github/clone', { owner, repo }),
};

/**
 * Browser Session API methods
 */
export const browserApi = {
  createSession: (data) => api.post('/browser', data),
  navigate: (sessionId, url) => api.post(`/browser/${sessionId}/navigate`, { url }),
  updateSession: (sessionId, data) => api.put(`/browser/${sessionId}`, data),
  closeSession: (sessionId) => api.post(`/browser/${sessionId}/close`),
  getScreenshots: (sessionId) => api.get(`/browser/${sessionId}/screenshots`),
  saveScreenshot: (sessionId, data) => api.post(`/browser/${sessionId}/screenshots`, data),
  saveConsoleLogs: (sessionId, logs) => api.post(`/browser/${sessionId}/console`, { logs }),
};

/**
 * MCP Server API methods
 */
export const mcpApi = {
  getAllTools: () => api.get('/mcp/tools/all'),
  callTool: (serverId, toolName, args) => api.post(`/mcp/${serverId}/tools/${toolName}/call`, { args }),
};

/**
 * Aider AI API methods
 * Phase 5.2: Response validation enabled
 */
export const aiderApi = {
  getStatus: validated(() => api.get('/aider/status'), aiderStatusSchema, 'aiderApi.getStatus'),
  getModels: () => api.get('/aider/models'),
  getConfig: () => api.get('/aider/config'),
  createSession: (data) => api.post('/aider/sessions', data),
  deleteSession: (sessionId) => api.delete(`/aider/sessions/${sessionId}`),
  sendInput: (sessionId, input) => api.post(`/aider/sessions/${sessionId}/input`, { input }),
  toggleVoice: (sessionId, action) => api.post(`/aider/sessions/${sessionId}/voice/${action}`),
};

/**
 * Memory Bank API methods
 */
export const memoryApi = {
  list: (params) => api.get(`/memory?${params.toString()}`),
  getStats: (projectId) => api.get(`/memory/stats/overview${projectId ? `?projectId=${projectId}` : ''}`),
  create: (data) => api.post('/memory', data),
  update: (id, data) => api.put(`/memory/${id}`, data),
  delete: (id) => api.delete(`/memory/${id}`),
};

/**
 * Alerts API methods
 */
export const alertsApi = {
  list: () => api.get('/alerts'),
  create: (rule) => api.post('/alerts', rule),
  update: (id, rule) => api.put(`/alerts/${id}`, rule),
  delete: (id) => api.delete(`/alerts/${id}`),
};

/**
 * MCP Servers API methods (extended)
 * Phase 5.2: Response validation enabled
 */
export const mcpServersApi = {
  list: validated(() => api.get('/mcp'), mcpServersSchema, 'mcpServersApi.list'),
  create: (serverData) => api.post('/mcp', serverData),
  update: (id, serverData) => api.put(`/mcp/${id}`, serverData),
  delete: (id) => api.delete(`/mcp/${id}`),
  action: (id, action) => api.post(`/mcp/${id}/${action}`),
};

/**
 * Claude Flow API methods (experimental)
 */
export const claudeFlowApi = {
  getStatus: () => api.get('/claude-flow/status'),
  getRoles: () => api.get('/claude-flow/roles'),
  getTemplates: () => api.get('/claude-flow/templates'),
  getSwarms: () => api.get('/claude-flow/swarms'),
  install: (options) => api.post('/claude-flow/install', options),
  createSwarm: (data) => api.post('/claude-flow/swarms', data),
  deleteSwarm: (id) => api.delete(`/claude-flow/swarms/${id}`),
  sendTask: (id, task) => api.post(`/claude-flow/swarms/${id}/task`, { task }),
};

/**
 * Tabby API methods
 * Phase 5.2: Response validation enabled
 */
export const tabbyApi = {
  getStatus: validated(() => api.get('/tabby/status'), tabbyStatusSchema, 'tabbyApi.getStatus'),
  getModels: () => api.get('/tabby/models'),
  getConfig: () => api.get('/tabby/config'),
  saveConfig: (config) => api.put('/tabby/config', config),
  getLogs: (tail = 100) => api.get(`/tabby/logs?tail=${tail}`),
  getIdeConfig: () => api.get('/tabby/ide-config'),
  start: (config) => api.post('/tabby/start', config),
  stop: () => api.post('/tabby/stop'),
  restart: () => api.post('/tabby/restart'),
  pull: (options) => api.post('/tabby/pull', options),
  test: (code) => api.post('/tabby/test', { code }),
};

/**
 * Checkpoints API methods
 */
export const checkpointsApi = {
  getByProject: (projectId, limit = 50) => api.get(`/checkpoints/project/${projectId}?limit=${limit}`),
  getStats: (projectId) => api.get(`/checkpoints/project/${projectId}/stats`),
  create: (data) => api.post('/checkpoints', data),
  update: (id, data) => api.put(`/checkpoints/${id}`, data),
  delete: (id) => api.delete(`/checkpoints/${id}`),
  restore: (id, options) => api.post(`/checkpoints/${id}/restore`, options),
  cleanup: () => api.post('/checkpoints/cleanup'),
};

/**
 * Code Puppy API methods
 * Phase 5.1: Centralized API for Code Puppy AI assistant
 * Phase 5.2: Response validation enabled
 */
export const codePuppyApi = {
  // Status & Info
  getStatus: validated(() => api.get('/code-puppy/status'), codePuppyStatusSchema, 'codePuppyApi.getStatus'),
  getProviders: () => api.get('/code-puppy/providers'),
  getTools: () => api.get('/code-puppy/tools'),
  getCommands: () => api.get('/code-puppy/commands'),

  // Sessions
  getSessions: () => api.get('/code-puppy/sessions'),
  createSession: (data) => api.post('/code-puppy/sessions', data),
  stopSession: (sessionId) => api.post(`/code-puppy/sessions/${sessionId}/stop`),
  deleteSession: (sessionId) => api.delete(`/code-puppy/sessions/${sessionId}`),
  sendInput: (sessionId, input) => api.post(`/code-puppy/sessions/${sessionId}/input`, { input }),

  // Agents
  getAgents: () => api.get('/code-puppy/agents'),
  createAgent: (data) => api.post('/code-puppy/agents', data),
  deleteAgent: (agentName) => api.delete(`/code-puppy/agents/${agentName}`),

  // Config
  getConfig: () => api.get('/code-puppy/config'),
  updateConfig: (key, value) => api.put(`/code-puppy/config/${key}`, { value }),

  // MCP Servers
  getMcpServers: () => api.get('/code-puppy/mcp'),
  addMcpServer: (name, command, args) => api.post('/code-puppy/mcp', { name, command, args }),
  removeMcpServer: (name) => api.delete(`/code-puppy/mcp/${name}`),
  getClaudeConfig: () => api.get('/code-puppy/mcp/claude-config'),
  syncFromClaude: (mode = 'merge') => api.post('/code-puppy/mcp/sync-claude', { mode }),
};

/**
 * Environment Files API methods
 * Phase 5.1: Centralized API for .env file management
 */
export const envApi = {
  getFiles: (projectPath) => api.get(`/env/files/${encodeURIComponent(projectPath || '')}`),
  getVariables: (projectPath, fileName) => api.get(`/env/variables/${encodeURIComponent(projectPath || '')}/${encodeURIComponent(fileName)}`),
  compare: (projectPath, source, target) => api.get(`/env/compare/${encodeURIComponent(projectPath || '')}?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`),
  save: (projectPath, fileName, variables) => api.post(`/env/save/${encodeURIComponent(projectPath || '')}/${encodeURIComponent(fileName)}`, { variables }),
  sync: (projectPath, source, target) => api.post(`/env/sync/${encodeURIComponent(projectPath || '')}`, { source, target }),
  generateExample: (projectPath, source) => api.post(`/env/generate-example/${encodeURIComponent(projectPath || '')}`, { source }),
};

/**
 * Project Tags API methods
 * Phase 5.1: Centralized API for project tag management
 */
export const projectTagsApi = {
  list: () => api.get('/project-tags'),
  create: (data) => api.post('/project-tags', data),
  getProjectTags: (encodedPath) => api.get(`/projects/by-path/${encodedPath}/tags`),
  addToProject: (encodedPath, tagId) => api.post(`/projects/by-path/${encodedPath}/tags/${tagId}`),
  removeFromProject: (encodedPath, tagId) => api.delete(`/projects/by-path/${encodedPath}/tags/${tagId}`),
};

/**
 * Extended Cloudflare API methods (port updates, project restarts)
 * Phase 5.1: Additional methods for CloudflarePublishPanel
 */
export const cloudflareExtendedApi = {
  updateClaudeMdPort: (project, port) => api.put(`/admin/claude-md/${encodeURIComponent(project)}/port`, { port }),
  restartProject: (project) => api.post(`/projects/${encodeURIComponent(project)}/restart`),
};

/**
 * Observability API methods (Jaeger, Loki, Promtail)
 * Phase 5.1: Centralized API for observability stack
 */
export const observabilityApi = {
  // Stack management
  getStackStatus: () => api.get('/observability/stack/status'),
  stackAction: (action) => api.post(`/observability/stack/${action}`),

  // Jaeger traces
  getServices: () => api.get('/observability/services'),
  getOperations: (service) => api.get(`/observability/operations/${encodeURIComponent(service)}`),
  searchTraces: (params) => {
    const query = new URLSearchParams(params);
    return api.get(`/observability/traces?${query}`);
  },

  // Loki logs
  getLabels: () => api.get('/observability/loki/labels'),
  queryLogs: (query, limit = 100) => {
    const params = new URLSearchParams({ query, limit: String(limit) });
    return api.get(`/observability/loki/query?${params}`);
  },
};

/**
 * Plans API methods
 * Phase 5.1: Centralized API for plan management
 */
export const plansApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.projectId) query.set('projectId', params.projectId);
    if (params.sessionId) query.set('sessionId', params.sessionId);
    return api.get(`/plans?${query}`);
  },
  get: (id) => api.get(`/plans/${id}`),
  getDiagram: (id) => api.get(`/plans/${id}/diagram`),
  create: (data) => api.post('/plans', data),
  updateStep: (planId, stepId, data) => api.put(`/plans/${planId}/steps/${stepId}`, data),
  execute: (id) => api.post(`/plans/${id}/execute`),
  action: (id, action) => api.post(`/plans/${id}/${action}`),
};

/**
 * Projects Extended API methods
 * Phase 5.1: Centralized API for project creation and management
 */
export const projectsExtendedApi = {
  list: () => api.get('/projects-extended'),
  create: (data) => api.post('/projects', data),
  createGitHubRepo: (projectName, data) => api.post(`/github/projects/${encodeURIComponent(projectName)}/create`, data),
};

/**
 * GitHub Extended API methods
 * Phase 5.1: Additional GitHub methods
 */
export const githubExtendedApi = {
  getSettings: () => api.get('/github/settings'),
};

/**
 * System Version API methods
 * Phase 5.1: System version and update management
 */
export const systemVersionApi = {
  getVersion: () => api.get('/system/version'),
  triggerUpdate: () => api.post('/system/update'),
};

/**
 * Shortcuts API methods
 * Phase 5.1: Keyboard shortcuts management
 */
export const shortcutsApi = {
  list: () => api.get('/shortcuts'),
  update: (action, keys) => api.put(`/shortcuts/${action}`, { keys }),
  reset: (action) => api.delete(`/shortcuts/${action}`),
  resetAll: () => api.post('/shortcuts/reset-all'),
};

/**
 * AI Personas API methods
 * Phase 5.1: AI persona management
 */
export const personasApi = {
  list: () => api.get('/ai/personas'),
  create: (persona) => api.post('/ai/personas', persona),
  update: (id, persona) => api.put(`/ai/personas/${id}`, persona),
  delete: (id) => api.delete(`/ai/personas/${id}`),
};

/**
 * Config API methods
 * Phase 5.1: Server configuration
 */
export const configApi = {
  get: () => api.get('/config'),
};

/**
 * Authentik Settings API methods
 * Phase 5.1: Authentik SSO settings through Cloudflare route
 */
export const authentikSettingsApi = {
  get: () => api.get('/cloudflare/authentik/settings'),
  save: (settings) => api.post('/cloudflare/authentik/settings', settings),
};

/**
 * Lifecycle Extended API methods
 * Phase 5.1: Security scanning settings and queue management
 */
export const lifecycleExtendedApi = {
  getSettings: () => api.get('/lifecycle/settings'),
  reloadSettings: () => api.post('/lifecycle/settings/reload'),
  getRecommendations: () => api.get('/lifecycle/recommendations'),
  getQueue: () => api.get('/lifecycle/queue'),
  cancelQueue: () => api.post('/lifecycle/queue/cancel'),
};

/**
 * Voice API methods
 * Phase 5.1: Voice command interface
 */
export const voiceApi = {
  getSettings: () => api.get('/voice/settings'),
  updateSettings: (settings) => api.put('/voice/settings', settings),
  process: (data) => api.post('/voice/process', data),
  execute: (data) => api.post('/voice/execute', data),
};

/**
 * Project Context API methods
 * Phase 5.1: Project settings, notes, and context management
 */
export const projectContextApi = {
  // Settings
  getSettings: (encodedPath) => api.get(`/projects/by-path/${encodedPath}/settings`),
  updateSettings: (encodedPath, updates) => api.patch(`/projects/by-path/${encodedPath}/settings`, updates),

  // Notes
  getNotes: (encodedPath) => api.get(`/projects/by-path/${encodedPath}/notes`),
  createNote: (encodedPath, data) => api.post(`/projects/by-path/${encodedPath}/notes`, data),
  updateNote: (noteId, data) => api.put(`/projects/notes/${noteId}`, data),
  deleteNote: (noteId) => api.delete(`/projects/notes/${noteId}`),

  // Stats
  getStats: (path) => api.get(`/admin/project-stats?path=${encodeURIComponent(path)}`),

  // Clone
  clone: (data) => api.post('/projects/clone', data),
};

/**
 * GitHub Projects API methods
 * Phase 5.1: GitHub project management (per-project operations)
 */
export const githubProjectsApi = {
  get: (projectName) => api.get(`/github/projects/${encodeURIComponent(projectName)}`),
  getRuns: (projectName, perPage = 5) => api.get(`/github/projects/${encodeURIComponent(projectName)}/runs?per_page=${perPage}`),
  push: (projectName) => api.post(`/github/projects/${encodeURIComponent(projectName)}/push`),
  pull: (projectName) => api.post(`/github/projects/${encodeURIComponent(projectName)}/pull`),
  fetch: (projectName) => api.post(`/github/projects/${encodeURIComponent(projectName)}/fetch`),
  create: (projectName, data) => api.post(`/github/projects/${encodeURIComponent(projectName)}/create`, data),
  unlink: (projectName) => api.delete(`/github/projects/${encodeURIComponent(projectName)}`),
};

/**
 * Metrics API methods
 * Phase 5.1: Resource metrics (CPU, memory, disk)
 */
export const metricsApi = {
  get: (metric, minutes = 60) => api.get(`/metrics/${metric}?minutes=${minutes}`),
};

/**
 * Project Contexts API methods
 * Phase 5.1: Project context management (files, snippets, notes)
 */
export const projectContextsApi = {
  list: (projectName) => api.get(`/projects/${encodeURIComponent(projectName)}/contexts`),
  create: (projectName, data) => api.post(`/projects/${encodeURIComponent(projectName)}/contexts`, data),
  delete: (projectName, contextId) => api.delete(`/projects/${encodeURIComponent(projectName)}/contexts/${contextId}`),
};

/**
 * Scheduled Tasks API methods
 * Phase 5.1: Cron job scheduling
 */
export const scheduledTasksApi = {
  list: () => api.get('/workflows/scheduled'),
  create: (data) => api.post('/workflows/scheduled', data),
  update: (id, data) => api.put(`/workflows/scheduled/${id}`, data),
  delete: (id) => api.delete(`/workflows/scheduled/${id}`),
  run: (id) => api.post(`/workflows/scheduled/${id}/run`),
};

/**
 * Agent Executions API methods
 * Phase 5.1: Agent execution history with pagination
 */
export const agentExecutionsApi = {
  list: (agentId, page = 1, limit = 50) => api.get(`/agents/${agentId}?page=${page}&limit=${limit}`),
};

/**
 * Diff API methods
 * Phase 5.1: Git diff visualization
 */
export const diffApi = {
  get: (projectPath, commitHash = null) => {
    const url = commitHash
      ? `/diff/${encodeURIComponent(projectPath)}?commit=${commitHash}`
      : `/diff/${encodeURIComponent(projectPath)}`;
    return api.get(url);
  },
};

/**
 * Notes API methods
 * Phase 5.1: Session notes management
 */
export const notesApi = {
  list: (projectPath) => api.get(`/notes?projectPath=${encodeURIComponent(projectPath)}`),
  create: (sessionId, content) => api.post('/notes', { sessionId, content }),
  update: (noteId, sessionId, content) => api.put(`/notes/${noteId}`, { sessionId, content }),
  delete: (noteId) => api.delete(`/notes/${noteId}`),
};

/**
 * Sessions Persisted API methods
 * Phase 5.1: Persisted session management for auto-reconnect
 */
export const sessionsPersistedApi = {
  list: () => api.get('/sessions/persisted'),
};

/**
 * Audit Logs API methods
 * Phase 4: Enterprise Mission Control - Audit logging
 */
export const auditApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.userId) query.set('userId', params.userId);
    if (params.action) query.set('action', params.action);
    if (params.resource) query.set('resource', params.resource);
    if (params.resourceId) query.set('resourceId', params.resourceId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);
    return api.get(`/audit-logs?${query}`);
  },
  get: (id) => api.get(`/audit-logs/${id}`),
  getStats: (days = 7) => api.get(`/audit-logs/stats?days=${days}`),
  getByUser: (userId, params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    return api.get(`/audit-logs/user/${encodeURIComponent(userId)}?${query}`);
  },
  getByResource: (resource, resourceId, params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    return api.get(`/audit-logs/resource/${encodeURIComponent(resource)}/${encodeURIComponent(resourceId)}?${query}`);
  },
  exportCsv: (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.action) query.set('action', params.action);
    if (params.resource) query.set('resource', params.resource);
    return api.get(`/audit-logs/export/csv?${query}`, { responseType: 'blob' });
  },
  purge: (olderThanDays = 90) => api.delete(`/audit-logs/purge?olderThanDays=${olderThanDays}`),
};

/**
 * Quotas & API Keys API methods
 * Phase 5: Enterprise Mission Control - Resource quotas and API key management
 */
export const quotasApi = {
  // User quota info
  getMyQuota: () => api.get('/quotas/me'),

  // Admin quota management
  listQuotas: () => api.get('/quotas'),
  getUserQuota: (userId) => api.get(`/quotas/user/${encodeURIComponent(userId)}`),
  setUserQuota: (userId, quota) => api.put(`/quotas/user/${encodeURIComponent(userId)}`, quota),
  deleteUserQuota: (userId) => api.delete(`/quotas/user/${encodeURIComponent(userId)}`),
  setRoleQuota: (role, quota) => api.put(`/quotas/role/${encodeURIComponent(role)}`, quota),

  // API Key management
  listApiKeys: () => api.get('/quotas/api-keys'),
  createApiKey: (data) => api.post('/quotas/api-keys', data),
  updateApiKey: (id, data) => api.put(`/quotas/api-keys/${id}`, data),
  revokeApiKey: (id) => api.delete(`/quotas/api-keys/${id}`),

  // Admin API key management
  adminListApiKeys: (includeRevoked = false) => api.get(`/quotas/admin/api-keys?includeRevoked=${includeRevoked}`),
};

export default api;

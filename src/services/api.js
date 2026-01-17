/**
 * Centralized API Service
 * Provides a standardized interface for all API calls with:
 * - Consistent error handling
 * - Request/response logging
 * - Automatic retry logic
 * - Response type validation
 * - Request cancellation support
 * - Authentication header injection
 * - Sentry error tracking with request IDs
 */

import { captureException, addBreadcrumb, isSentryEnabled } from '../sentry.js';

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
// DOMAIN-SPECIFIC API METHODS
// ============================================

/**
 * Project-related API methods
 */
export const projectsApi = {
  list: () => api.get('/projects'),
  listExtended: () => api.get('/admin/projects-extended'),
  get: (id) => api.get(`/projects/${encodeURIComponent(id)}`),
  getClaudeMd: (project) => api.get(`/admin/claude-md/${encodeURIComponent(project)}`),
  updateClaudeMd: (project, content) => api.put(`/admin/claude-md/${encodeURIComponent(project)}`, { content }),
  getStats: (project) => api.get(`/projects/${encodeURIComponent(project)}/stats`),
  favorite: (id) => api.post(`/projects/${encodeURIComponent(id)}/favorite`),
  unfavorite: (id) => api.delete(`/projects/${encodeURIComponent(id)}/favorite`)
};

/**
 * System/Admin API methods
 */
export const systemApi = {
  getStats: () => api.get('/admin/system'),
  getDashboard: () => api.get('/dashboard'),
  getSettings: () => api.get('/settings'),
  updateSettings: (settings) => api.put('/settings', settings),
  getHealth: () => api.get('/health')
};

/**
 * Docker API methods
 */
export const dockerApi = {
  listContainers: (all = true) => api.get(`/docker/containers?all=${all}`),
  listImages: () => api.get('/docker/images'),
  listVolumes: () => api.get('/docker/volumes'),
  startContainer: (id) => api.post(`/docker/containers/${id}/start`),
  stopContainer: (id) => api.post(`/docker/containers/${id}/stop`),
  restartContainer: (id) => api.post(`/docker/containers/${id}/restart`),
  getContainerLogs: (id, tail = 100) => api.get(`/docker/containers/${id}/logs?tail=${tail}`),
  getContainerStats: (id) => api.get(`/docker/containers/${id}/stats`)
};

/**
 * Infrastructure API methods
 */
export const infraApi = {
  getServices: () => api.get('/server/services'),
  getProcesses: () => api.get('/infra/processes'),
  getNetworkInterfaces: () => api.get('/infra/network/interfaces'),
  ping: (host, count = 4) => api.post('/infra/network/ping', { host, count }),
  dnsLookup: (host, type = 'A') => api.post('/infra/network/dns', { host, type }),
  portCheck: (host, port) => api.post('/infra/network/port-check', { host, port }),
  getPackages: (search, limit = 100) => api.get(`/infra/packages?search=${search}&limit=${limit}`),
  getSecurityStatus: () => api.get('/infra/security/fail2ban')
};

/**
 * Firewall API methods
 */
export const firewallApi = {
  getStatus: () => api.get('/admin-users/firewall/status'),
  getRules: () => api.get('/admin-users/firewall/rules'),
  addRule: (rule) => api.post('/admin-users/firewall/rules', rule),
  deleteRule: (number) => api.delete(`/admin-users/firewall/rules/${number}`),
  enable: () => api.post('/admin-users/firewall/enable'),
  disable: () => api.post('/admin-users/firewall/disable'),
  setDefault: (direction, policy) => api.post('/admin-users/firewall/default', { direction, policy }),
  setLogging: (level) => api.post('/admin-users/firewall/logging', { level })
};

/**
 * Sessions API methods
 */
export const sessionsApi = {
  list: () => api.get('/sessions'),
  get: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  getFolders: () => api.get('/folders'),
  getTags: () => api.get('/tags')
};

/**
 * Prompts API methods
 */
export const promptsApi = {
  list: () => api.get('/prompts'),
  get: (id) => api.get(`/prompts/${id}`),
  create: (data) => api.post('/prompts', data),
  update: (id, data) => api.put(`/prompts/${id}`, data),
  delete: (id) => api.delete(`/prompts/${id}`)
};

/**
 * Snippets API methods
 */
export const snippetsApi = {
  list: () => api.get('/snippets'),
  get: (id) => api.get(`/snippets/${id}`),
  create: (data) => api.post('/snippets', data),
  update: (id, data) => api.put(`/snippets/${id}`, data),
  delete: (id) => api.delete(`/snippets/${id}`)
};

/**
 * Cloudflare API methods
 */
export const cloudflareApi = {
  getSettings: () => api.get('/cloudflare/settings'),
  saveSettings: (settings) => api.post('/cloudflare/settings', settings),
  getTunnelStatus: () => api.get('/cloudflare/tunnel/status'),
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
 */
export const agentsApi = {
  list: () => api.get('/agents'),
  get: (id) => api.get(`/agents/${id}`),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  run: (id) => api.post(`/agents/${id}/run`),
  stop: (id) => api.post(`/agents/${id}/stop`),
  toggle: (id) => api.post(`/agents/${id}/toggle`),
  getMarketplace: () => api.get('/marketplace/agents'),
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
 */
export const gitApi = {
  getStatus: (project) => api.get(`/git/${encodeURIComponent(project)}/status`),
  getBranches: (project) => api.get(`/git/${encodeURIComponent(project)}/branches`),
  getLog: (project, limit = 20) => api.get(`/git/${encodeURIComponent(project)}/log?limit=${limit}`),
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

export default api;

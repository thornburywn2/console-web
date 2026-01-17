/**
 * API Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Sentry before importing api
vi.mock('../sentry.js', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  isSentryEnabled: vi.fn(() => false),
}));

import api, { ApiError, cancelRequest, cancelAllRequests, projectsApi, systemApi } from './api';
import { captureException, addBreadcrumb } from '../sentry.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new ApiError('Test error', 500, { field: 'details' }, 'req-123');

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.details).toEqual({ field: 'details' });
      expect(error.requestId).toBe('req-123');
      expect(error.name).toBe('ApiError');
      expect(error.timestamp).toBeDefined();
    });

    it('should default details to null', () => {
      const error = new ApiError('Test', 400);
      expect(error.details).toBeNull();
    });
  });

  describe('error type checks', () => {
    it('isNetworkError returns true for status 0', () => {
      const error = new ApiError('Network error', 0);
      expect(error.isNetworkError()).toBe(true);
    });

    it('isNetworkError returns true for network error message', () => {
      const error = new ApiError('Network error', 500);
      expect(error.isNetworkError()).toBe(true);
    });

    it('isNetworkError returns false for other errors', () => {
      const error = new ApiError('Server error', 500);
      expect(error.isNetworkError()).toBe(false);
    });

    it('isAuthError returns true for 401', () => {
      const error = new ApiError('Unauthorized', 401);
      expect(error.isAuthError()).toBe(true);
    });

    it('isAuthError returns true for 403', () => {
      const error = new ApiError('Forbidden', 403);
      expect(error.isAuthError()).toBe(true);
    });

    it('isValidationError returns true for 400', () => {
      const error = new ApiError('Bad request', 400);
      expect(error.isValidationError()).toBe(true);
    });

    it('isRateLimitError returns true for 429', () => {
      const error = new ApiError('Too many requests', 429);
      expect(error.isRateLimitError()).toBe(true);
    });

    it('isServerError returns true for 5xx', () => {
      expect(new ApiError('Error', 500).isServerError()).toBe(true);
      expect(new ApiError('Error', 502).isServerError()).toBe(true);
      expect(new ApiError('Error', 503).isServerError()).toBe(true);
    });

    it('isServerError returns false for 4xx', () => {
      expect(new ApiError('Error', 400).isServerError()).toBe(false);
      expect(new ApiError('Error', 404).isServerError()).toBe(false);
    });
  });

  describe('getUserMessage', () => {
    it('returns network error message', () => {
      const error = new ApiError('Network error', 0);
      expect(error.getUserMessage()).toBe('Unable to connect to the server. Please check your connection.');
    });

    it('returns auth error message', () => {
      const error = new ApiError('Unauthorized', 401);
      expect(error.getUserMessage()).toBe('You are not authorized to perform this action.');
    });

    it('returns rate limit message', () => {
      const error = new ApiError('Rate limited', 429);
      expect(error.getUserMessage()).toBe('Too many requests. Please slow down and try again.');
    });

    it('returns server error message', () => {
      const error = new ApiError('Internal error', 500);
      expect(error.getUserMessage()).toBe('Server error. Please try again later.');
    });

    it('returns validation details if available', () => {
      const error = new ApiError('Bad request', 400, 'Email is invalid');
      expect(error.getUserMessage()).toBe('Email is invalid');
    });

    it('returns original message for other errors', () => {
      const error = new ApiError('Not found', 404);
      expect(error.getUserMessage()).toBe('Not found');
    });

    it('returns default message when no message', () => {
      const error = new ApiError('', 418);
      expect(error.getUserMessage()).toBe('An unexpected error occurred.');
    });
  });
});

describe('api methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cancelAllRequests();
  });

  const mockSuccessResponse = (data) => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });

  const mockErrorResponse = (status, error) => ({
    ok: false,
    status,
    statusText: 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve({ error }),
    text: () => Promise.resolve(error),
  });

  describe('api.get', () => {
    it('should make GET request to correct URL', async () => {
      const data = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce(mockSuccessResponse(data));

      const result = await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(data);
    });

    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(404, 'Not found'));

      try {
        await api.get('/missing');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(404);
      }
    });
  });

  describe('api.post', () => {
    it('should make POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ success: true }));
      const postData = { name: 'Test', value: 123 };

      await api.post('/create', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
    });
  });

  describe('api.put', () => {
    it('should make PUT request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ updated: true }));
      const putData = { id: 1, name: 'Updated' };

      await api.put('/update/1', putData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/update/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      );
    });
  });

  describe('api.patch', () => {
    it('should make PATCH request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ patched: true }));
      const patchData = { name: 'Patched' };

      await api.patch('/patch/1', patchData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/patch/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      );
    });
  });

  describe('api.delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ deleted: true }));

      await api.delete('/delete/1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/delete/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});

describe('request cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancelRequest returns false for non-existent request', () => {
    const result = cancelRequest('non-existent');
    expect(result).toBe(false);
  });

  it('cancelAllRequests clears all pending requests', () => {
    // This just tests that the function runs without error
    cancelAllRequests();
    // No active requests, so nothing to assert except no error thrown
  });
});

describe('domain-specific APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    });
  });

  describe('projectsApi', () => {
    it('list calls correct endpoint', async () => {
      await projectsApi.list();
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', expect.anything());
    });

    it('listExtended calls correct endpoint', async () => {
      await projectsApi.listExtended();
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/projects-extended', expect.anything());
    });

    it('get encodes project ID', async () => {
      await projectsApi.get('my project');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/my%20project', expect.anything());
    });

    it('getClaudeMd encodes project name', async () => {
      await projectsApi.getClaudeMd('test/project');
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/claude-md/test%2Fproject', expect.anything());
    });
  });

  describe('systemApi', () => {
    it('getStats calls correct endpoint', async () => {
      await systemApi.getStats();
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/system', expect.anything());
    });

    it('getDashboard calls correct endpoint', async () => {
      await systemApi.getDashboard();
      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard', expect.anything());
    });

    it('getSettings calls correct endpoint', async () => {
      await systemApi.getSettings();
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', expect.anything());
    });
  });
});

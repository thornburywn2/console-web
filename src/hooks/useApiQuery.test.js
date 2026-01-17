/**
 * useApiQuery Hook Tests
 * Phase 3.4: Unit tests for the API query hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApiQuery, useApiMutation, useApiQueries } from './useApiQuery';

// Mock the api module
vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message, status, details, requestId) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.details = details;
      this.requestId = requestId;
    }
    getUserMessage() {
      return this.message;
    }
  },
  cancelRequest: vi.fn(),
}));

import api, { ApiError } from '../services/api.js';

describe('useApiQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should fetch data on mount', async () => {
      const mockData = { id: 1, name: 'Test' };
      api.get.mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useApiQuery('/test-endpoint'));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
      expect(api.get).toHaveBeenCalledWith('/test-endpoint', {}, expect.any(Object));
    });

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(() => useApiQuery('/test-endpoint', { enabled: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe(null);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const mockError = new ApiError('Not found', 404, null, 'req-1');
      api.get.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useApiQuery('/test-endpoint'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.data).toBe(null);
      expect(result.current.isError).toBe(true);
      expect(result.current.errorMessage).toBe('Not found');
    });

    it('should use initial data before fetch', async () => {
      const initialData = { cached: true };
      const mockData = { id: 1, name: 'Fresh' };
      api.get.mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useApiQuery('/test-endpoint', { initialData })
      );

      // Initially has initial data
      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const mockData1 = { count: 1 };
      const mockData2 = { count: 2 };
      api.get.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() => useApiQuery('/test-endpoint'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Trigger refetch
      act(() => {
        result.current.refetch();
      });

      expect(result.current.isRefetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });

      expect(result.current.data).toEqual(mockData2);
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess callback', async () => {
      const mockData = { success: true };
      const onSuccess = vi.fn();
      api.get.mockResolvedValueOnce(mockData);

      renderHook(() => useApiQuery('/test-endpoint', { onSuccess }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });

    it('should call onError callback', async () => {
      const mockError = new ApiError('Server error', 500);
      const onError = vi.fn();
      api.get.mockRejectedValueOnce(mockError);

      renderHook(() => useApiQuery('/test-endpoint', { onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe('convenience getters', () => {
    it('should return correct convenience getters', async () => {
      api.get.mockResolvedValueOnce({ data: 'test' });

      const { result } = renderHook(() => useApiQuery('/test-endpoint'));

      // During loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.isSuccess).toBe(false);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // After success
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });
});

describe('useApiMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not make request until mutate is called', () => {
    renderHook(() => useApiMutation('/test-endpoint', 'post'));

    expect(api.post).not.toHaveBeenCalled();
  });

  it('should make POST request when mutate is called', async () => {
    const mockData = { id: 1 };
    api.post.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useApiMutation('/test-endpoint', 'post'));

    act(() => {
      result.current.mutate({ name: 'Test' });
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(api.post).toHaveBeenCalledWith('/test-endpoint', { name: 'Test' }, {}, expect.any(Object));
  });

  it('should make PUT request', async () => {
    const mockData = { updated: true };
    api.put.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useApiMutation('/test-endpoint', 'put'));

    await act(async () => {
      await result.current.mutate({ id: 1, name: 'Updated' });
    });

    expect(api.put).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockData);
  });

  it('should make DELETE request', async () => {
    api.delete.mockResolvedValueOnce({ deleted: true });

    const { result } = renderHook(() => useApiMutation('/test-endpoint/1', 'delete'));

    await act(async () => {
      await result.current.mutate();
    });

    expect(api.delete).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new ApiError('Validation failed', 400);
    api.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useApiMutation('/test-endpoint', 'post'));

    await act(async () => {
      try {
        await result.current.mutate({ invalid: true });
      } catch (e) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.isError).toBe(true);
  });

  it('should reset state', async () => {
    api.post.mockResolvedValueOnce({ data: 'test' });

    const { result } = renderHook(() => useApiMutation('/test-endpoint', 'post'));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.data).toBeTruthy();

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });
});

describe('useApiQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch multiple endpoints in parallel', async () => {
    api.get
      .mockResolvedValueOnce({ users: [] })
      .mockResolvedValueOnce({ projects: [] });

    const queries = [
      { key: 'users', endpoint: '/users' },
      { key: 'projects', endpoint: '/projects' },
    ];

    const { result } = renderHook(() => useApiQueries(queries));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data.users).toEqual({ users: [] });
    expect(result.current.data.projects).toEqual({ projects: [] });
    expect(result.current.hasErrors).toBe(false);
  });

  it('should handle partial failures', async () => {
    api.get
      .mockResolvedValueOnce({ users: [] })
      .mockRejectedValueOnce(new ApiError('Not found', 404));

    const queries = [
      { key: 'users', endpoint: '/users' },
      { key: 'missing', endpoint: '/missing' },
    ];

    const { result } = renderHook(() => useApiQueries(queries));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data.users).toEqual({ users: [] });
    expect(result.current.errors.missing).toBeDefined();
    expect(result.current.hasErrors).toBe(true);
  });
});

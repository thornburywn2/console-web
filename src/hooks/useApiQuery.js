/**
 * useApiQuery Hook
 * Phase 2.1: React hook for API calls with loading, error, and data states
 *
 * Provides:
 * - Automatic loading states
 * - Error handling with user-friendly messages
 * - Data caching
 * - Refetch functionality
 * - AbortController for cleanup
 * - Timeout support (default 30s)
 * - Retry logic for transient errors
 * - Request ID propagation for tracing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api, { ApiError, cancelRequest } from '../services/api.js';

/**
 * Generate unique request ID for tracing
 */
let queryId = 0;
const generateQueryId = () => `query-${Date.now()}-${++queryId}`;

/**
 * useApiQuery - Hook for fetching data from API
 *
 * @param {string} endpoint - API endpoint (e.g., '/admin/system')
 * @param {object} options - Configuration options
 * @param {boolean} options.enabled - Whether to fetch immediately (default: true)
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @param {number} options.retries - Number of retries on failure (default: 0)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @param {number} options.refetchInterval - Auto-refetch interval in ms (default: null)
 * @param {function} options.onSuccess - Callback on successful fetch
 * @param {function} options.onError - Callback on error
 * @param {any} options.initialData - Initial data before fetch
 * @param {array} options.deps - Additional dependencies to trigger refetch
 *
 * @returns {object} { data, loading, error, refetch, isRefetching, queryId }
 */
export function useApiQuery(endpoint, options = {}) {
  const {
    enabled = true,
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    refetchInterval = null,
    onSuccess,
    onError,
    initialData = null,
    deps = [],
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const queryIdRef = useRef(generateQueryId());
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (isRefetch = false) => {
    if (!mountedRef.current) return;

    // Set appropriate loading state
    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await api.get(endpoint, {}, { timeout, retries, retryDelay });

      if (!mountedRef.current) return;

      setData(result);
      setError(null);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      // Convert to ApiError if not already
      const apiError = err instanceof ApiError
        ? err
        : new ApiError(err.message, 0, null, queryIdRef.current);

      setError(apiError);

      if (onError) {
        onError(apiError);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsRefetching(false);
      }
    }
  }, [endpoint, timeout, retries, retryDelay, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      fetchData(false);
    }

    return () => {
      mountedRef.current = false;
      cancelRequest(queryIdRef.current);
    };
  }, [enabled, fetchData, ...deps]);

  // Auto-refetch interval
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0 && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, enabled, fetchData]);

  // Manual refetch function
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isRefetching,
    queryId: queryIdRef.current,
    // Convenience getters
    isLoading: loading,
    isError: !!error,
    isSuccess: !!data && !error && !loading,
    errorMessage: error?.getUserMessage() || null,
  };
}

/**
 * useApiMutation - Hook for mutating data (POST, PUT, DELETE)
 *
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method ('post', 'put', 'patch', 'delete')
 * @param {object} options - Configuration options
 *
 * @returns {object} { mutate, loading, error, data, reset }
 */
export function useApiMutation(endpoint, method = 'post', options = {}) {
  const {
    timeout = 30000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(async (payload = {}) => {
    if (!mountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      let result;

      switch (method.toLowerCase()) {
        case 'post':
          result = await api.post(endpoint, payload, {}, { timeout });
          break;
        case 'put':
          result = await api.put(endpoint, payload, {}, { timeout });
          break;
        case 'patch':
          result = await api.patch(endpoint, payload, {}, { timeout });
          break;
        case 'delete':
          result = await api.delete(endpoint, {}, { timeout });
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      if (!mountedRef.current) return;

      setData(result);
      setError(null);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      if (!mountedRef.current) return;

      const apiError = err instanceof ApiError
        ? err
        : new ApiError(err.message, 0, null, null);

      setError(apiError);

      if (onError) {
        onError(apiError);
      }

      throw apiError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, method, timeout, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    loading,
    error,
    data,
    reset,
    // Convenience getters
    isLoading: loading,
    isError: !!error,
    isSuccess: !!data && !error && !loading,
    errorMessage: error?.getUserMessage() || null,
  };
}

/**
 * useApiQueries - Hook for multiple parallel queries
 *
 * @param {array} queries - Array of { key, endpoint, options }
 * @param {object} globalOptions - Global options for all queries
 * @param {number} globalOptions.refetchInterval - Auto-refetch interval in ms
 *
 * @returns {object} { data, loading, errors, refetchAll, hasErrors }
 */
export function useApiQueries(queries, globalOptions = {}) {
  const { refetchInterval = null } = globalOptions;

  // Initialize results with null for each key to ensure stable references
  const [results, setResults] = useState(() => {
    const initial = {};
    queries.forEach(q => {
      initial[q.key] = null;
    });
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(true);
    const newResults = {};
    const newErrors = {};

    await Promise.allSettled(
      queries.map(async ({ key, endpoint, options = {} }) => {
        try {
          const result = await api.get(endpoint, {}, {
            timeout: options.timeout || 30000,
            retries: options.retries || 0,
          });
          newResults[key] = result;
        } catch (err) {
          newErrors[key] = err instanceof ApiError
            ? err
            : new ApiError(err.message, 0);
        }
      })
    );

    if (mountedRef.current) {
      setResults(newResults);
      setErrors(newErrors);
      setLoading(false);
    }
  }, [queries]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchAll();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchAll]);

  // Auto-refetch interval
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchAll();
        }
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refetchInterval, fetchAll]);

  return {
    data: results,
    loading,
    errors,
    refetchAll: fetchAll,
    hasErrors: Object.keys(errors).length > 0,
  };
}

export default useApiQuery;

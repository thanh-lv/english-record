import { useState, useEffect, useCallback, useRef } from 'react';
import { clientCache, CacheOptions } from '../lib/cache';

export interface UseQueryOptions<T> extends CacheOptions {
  enabled?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
}

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<T | null>;
}

/**
 * Lightweight React Query-like hook for data fetching with:
 * - Instant Stale-While-Revalidate cache rendering.
 * - In-flight Promise deduplication.
 * - Automatic background revalidation.
 * - LocalStorage persistence.
 *
 * @param queryKey - String or Array of key elements (e.g. ['topics', isBongBe, grade])
 * @param fetcher - Async data fetching function
 * @param options - Query options (ttlMs, enabled, initialData, etc.)
 */
export function useQuery<T>(
  queryKey: string | (string | number | boolean | null | undefined)[],
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseQueryResult<T> {
  const {
    enabled = true,
    ttlMs = 60 * 1000,
    persist = true,
    initialData = null,
    onSuccess,
    onError,
  } = options;

  const serializedKey = Array.isArray(queryKey)
    ? queryKey.map(k => String(k ?? '')).join(':')
    : queryKey;

  // Initialize with cached value if available for instant warm render
  const cachedInitial = clientCache.get<T>(serializedKey);

  const [data, setData] = useState<T | null>(cachedInitial ?? initialData);
  const [loading, setLoading] = useState<boolean>(cachedInitial === null && enabled);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const executeFetch = useCallback(
    async (forceRefresh = false): Promise<T | null> => {
      if (!enabled) return null;

      try {
        if (!forceRefresh) {
          const cached = clientCache.get<T>(serializedKey);
          if (cached !== null) {
            setData(cached);
            setLoading(false);
            return cached;
          }
        }

        setLoading(true);
        setError(null);

        const result = await clientCache.fetchWithCache<T>(
          serializedKey,
          () => fetcherRef.current(),
          { ttlMs, persist, forceRefresh }
        );

        if (isMountedRef.current) {
          setData(result);
          setLoading(false);
          onSuccess?.(result);
        }

        return result;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
          onError?.(err);
        }
        return null;
      }
    },
    [enabled, serializedKey, ttlMs, persist, onSuccess, onError]
  );

  useEffect(() => {
    isMountedRef.current = true;
    executeFetch(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [executeFetch]);

  const refetch = useCallback(
    (forceRefresh = true) => {
      return executeFetch(forceRefresh);
    },
    [executeFetch]
  );

  return {
    data,
    loading,
    error,
    refetch,
  };
}

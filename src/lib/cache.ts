/**
 * @file cache.ts
 * @description
 * High-performance client-side in-memory & persistent cache with:
 * - Time-To-Live (TTL) expiration.
 * - In-flight Promise deduplication (prevents duplicate simultaneous network requests).
 * - Pattern-based cache invalidation for mutations (create/update/delete).
 * - Optional localStorage fallback for offline / instant warm-boot rendering.
 *
 * @module lib/cache
 */

export interface CacheOptions {
  ttlMs?: number;
  persist?: boolean;
  forceRefresh?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class ClientCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private readonly DEFAULT_TTL_MS = 60 * 1000; // 1 minute default TTL
  private readonly PERSIST_PREFIX = 'ercache_';

  /**
   * Retrieves data from in-memory or persisted localStorage cache if valid.
   */
  public get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    const now = Date.now();

    if (entry && now - entry.timestamp < entry.ttlMs) {
      return entry.data as T;
    }

    // Try reading from localStorage if not in memory
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(`${this.PERSIST_PREFIX}${key}`);
        if (raw) {
          const parsed: CacheEntry<T> = JSON.parse(raw);
          if (now - parsed.timestamp < parsed.ttlMs) {
            // Restore to memory cache
            this.memoryCache.set(key, parsed);
            return parsed.data;
          } else {
            localStorage.removeItem(`${this.PERSIST_PREFIX}${key}`);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    return null;
  }

  /**
   * Stores data in cache with specified TTL and optional local persistence.
   */
  public set<T>(key: string, data: T, options?: { ttlMs?: number; persist?: boolean }): void {
    const ttlMs = options?.ttlMs ?? this.DEFAULT_TTL_MS;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };

    this.memoryCache.set(key, entry);

    if (options?.persist && typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`${this.PERSIST_PREFIX}${key}`, JSON.stringify(entry));
      } catch {
        // Handle quota exceeded
      }
    }
  }

  /**
   * Fetches data with automatic caching and concurrent request deduplication.
   *
   * @param key - Unique cache key
   * @param fetcher - Async function fetching fresh data
   * @param options - Cache options (ttlMs, persist, forceRefresh)
   */
  public async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { forceRefresh = false, ttlMs = this.DEFAULT_TTL_MS, persist = true } = options;

    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Deduplicate in-flight requests for the exact same key
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const requestPromise = (async () => {
      try {
        const freshData = await fetcher();
        this.set<T>(key, freshData, { ttlMs, persist });
        return freshData;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Invalidates cache entries matching a string prefix, key, or RegExp pattern.
   *
   * @example
   * clientCache.invalidate('topics'); // invalidates all keys starting with 'topics'
   */
  public invalidate(pattern: string | RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.memoryCache.keys()) {
      if (typeof pattern === 'string' ? key.startsWith(pattern) : pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.removeItem(`${this.PERSIST_PREFIX}${key}`);
        } catch {
          // Ignore
        }
      }
    }
  }

  /**
   * Clears all memory and persisted cache entries.
   */
  public clear(): void {
    this.memoryCache.clear();
    this.inFlightRequests.clear();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(this.PERSIST_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }
      } catch {
        // Ignore
      }
    }
  }
}

export const clientCache = new ClientCache();

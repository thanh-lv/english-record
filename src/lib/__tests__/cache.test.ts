import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientCache } from '../cache';

describe('clientCache system', () => {
  beforeEach(() => {
    clientCache.clear();
    vi.clearAllMocks();
  });

  it('stores and retrieves cached data before TTL expires', () => {
    clientCache.set('test:key', { name: 'English Topic 1' }, { ttlMs: 1000 });
    const cached = clientCache.get<{ name: string }>('test:key');
    expect(cached).toEqual({ name: 'English Topic 1' });
  });

  it('expires cache entry after TTL', async () => {
    clientCache.set('test:short', 'val', { ttlMs: 10 });
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(clientCache.get('test:short')).toBeNull();
  });

  it('deduplicates simultaneous concurrent requests for identical key', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 30));
      return { count: callCount };
    });

    const [res1, res2, res3] = await Promise.all([
      clientCache.fetchWithCache('topics:dedup', fetcher, { ttlMs: 5000 }),
      clientCache.fetchWithCache('topics:dedup', fetcher, { ttlMs: 5000 }),
      clientCache.fetchWithCache('topics:dedup', fetcher, { ttlMs: 5000 }),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(res1).toEqual({ count: 1 });
    expect(res2).toEqual({ count: 1 });
    expect(res3).toEqual({ count: 1 });
  });

  it('invalidates cache entries by string prefix and regex pattern', () => {
    clientCache.set('topics:1', 'Topic 1');
    clientCache.set('topics:2', 'Topic 2');
    clientCache.set('stories:1', 'Story 1');

    clientCache.invalidate('topics');

    expect(clientCache.get('topics:1')).toBeNull();
    expect(clientCache.get('topics:2')).toBeNull();
    expect(clientCache.get('stories:1')).toBe('Story 1');

    clientCache.invalidate(/^stories/);
    expect(clientCache.get('stories:1')).toBeNull();
  });

  it('supports forceRefresh to bypass valid cache', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('Initial').mockResolvedValueOnce('Fresh');

    const first = await clientCache.fetchWithCache('cache:key', fetcher);
    expect(first).toBe('Initial');

    const second = await clientCache.fetchWithCache('cache:key', fetcher, { forceRefresh: true });
    expect(second).toBe('Fresh');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

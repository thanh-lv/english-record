import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuery } from '../useQuery';
import { clientCache } from '../../lib/cache';

describe('useQuery hook', () => {
  beforeEach(() => {
    clientCache.clear();
    vi.clearAllMocks();
  });

  it('fetches and returns fresh data when cache is empty', async () => {
    const fetcher = vi.fn().mockResolvedValue(['Topic A', 'Topic B']);

    const { result } = renderHook(() => useQuery('topics:list', fetcher));

    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(result.current.data).toEqual(['Topic A', 'Topic B']);
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('immediately returns cached data on mount without loading state', async () => {
    clientCache.set('topics:cached', ['Cached 1', 'Cached 2'], { ttlMs: 10000 });
    const fetcher = vi.fn().mockResolvedValue(['Fresh 1']);

    const { result } = renderHook(() => useQuery('topics:cached', fetcher));

    expect(result.current.data).toEqual(['Cached 1', 'Cached 2']);
    expect(result.current.loading).toBe(false);
  });

  it('handles refetch with force refresh', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('First').mockResolvedValueOnce('Second');

    const { result } = renderHook(() => useQuery('items:refetch', fetcher));
    await act(async () => {});

    expect(result.current.data).toBe('First');

    await act(async () => {
      await result.current.refetch(true);
    });

    expect(result.current.data).toBe('Second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('handles errors gracefully and sets error state', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useQuery('error:key', fetcher));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.error?.message).toBe('Network error');
  });
});

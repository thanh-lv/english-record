import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShadowingManager } from '../useShadowingManager';
import { shadowingService } from '../../../../services/shadowingService';

vi.mock('../../../../services/shadowingService', () => ({
  shadowingService: {
    fetchShadowingVideos: vi.fn(),
    createShadowingVideo: vi.fn(),
    updateShadowingVideo: vi.fn(),
    toggleShadowingVideoActive: vi.fn(),
    deleteShadowingVideo: vi.fn(),
  },
  formatSecondsToTime: vi.fn((s: number) => (s ? '01:00' : '')),
  parseTimeToSeconds: vi.fn((t: string) => (t ? 60 : null)),
}));

describe('useShadowingManager hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches shadowing videos on mount', async () => {
    const mockVideos = [
      { id: 'v1', title: 'Video 1', youtube_url: 'https://youtube.com/watch?v=123', grades: [3] },
    ];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    expect(result.current.videos).toEqual(mockVideos);
    expect(result.current.loading).toBe(false);
  });

  it('filters videos by search query and grade', async () => {
    const mockVideos = [
      {
        id: 'v1',
        title: 'Animals Story',
        youtube_url: 'https://youtube.com/watch?v=123',
        grades: [3],
      },
      {
        id: 'v2',
        title: 'Colors Song',
        youtube_url: 'https://youtube.com/watch?v=456',
        grades: [4],
      },
    ];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    act(() => {
      result.current.setSearchQuery('Animals');
    });
    expect(result.current.filteredVideos).toHaveLength(1);
    expect(result.current.filteredVideos[0].id).toBe('v1');

    act(() => {
      result.current.setSearchQuery('');
      result.current.setFilterGrade('4');
    });
    expect(result.current.filteredVideos).toHaveLength(1);
    expect(result.current.filteredVideos[0].id).toBe('v2');
  });

  it('toggles video active state', async () => {
    const mockVideos = [{ id: 'v1', title: 'Video 1', is_active: true }];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);
    (shadowingService.toggleShadowingVideoActive as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    await act(async () => {
      await result.current.handleToggleActive('v1', true);
    });

    expect(shadowingService.toggleShadowingVideoActive).toHaveBeenCalledWith('v1', true);
    expect(result.current.videos[0].is_active).toBe(false);
  });

  it('deletes video and updates list', async () => {
    const mockVideos = [{ id: 'v1', title: 'Video 1' }];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);
    (shadowingService.deleteShadowingVideo as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    act(() => {
      result.current.setDeleteTarget(mockVideos[0] as any);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(shadowingService.deleteShadowingVideo).toHaveBeenCalledWith('v1');
    expect(result.current.videos).toHaveLength(0);
  });
});

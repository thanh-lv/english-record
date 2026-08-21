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
      {
        id: 'v1',
        title: 'Video 1',
        youtube_url: 'https://youtube.com/watch?v=12345678901',
        grades: [3],
      },
    ];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    expect(result.current.videos).toEqual(mockVideos);
    expect(result.current.loading).toBe(false);
  });

  it('filters videos by search query, unassigned grade, and specific grade', async () => {
    const mockVideos = [
      {
        id: 'v1',
        title: 'Animals Story',
        youtube_url: 'https://youtube.com/watch?v=12345678901',
        grades: [3],
      },
      {
        id: 'v2',
        title: 'Colors Song',
        youtube_url: 'https://youtube.com/watch?v=23456789012',
        grades: [4],
      },
      {
        id: 'v3',
        title: 'General Story',
        youtube_url: 'https://youtube.com/watch?v=34567890123',
        grades: [],
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

    act(() => {
      result.current.setFilterGrade('unassigned');
    });
    expect(result.current.filteredVideos).toHaveLength(1);
    expect(result.current.filteredVideos[0].id).toBe('v3');
  });

  it('opens create modal with reset fields', async () => {
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue([]);
    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    act(() => {
      result.current.openCreateModal();
    });

    expect(result.current.showCreate).toBe(true);
    expect(result.current.title).toBe('');
    expect(result.current.youtubeUrl).toBe('');
  });

  it('opens edit modal with video fields populated and showCreate true', async () => {
    const mockVideo = {
      id: 'v1',
      title: 'Video Title',
      youtube_url: 'https://youtube.com/watch?v=12345678901',
      preview_start: 10,
      preview_end: 20,
      record_start: 15,
      record_end: 25,
      grades: [1, 2],
    };
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue([mockVideo]);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    act(() => {
      result.current.openEditModal(mockVideo as any);
    });

    expect(result.current.showCreate).toBe(true);
    expect(result.current.editingVideo).toEqual(mockVideo);
    expect(result.current.title).toBe('Video Title');
    expect(result.current.selectedGrades).toEqual([1, 2]);

    act(() => {
      result.current.closeModal();
    });
    expect(result.current.showCreate).toBe(false);
    expect(result.current.editingVideo).toBeNull();
  });

  it('handles validation error and successfully saves new video', async () => {
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue([]);
    const createdVideo = {
      id: 'v-new',
      title: 'My Video',
      youtube_url: 'https://youtube.com/watch?v=12345678901',
      grades: [3],
    };
    (shadowingService.createShadowingVideo as any).mockResolvedValue(createdVideo);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    // Try save with empty title
    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as any);
    });
    expect(result.current.error).toBeTruthy();

    // Fill valid data
    act(() => {
      result.current.setTitle('My Video');
      result.current.setYoutubeUrl('https://youtube.com/watch?v=12345678901');
      result.current.setSelectedGrades([3]);
    });

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as any);
    });

    expect(shadowingService.createShadowingVideo).toHaveBeenCalled();
    expect(result.current.videos[0].id).toBe('v-new');
    expect(result.current.showCreate).toBe(false);
  });

  it('updates existing video in handleSave', async () => {
    const existing = {
      id: 'v1',
      title: 'Old Title',
      youtube_url: 'https://youtube.com/watch?v=12345678901',
      grades: [2],
    };
    const updated = { ...existing, title: 'New Updated Title' };
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue([existing]);
    (shadowingService.updateShadowingVideo as any).mockResolvedValue(updated);

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    act(() => {
      result.current.openEditModal(existing as any);
      result.current.setTitle('New Updated Title');
    });

    expect(result.current.showCreate).toBe(true);

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as any);
    });

    expect(shadowingService.updateShadowingVideo).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({ title: 'New Updated Title' })
    );
    expect(result.current.videos[0].title).toBe('New Updated Title');
    expect(result.current.editingVideo).toBeNull();
    expect(result.current.showCreate).toBe(false);
  });

  it('toggles video active state and handles errors', async () => {
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

  it('deletes video and handles delete errors', async () => {
    const mockVideos = [{ id: 'v1', title: 'Video 1' }];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);
    (shadowingService.deleteShadowingVideo as any).mockRejectedValue(
      new Error('Delete DB failure')
    );

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    act(() => {
      result.current.setDeleteTarget(mockVideos[0] as any);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(result.current.deleteError).toBe('Delete DB failure');
  });

  it('copies video share link to clipboard via fallback document.execCommand', async () => {
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue([]);
    const execMock = vi.fn();
    document.execCommand = execMock;

    const { result } = renderHook(() => useShadowingManager({}));
    await act(async () => {});

    await act(async () => {
      await result.current.handleCopyLink('vid-123');
    });

    expect(execMock).toHaveBeenCalledWith('copy');
    expect(result.current.copiedId).toBe('vid-123');
  });
});

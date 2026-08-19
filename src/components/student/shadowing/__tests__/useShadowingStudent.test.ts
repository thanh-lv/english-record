import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShadowingStudent } from '../useShadowingStudent';
import { shadowingService } from '../../../../services/shadowingService';

vi.mock('../../../../services/shadowingService', () => ({
  shadowingService: {
    fetchShadowingVideos: vi.fn(),
  },
}));

describe('useShadowingStudent hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches only active videos on mount', async () => {
    const mockVideos = [{ id: 'v1', title: 'Video 1', is_active: true, grades: [3] }];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);

    const { result } = renderHook(() => useShadowingStudent({ studentGrade: 3 }));
    await act(async () => {});

    expect(shadowingService.fetchShadowingVideos).toHaveBeenCalledWith(true);
    expect(result.current.videos).toEqual(mockVideos);
    expect(result.current.loading).toBe(false);
  });

  it('filters videos by student grade and search text', async () => {
    const mockVideos = [
      { id: 'v1', title: 'Grade 3 Video', is_active: true, grades: [3] },
      { id: 'v2', title: 'Grade 5 Video', is_active: true, grades: [5] },
      { id: 'v3', title: 'All Grades Story', is_active: true, grades: [] },
    ];
    (shadowingService.fetchShadowingVideos as any).mockResolvedValue(mockVideos);

    const { result } = renderHook(() => useShadowingStudent({ studentGrade: 3 }));
    await act(async () => {});

    // In myGrade mode, should include Grade 3 and All Grades (empty grades array)
    expect(result.current.filteredVideos).toHaveLength(2);

    // Switch to all grades mode
    act(() => {
      result.current.setFilterMode('all');
    });
    expect(result.current.filteredVideos).toHaveLength(3);

    // Filter by search text
    act(() => {
      result.current.setFilterText('Story');
    });
    expect(result.current.filteredVideos).toHaveLength(1);
    expect(result.current.filteredVideos[0].id).toBe('v3');
  });
});

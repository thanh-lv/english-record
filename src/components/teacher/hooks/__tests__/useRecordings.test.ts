import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecordings, fetchStudentRecordings, fetchRecordingPage } from '../useRecordings';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('useRecordings hook and helper services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStudentRecordings', () => {
    it('fetches topic recordings with pagination', async () => {
      const mockRecordings = [
        { id: 'r1', student_name: 'Alice', topic: 'Animals' },
        { id: 'r2', student_name: 'Alice', topic: 'Colors' },
      ];

      // Chain: select -> ilike -> order -> range -> is
      const queryObj = {
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockRecordings, error: null, count: 10 }),
        not: vi.fn().mockReturnThis(),
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(queryObj),
      });

      const res = await fetchStudentRecordings('Alice', 1, 5, 'topic');
      expect(supabase.from).toHaveBeenCalledWith('recordings');
      expect(res.records).toEqual(mockRecordings);
      expect(res.total).toBe(10);
    });

    it('fetches shadowing recordings and maps youtube_url correctly', async () => {
      const mockData = [
        {
          id: 'r1',
          student_name: 'Bob',
          shadowing_video_id: 'vid-1',
          shadowing_videos: { youtube_url: 'https://youtube.com/watch?v=123' },
        },
      ];

      const queryObj = {
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(queryObj),
      });

      const res = await fetchStudentRecordings('Bob', 1, 5, 'shadowing');
      expect(res.records[0].youtube_url).toBe('https://youtube.com/watch?v=123');
      expect(res.total).toBe(1);
    });

    it('throws error when query fails', async () => {
      const queryObj = {
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: new Error('Query error'), count: 0 }),
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(queryObj),
      });

      await expect(fetchStudentRecordings('Alice', 1, 5)).rejects.toThrow('Query error');
    });
  });

  describe('fetchRecordingPage', () => {
    it('finds the correct page index for a given recordId', async () => {
      const mockList = [
        { id: 'r1' },
        { id: 'r2' },
        { id: 'r3' },
        { id: 'r4' },
        { id: 'r5' },
        { id: 'r6' },
      ];

      const orderMock = vi.fn().mockResolvedValue({ data: mockList, error: null });
      const ilikeMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      // Page size 2: r1, r2 -> page 1; r3, r4 -> page 2; r5, r6 -> page 3
      const page = await fetchRecordingPage('Alice', 'r5', 2);
      expect(page).toBe(3);
    });

    it('returns page 1 when recordId is not found', async () => {
      const mockList = [{ id: 'r1' }];
      const orderMock = vi.fn().mockResolvedValue({ data: mockList, error: null });
      const ilikeMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const page = await fetchRecordingPage('Alice', 'non-existent', 5);
      expect(page).toBe(1);
    });
  });

  describe('useRecordings hook', () => {
    beforeEach(() => {
      (supabase.channel as any).mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({}),
      });
    });

    it('loads student summaries from database view when view data is available', async () => {
      const mockViewData = [
        { name: 'John Doe', total_recordings: 5, last_submission_at: '2026-08-19T10:00:00Z' },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'student_recording_stats_view') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockViewData, error: null }),
          };
        }
        return { select: vi.fn() };
      });

      const user = { id: 'teacher-1' };
      const { result } = renderHook(() => useRecordings(user));

      await act(async () => {
        await new Promise(r => setTimeout(r, 10));
      });

      expect(result.current.summaries).toHaveLength(1);
      expect(result.current.summaries[0].studentName).toBe('John Doe');
      expect(result.current.summaries[0].count).toBe(5);
    });

    it('falls back to raw recordings aggregation when view is empty', async () => {
      const mockRawRecordings = [
        {
          student_name: 'Anna',
          created_at: '2026-08-19T08:00:00Z',
          teacher_rating: 0,
          teacher_feedback: '',
        },
        {
          student_name: 'Anna',
          created_at: '2026-08-19T09:00:00Z',
          teacher_rating: 5,
          teacher_feedback: 'Great!',
        },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'student_recording_stats_view') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'recordings') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockRawRecordings, error: null }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const user = { id: 'teacher-1' };
      const { result } = renderHook(() => useRecordings(user));

      await act(async () => {
        await new Promise(r => setTimeout(r, 10));
      });

      expect(result.current.summaries).toHaveLength(1);
      expect(result.current.summaries[0].studentName).toBe('Anna');
      expect(result.current.summaries[0].count).toBe(2);
      expect(result.current.summaries[0].hasUngraded).toBe(true);
    });

    it('confirms and deletes recording by deleteTargetId', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'student_recording_stats_view') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'recordings') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            delete: deleteMock,
          };
        }
        return {};
      });

      const user = { id: 'teacher-1' };
      const { result } = renderHook(() => useRecordings(user));

      act(() => {
        result.current.setDeleteTargetId('rec-to-delete-123');
      });

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any;

      await act(async () => {
        await result.current.confirmDelete(mockEvent);
      });

      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'rec-to-delete-123');
      expect(result.current.deleteTargetId).toBeNull();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useStudentData,
  useStudentTopics,
  useStudentRecordings,
  useStudentStories,
} from '../useStudentData';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('Student hooks', () => {
  let channelCallback: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.channel as any).mockReturnValue({
      on: vi.fn().mockImplementation((_event, _opts, cb) => {
        channelCallback = cb;
        return {
          subscribe: vi.fn().mockReturnValue({}),
        };
      }),
    });
  });

  describe('useStudentTopics', () => {
    it('fetches and filters topics by grade and sorts questions', async () => {
      const mockTopics = [
        {
          id: 't1',
          title: 'Grade 3 Animals',
          grades: [3],
          type: 'standard',
          is_active: true,
          questions: [
            { id: 'q2', order_index: 2 },
            { id: 'q1', order_index: 1 },
          ],
        },
        {
          id: 't2',
          title: 'Grade 5 Colors',
          grades: [5],
          type: 'standard',
          is_active: true,
          questions: [],
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockTopics, error: null }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useStudentTopics({ grade: 3 }, false));

      await act(async () => {
        await new Promise(r => setTimeout(r, 10));
      });

      expect(result.current.activeTopics).toHaveLength(1);
      expect(result.current.activeTopics[0].id).toBe('t1');
      expect(result.current.activeTopics[0].questions[0].id).toBe('q1');
      expect(result.current.topicsLoading).toBe(false);
    });
  });

  describe('useStudentStories', () => {
    it('fetches stories and filters by student grade', async () => {
      const mockStories = [
        { id: 's1', title: 'Story for Grade 3', grades: [3], is_active: true },
        { id: 's2', title: 'Story for Grade 5', grades: [5], is_active: true },
        { id: 's3', title: 'Story for All', grades: [], is_active: true },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useStudentStories({ grade: 3 }));

      await act(async () => {
        await new Promise(r => setTimeout(r, 10));
      });

      expect(result.current.dbStories).toHaveLength(2);
      expect(result.current.dbStories.map(s => s.id)).toEqual(['s1', 's3']);
    });
  });

  describe('useStudentData composition', () => {
    it('fetches student recordings, calculates completed numbers and streak', async () => {
      const today = new Date().toISOString();
      const mockRecordings = [
        { id: 'r1', topic_number: 1, created_at: today, student_name: 'Bob' },
        { id: 'r2', topic_number: 2, created_at: today, student_name: 'Bob' },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'recordings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockRecordings, error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      });

      const user = { id: 'student-bob' };
      const profile = { name: 'Bob', grade: 4 };

      const { result } = renderHook(() => useStudentData(user, profile, false));

      await act(async () => {
        await new Promise(r => setTimeout(r, 10));
      });

      expect(result.current.myRecordings).toHaveLength(2);
      expect(result.current.completedNumbers).toEqual([1, 2]);
      expect(result.current.streak).toBe(1);
    });

    it('handles realtime INSERT, UPDATE, DELETE payloads for student recordings', async () => {
      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }));

      const user = { id: 'student-1' };
      const profile = { name: 'Charlie', grade: 2 };

      const { result } = renderHook(() => useStudentData(user, profile, false));

      await act(async () => {
        await new Promise(r => setTimeout(r, 10));
      });

      expect(result.current.myRecordings).toHaveLength(0);

      // 1. Realtime INSERT
      act(() => {
        channelCallback?.({
          eventType: 'INSERT',
          new: { id: 'rec-rt-1', topic_number: 5, student_name: 'Charlie' },
        });
      });

      expect(result.current.myRecordings).toHaveLength(1);
      expect(result.current.completedNumbers).toContain(5);

      // 2. Realtime UPDATE
      act(() => {
        channelCallback?.({
          eventType: 'UPDATE',
          new: { id: 'rec-rt-1', topic_number: 5, teacher_rating: 5, student_name: 'Charlie' },
        });
      });

      expect(result.current.myRecordings[0].teacher_rating).toBe(5);

      // 3. Realtime DELETE
      act(() => {
        channelCallback?.({
          eventType: 'DELETE',
          old: { id: 'rec-rt-1' },
        });
      });

      expect(result.current.myRecordings).toHaveLength(0);
    });
  });
});

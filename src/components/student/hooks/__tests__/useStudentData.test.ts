import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentData } from '../useStudentData';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('useStudentData hook', () => {
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

  it('fetches topics filtered by type and student grade', async () => {
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
      {
        id: 't3',
        title: 'General Topic',
        grades: [], // Empty grades array -> visible to all
        type: 'standard',
        is_active: true,
        questions: [],
      },
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'topics') {
        const orderMock = vi.fn().mockResolvedValue({ data: mockTopics, error: null });
        const eqActive = vi.fn().mockReturnValue({ order: orderMock });
        const eqType = vi.fn().mockReturnValue({ eq: eqActive });
        return { select: vi.fn().mockReturnValue({ eq: eqType }) };
      }
      if (table === 'recordings' || table === 'stories') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const user = { id: 'student-1' };
    const profile = { name: 'Alice', grade: 3 };

    const { result } = renderHook(() => useStudentData(user, profile, false));

    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    // Should include t1 (grade 3) and t3 (all grades), but not t2 (grade 5)
    expect(result.current.activeTopics).toHaveLength(2);
    expect(result.current.activeTopics[0].id).toBe('t1');
    expect(result.current.activeTopics[0].questions[0].id).toBe('q1');
    expect(result.current.activeTopics[1].id).toBe('t3');
    expect(result.current.topicsLoading).toBe(false);
  });

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

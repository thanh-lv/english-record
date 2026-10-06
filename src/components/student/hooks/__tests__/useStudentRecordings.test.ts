import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentRecordings } from '../useStudentRecordings';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Each awaited query resolves to the next queued result.
function mockRecordingQueries(results: { data: any; error: any }[]) {
  const queries: any[] = [];
  let call = 0;
  (supabase.from as any).mockImplementation(() => ({
    select: vi.fn(() => {
      const result = results[Math.min(call++, results.length - 1)];
      const query: any = {
        eq: vi.fn(() => query),
        ilike: vi.fn(() => query),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      };
      queries.push(query);
      return query;
    }),
  }));
  return queries;
}

describe('useStudentRecordings', () => {
  let channelCallback: any = null;
  const user = { id: 'auth-user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    channelCallback = null;
    (supabase.channel as any).mockReturnValue({
      on: vi.fn().mockImplementation((_event, _opts, cb) => {
        channelCallback = cb;
        return { subscribe: vi.fn().mockReturnValue({}) };
      }),
    });
  });

  it('loads recordings by the student profile id instead of the name', async () => {
    const profile = { id: 'profile-an', name: 'An', teacher_id: 'teacher-1' };
    const queries = mockRecordingQueries([{ data: [{ id: 'r1', topic_number: 2 }], error: null }]);

    const { result } = renderHook(() => useStudentRecordings(user, profile));
    await act(async () => {});

    expect(queries).toHaveLength(1);
    expect(queries[0].eq).toHaveBeenCalledWith('student_id', 'profile-an');
    expect(queries[0].eq).toHaveBeenCalledWith('teacher_id', 'teacher-1');
    expect(queries[0].ilike).not.toHaveBeenCalled();
    expect(result.current.myRecordings).toEqual([{ id: 'r1', topic_number: 2 }]);
    expect(result.current.completedNumbers).toEqual([2]);
  });

  it('falls back to a literal name match when the student_id column does not exist yet', async () => {
    const profile = { id: 'profile-an', name: 'An_1%', teacher_id: 'teacher-1' };
    const queries = mockRecordingQueries([
      {
        data: null,
        error: { code: '42703', message: 'column recordings.student_id does not exist' },
      },
      { data: [{ id: 'r1', topic_number: null }], error: null },
    ]);

    const { result } = renderHook(() => useStudentRecordings(user, profile));
    await act(async () => {});

    expect(queries).toHaveLength(2);
    expect(queries[1].ilike).toHaveBeenCalledWith('student_name', 'An\\_1\\%');
    expect(result.current.myRecordings).toHaveLength(1);
  });

  it('ignores realtime rows that belong to a same-name classmate', async () => {
    const profile = { id: 'profile-an', name: 'An', teacher_id: 'teacher-1' };
    mockRecordingQueries([{ data: [], error: null }]);

    const { result } = renderHook(() => useStudentRecordings(user, profile));
    await act(async () => {});

    act(() => {
      channelCallback?.({
        eventType: 'INSERT',
        new: { id: 'other', student_id: 'profile-other-an', teacher_id: 'teacher-1' },
      });
      channelCallback?.({
        eventType: 'INSERT',
        new: { id: 'mine', student_id: 'profile-an', teacher_id: 'teacher-1', topic_number: 3 },
      });
    });

    expect(result.current.myRecordings.map(r => r.id)).toEqual(['mine']);
    expect(result.current.completedNumbers).toEqual([3]);
  });
});

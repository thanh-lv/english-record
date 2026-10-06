import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../adminService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('adminService.fetchTeachers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts students, recordings and topics per teacher across more than 1000 rows', async () => {
    const teachers = [
      { id: 't1', name: 'Teacher A', role: 'teacher' },
      { id: 't2', name: 'Teacher B', role: 'teacher' },
    ];
    const recordings = [
      ...Array.from({ length: 1200 }, (_, i) => ({ id: `r${i}`, teacher_id: 't1' })),
      { id: 'rb', teacher_id: 't2' },
      { id: 'orphan', teacher_id: null },
    ];
    const students = [
      { id: 's1', teacher_id: 't1' },
      { id: 's2', teacher_id: 't2' },
      { id: 's3', teacher_id: 't2' },
    ];
    const topics = [{ id: 'tp1', teacher_id: 't2' }];

    const rangeCalls: Record<string, [number, number][]> = {};
    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn(() => {
        const filters: Record<string, any> = {};
        const query: any = {
          eq: vi.fn((column: string, value: any) => {
            filters[column] = value;
            return query;
          }),
          order: vi.fn(() => {
            // Teacher list: profiles filtered by role=teacher and ordered by name
            if (table === 'profiles' && filters.role === 'teacher') {
              return Promise.resolve({ data: teachers, error: null });
            }
            return query;
          }),
          range: vi.fn((from: number, to: number) => {
            (rangeCalls[table] ||= []).push([from, to]);
            const rows =
              table === 'recordings' ? recordings : table === 'topics' ? topics : students;
            return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
          }),
        };
        return query;
      }),
    }));

    const result = await adminService.fetchTeachers();

    expect(rangeCalls.recordings).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(result.map(t => [t.id, t.student_count, t.recording_count, t.topic_count])).toEqual([
      ['t1', 1, 1200, 0],
      ['t2', 2, 1, 1],
    ]);
  });
});

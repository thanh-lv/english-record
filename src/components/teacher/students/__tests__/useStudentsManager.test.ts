import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentsManager } from '../useStudentsManager';
import { studentService } from '../../../../services/studentService';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../services/studentService', () => ({
  studentService: {
    fetchStudents: vi.fn(),
    deleteStudent: vi.fn(),
  },
}));

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Chainable query stub: builder methods return the query itself; awaiting it or calling
// `.range()` resolves to `{ data, error: null }`.
function mockQuery(getData: (from?: number) => any[]) {
  const query: any = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn((from: number) => Promise.resolve({ data: getData(from), error: null })),
    then: (resolve: any, reject: any) =>
      Promise.resolve({ data: getData(), error: null }).then(resolve, reject),
  };
  return query;
}

function mockTables(tables: Record<string, any[] | ((from?: number) => any[])>) {
  (supabase.from as any).mockImplementation((table: string) => {
    const source = tables[table] || [];
    return {
      select: vi.fn(() => mockQuery(typeof source === 'function' ? source : () => source)),
    };
  });
}

describe('useStudentsManager hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches students, recordings, and topics on mount', async () => {
    const mockStudents = [
      { id: '1', name: 'Alice', grade: 3 },
      { id: '2', name: 'Bob', grade: 4 },
    ];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);

    mockTables({ recordings: [], topics: [] });

    const { result } = renderHook(() => useStudentsManager());

    await act(async () => {});

    expect(result.current.students).toEqual(mockStudents);
    expect(result.current.loading).toBe(false);
    expect(result.current.availableGrades).toEqual([3, 4]);
  });

  it('calculates student stats correctly', async () => {
    const mockStudents = [{ id: '1', name: 'Alice', grade: 3 }];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);

    const mockRecordings = [
      {
        id: 'r1',
        student_name: 'Alice',
        topic_id: 't1',
        question_id: 'q1',
        created_at: new Date().toISOString(),
      },
    ];
    const mockTopics = [{ id: 't1', questions: [{ id: 'q1' }] }];

    mockTables({ recordings: mockRecordings, topics: mockTopics });

    const { result } = renderHook(() => useStudentsManager());
    await act(async () => {});

    const stats = result.current.calculateStudentStats(mockStudents[0]);
    expect(stats.totalRecordings).toBe(1);
    expect(stats.completedTopics).toBe(1);
    expect(stats.totalTopics).toBe(1);
    expect(stats.streak).toBe(1);
  });

  it('attributes recordings by student_id so same-name students are kept apart', async () => {
    const mockStudents = [
      { id: '1', name: 'An', grade: 3 },
      { id: '2', name: 'An', grade: 4 },
    ];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);

    const now = new Date().toISOString();
    mockTables({
      recordings: [
        { id: 'r1', student_id: '1', student_name: 'An', created_at: now },
        { id: 'r2', student_id: '1', student_name: 'An', created_at: now },
        { id: 'r3', student_id: '2', student_name: 'An', created_at: now },
        // Legacy row that the migration could not attribute to a single student
        { id: 'r4', student_id: null, student_name: 'An', created_at: now },
      ],
      topics: [],
    });

    const { result } = renderHook(() => useStudentsManager());
    await act(async () => {});

    expect(result.current.calculateStudentStats(mockStudents[0]).totalRecordings).toBe(2);
    expect(result.current.calculateStudentStats(mockStudents[1]).totalRecordings).toBe(1);
  });

  it('counts recordings beyond the 1000-row response limit', async () => {
    const mockStudents = [{ id: '1', name: 'Alice', grade: 3 }];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);

    const rows = Array.from({ length: 1001 }, (_, i) => ({
      id: `r${i}`,
      student_id: '1',
      student_name: 'Alice',
      created_at: new Date().toISOString(),
    }));
    mockTables({
      recordings: (from = 0) => rows.slice(from, from + 1000),
      topics: [],
    });

    const { result } = renderHook(() => useStudentsManager());
    await act(async () => {});

    expect(result.current.calculateStudentStats(mockStudents[0]).totalRecordings).toBe(1001);
  });

  it('filters students by search query, grade filter, and unassigned grade', async () => {
    const mockStudents = [
      { id: '1', name: 'Alice Smith', grade: 3 },
      { id: '2', name: 'Bob Jones', grade: 4 },
      { id: '3', name: 'Charlie Smith', grade: null },
    ];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);

    mockTables({ recordings: [], topics: [] });

    const { result } = renderHook(() => useStudentsManager());
    await act(async () => {});

    act(() => {
      result.current.setSearchQuery('Smith');
    });
    expect(result.current.filteredStudents).toHaveLength(2);

    act(() => {
      result.current.setSearchQuery('');
      result.current.setGradeFilter('none');
    });
    expect(result.current.filteredStudents).toHaveLength(1);
    expect(result.current.filteredStudents[0].id).toBe('3');
  });

  it('handles onStudentCreated and onStudentUpdated', async () => {
    (studentService.fetchStudents as any).mockResolvedValue([{ id: '1', name: 'Alice', grade: 3 }]);
    mockTables({ recordings: [], topics: [] });

    const { result } = renderHook(() => useStudentsManager());
    await act(async () => {});

    act(() => {
      result.current.onStudentCreated({
        id: '2',
        name: 'Bob',
        grade: 4,
        role: 'student',
        updated_at: '',
      } as any);
    });

    expect(result.current.students).toHaveLength(2);

    act(() => {
      result.current.onStudentUpdated({
        id: '1',
        name: 'Alice Renamed',
        grade: 3,
        role: 'student',
        updated_at: '',
      } as any);
    });

    expect(result.current.students.find(s => s.id === '1')?.name).toBe('Alice Renamed');
  });

  it('deletes student and handles errors gracefully', async () => {
    const mockStudents = [{ id: '1', name: 'Alice', grade: 3 }];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);
    (studentService.deleteStudent as any).mockRejectedValue(new Error('Delete error'));

    mockTables({ recordings: [], topics: [] });

    const { result } = renderHook(() => useStudentsManager());
    await act(async () => {});

    act(() => {
      result.current.setDeleteTarget(mockStudents[0] as any);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(studentService.deleteStudent).toHaveBeenCalledWith('1');
    expect(result.current.deleteSaving).toBe(false);
  });
});

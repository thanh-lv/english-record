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

    const selectRecMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const selectTopMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'recordings') return { select: selectRecMock };
      if (table === 'topics') return { select: selectTopMock };
      return {};
    });

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

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'recordings')
        return { select: vi.fn().mockResolvedValue({ data: mockRecordings, error: null }) };
      if (table === 'topics')
        return {
          select: vi
            .fn()
            .mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockTopics, error: null }) }),
        };
      return {};
    });

    const { result } = renderHook(() => useStudentsManager());
    await act(async () => {});

    const stats = result.current.calculateStudentStats('Alice');
    expect(stats.totalRecordings).toBe(1);
    expect(stats.completedTopics).toBe(1);
    expect(stats.totalTopics).toBe(1);
  });

  it('filters students by search query, grade filter, and unassigned grade', async () => {
    const mockStudents = [
      { id: '1', name: 'Alice Smith', grade: 3 },
      { id: '2', name: 'Bob Jones', grade: 4 },
      { id: '3', name: 'Charlie Smith', grade: null },
    ];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

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
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

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

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

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

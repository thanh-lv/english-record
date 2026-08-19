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
  });

  it('filters students by search query and grade filter', async () => {
    const mockStudents = [
      { id: '1', name: 'Alice Smith', grade: 3 },
      { id: '2', name: 'Bob Jones', grade: 4 },
      { id: '3', name: 'Charlie Smith', grade: 3 },
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
      result.current.setGradeFilter('3');
    });
    expect(result.current.filteredStudents).toHaveLength(2);

    act(() => {
      result.current.setGradeFilter('4');
    });
    expect(result.current.filteredStudents).toHaveLength(0);
  });

  it('deletes student and updates student list', async () => {
    const mockStudents = [{ id: '1', name: 'Alice', grade: 3 }];
    (studentService.fetchStudents as any).mockResolvedValue(mockStudents);
    (studentService.deleteStudent as any).mockResolvedValue(undefined);

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
    expect(result.current.students).toHaveLength(0);
    expect(result.current.deleteTarget).toBeNull();
  });
});

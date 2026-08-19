import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAttendanceStudents } from '../useAttendanceStudents';
import { useAttendanceCheckin } from '../useAttendanceCheckin';
import { useAttendanceAnalytics } from '../useAttendanceAnalytics';
import { attendanceService } from '../../../../services/attendanceService';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../services/attendanceService', () => ({
  attendanceService: {
    fetchAttendanceStudents: vi.fn(),
    createAttendanceStudent: vi.fn(),
    updateAttendanceStudent: vi.fn(),
    deleteAttendanceStudent: vi.fn(),
    fetchAttendanceRecords: vi.fn(),
    saveAttendanceCheckin: vi.fn(),
    deleteAttendanceRecord: vi.fn(),
    deleteStudentDayAttendance: vi.fn(),
    fetchAnalyticsData: vi.fn(),
  },
}));

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Attendance Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAttendanceStudents', () => {
    it('fetches attendance students and handles modal creation', async () => {
      const mockStudents = [{ id: 's1', name: 'Alice', unit_price: 100000 }];
      (attendanceService.fetchAttendanceStudents as any).mockResolvedValue(mockStudents);

      const { result } = renderHook(() => useAttendanceStudents({}));
      await act(async () => {});

      expect(result.current.students).toEqual(mockStudents);
      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.openCreateModal();
      });
      expect(result.current.showForm).toBe(true);
      expect(result.current.name).toBe('');
    });
  });

  describe('useAttendanceCheckin', () => {
    it('initializes calendar and loads month attendance records', async () => {
      (attendanceService.fetchAttendanceStudents as any).mockResolvedValue([]);
      (attendanceService.fetchAttendanceRecords as any).mockResolvedValue([
        { id: 'r1', student_id: 's1', checkin_time: '2026-08-05T08:00:00Z' },
      ]);

      const { result } = renderHook(() => useAttendanceCheckin());
      await act(async () => {});

      expect(result.current.monthRecords).toHaveLength(1);
      expect(result.current.calendarCells.length).toBeGreaterThan(27);

      // Month navigation
      await act(async () => {
        result.current.nextMonth();
      });
      expect(attendanceService.fetchAttendanceRecords).toHaveBeenCalled();
    });
  });

  describe('useAttendanceAnalytics', () => {
    it('fetches monthly trends and computes class rates', async () => {
      (attendanceService.fetchAnalyticsData as any).mockResolvedValue([
        { label: 'T8', m: 8, y: 2026, projected: 1000000, collected: 800000 },
      ]);

      const studResMock = vi.fn().mockResolvedValue({
        data: [{ id: 's1', name: 'Alice', class_name: 'Lớp 3A' }],
        error: null,
      });
      const recResMock = vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({
          data: [{ student_id: 's1', checkin_time: '2026-08-05T08:00:00Z' }],
          error: null,
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attendance_students') return { select: studResMock };
        if (table === 'attendance_records')
          return { select: vi.fn().mockReturnValue({ gte: recResMock }) };
        return {};
      });

      const { result } = renderHook(() =>
        useAttendanceAnalytics({ month: 8, year: 2026, tAtt: {} })
      );
      await act(async () => {});

      expect(result.current.monthlyTrends).toHaveLength(1);
      expect(result.current.loading).toBe(false);
    });
  });
});

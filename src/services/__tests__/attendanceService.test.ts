import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attendanceService } from '../attendanceService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('attendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAttendanceStudents', () => {
    it('fetches students ordered by name', async () => {
      const mockStudents = [{ id: '1', name: 'Alice' }];
      const orderMock = vi.fn().mockResolvedValue({ data: mockStudents, error: null });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await attendanceService.fetchAttendanceStudents();
      expect(supabase.from).toHaveBeenCalledWith('attendance_students');
      expect(res).toEqual(mockStudents);
    });
  });

  describe('createAttendanceStudent', () => {
    it('inserts and returns new student', async () => {
      const newStudent = { name: 'Bob', class_name: 'Grade 3' };
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: { id: 's-2', ...newStudent }, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const res = await attendanceService.createAttendanceStudent(newStudent);
      expect(res.id).toBe('s-2');
    });
  });

  describe('updateAttendanceStudent', () => {
    it('updates student by id', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: { id: 's-1', unit_price: 150000 }, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      const res = await attendanceService.updateAttendanceStudent('s-1', { unit_price: 150000 });
      expect(res.unit_price).toBe(150000);
      expect(eqMock).toHaveBeenCalledWith('id', 's-1');
    });
  });

  describe('deleteAttendanceStudent', () => {
    it('deletes student by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await attendanceService.deleteAttendanceStudent('s-1');
      expect(eqMock).toHaveBeenCalledWith('id', 's-1');
    });
  });

  describe('fetchAttendanceRecords', () => {
    it('fetches records within date range', async () => {
      const mockRecords = [{ id: 'r1', student_id: 's1', checkin_time: '2026-08-01T08:00:00Z' }];
      const lteMock = vi.fn().mockResolvedValue({ data: mockRecords, error: null });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await attendanceService.fetchAttendanceRecords(
        '2026-08-01T00:00:00Z',
        '2026-08-31T23:59:59Z'
      );
      expect(res).toEqual(mockRecords);
    });
  });

  describe('saveAttendanceCheckin', () => {
    it('inserts multiple checkin records', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const records = [
        { student_id: 's1', checkin_time: '2026-08-01T08:00:00Z' },
        { student_id: 's2', checkin_time: '2026-08-01T08:00:00Z' },
      ];
      await attendanceService.saveAttendanceCheckin(records);

      expect(supabase.from).toHaveBeenCalledWith('attendance_records');
      expect(insertMock).toHaveBeenCalledWith(records);
    });

    it('does nothing when record list is empty', async () => {
      await attendanceService.saveAttendanceCheckin([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('deleteStudentDayAttendance', () => {
    it('deletes records for a student within a day', async () => {
      const lteMock = vi.fn().mockResolvedValue({ error: null });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const eqMock = vi.fn().mockReturnValue({ gte: gteMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await attendanceService.deleteStudentDayAttendance(
        's1',
        '2026-08-01T00:00:00Z',
        '2026-08-01T23:59:59Z'
      );

      expect(eqMock).toHaveBeenCalledWith('student_id', 's1');
      expect(gteMock).toHaveBeenCalledWith('checkin_time', '2026-08-01T00:00:00Z');
      expect(lteMock).toHaveBeenCalledWith('checkin_time', '2026-08-01T23:59:59Z');
    });
  });

  describe('setPaymentStatus', () => {
    it('upserts payment status in attendance_payments', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ upsert: upsertMock });

      await attendanceService.setPaymentStatus('s1', 2026, 8, true);

      expect(supabase.from).toHaveBeenCalledWith('attendance_payments');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 's1',
          year: 2026,
          month: 8,
          is_paid: true,
        }),
        { onConflict: 'student_id,year,month' }
      );
    });
  });
});

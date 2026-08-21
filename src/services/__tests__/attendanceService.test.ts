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

    it('throws error when database query fails', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(attendanceService.fetchAttendanceStudents()).rejects.toThrow('DB error');
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

    it('throws error on insert failure', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Insert failed') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(attendanceService.createAttendanceStudent({ name: 'Bob' })).rejects.toThrow(
        'Insert failed'
      );
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

    it('throws error on update failure', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Update failed') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await expect(
        attendanceService.updateAttendanceStudent('s-1', { unit_price: 150000 })
      ).rejects.toThrow('Update failed');
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

    it('throws error on delete failure', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete failed') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await expect(attendanceService.deleteAttendanceStudent('s-1')).rejects.toThrow(
        'Delete failed'
      );
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

    it('fetches records filtered by teacherId', async () => {
      const mockRecords = [{ id: 'r1', student_id: 's1', checkin_time: '2026-08-01T08:00:00Z' }];
      const lteMock = vi.fn().mockResolvedValue({ data: mockRecords, error: null });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const inMock = vi.fn().mockReturnValue({ gte: gteMock });
      const selectRecordsMock = vi.fn().mockReturnValue({ in: inMock });

      const eqStudentsMock = vi.fn().mockResolvedValue({ data: [{ id: 's1' }], error: null });
      const selectStudentsMock = vi.fn().mockReturnValue({ eq: eqStudentsMock });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attendance_students') return { select: selectStudentsMock };
        return { select: selectRecordsMock };
      });

      const res = await attendanceService.fetchAttendanceRecords(
        '2026-08-01T00:00:00Z',
        '2026-08-31T23:59:59Z',
        'teacher-123'
      );
      expect(eqStudentsMock).toHaveBeenCalledWith('teacher_id', 'teacher-123');
      expect(inMock).toHaveBeenCalledWith('student_id', ['s1']);
      expect(res).toEqual(mockRecords);
    });

    it('throws error on fetch records failure', async () => {
      const lteMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Records error') });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(
        attendanceService.fetchAttendanceRecords('2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z')
      ).rejects.toThrow('Records error');
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

    it('throws error on save failure', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: new Error('Insert records error') });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(
        attendanceService.saveAttendanceCheckin([
          { student_id: 's1', checkin_time: '2026-08-01T08:00:00Z' },
        ])
      ).rejects.toThrow('Insert records error');
    });
  });

  describe('deleteAttendanceRecord', () => {
    it('deletes record by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await attendanceService.deleteAttendanceRecord('rec-1');
      expect(eqMock).toHaveBeenCalledWith('id', 'rec-1');
    });

    it('throws error on delete record failure', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete record failed') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await expect(attendanceService.deleteAttendanceRecord('rec-1')).rejects.toThrow(
        'Delete record failed'
      );
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

    it('throws error when delete student day attendance fails', async () => {
      const lteMock = vi.fn().mockResolvedValue({ error: new Error('Delete day error') });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const eqMock = vi.fn().mockReturnValue({ gte: gteMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await expect(
        attendanceService.deleteStudentDayAttendance(
          's1',
          '2026-08-01T00:00:00Z',
          '2026-08-01T23:59:59Z'
        )
      ).rejects.toThrow('Delete day error');
    });
  });

  describe('fetchAttendancePayments', () => {
    it('fetches payments for year and month', async () => {
      const mockPayments = [{ id: 'p1', student_id: 's1', is_paid: true, year: 2026, month: 8 }];
      const eqMonthMock = vi.fn().mockResolvedValue({ data: mockPayments, error: null });
      const eqYearMock = vi.fn().mockReturnValue({ eq: eqMonthMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqYearMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await attendanceService.fetchAttendancePayments(2026, 8);
      expect(eqYearMock).toHaveBeenCalledWith('year', 2026);
      expect(eqMonthMock).toHaveBeenCalledWith('month', 8);
      expect(res).toEqual(mockPayments);
    });

    it('fetches payments filtered by teacherId', async () => {
      const mockPayments = [{ id: 'p1', student_id: 's1', is_paid: true, year: 2026, month: 8 }];
      const eqMonthMock = vi.fn().mockResolvedValue({ data: mockPayments, error: null });
      const eqYearMock = vi.fn().mockReturnValue({ eq: eqMonthMock });
      const inMock = vi.fn().mockReturnValue({ eq: eqYearMock });
      const selectPaymentsMock = vi.fn().mockReturnValue({ in: inMock });

      const eqStudentsMock = vi.fn().mockResolvedValue({ data: [{ id: 's1' }], error: null });
      const selectStudentsMock = vi.fn().mockReturnValue({ eq: eqStudentsMock });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attendance_students') return { select: selectStudentsMock };
        return { select: selectPaymentsMock };
      });

      const res = await attendanceService.fetchAttendancePayments(2026, 8, 'teacher-123');
      expect(eqStudentsMock).toHaveBeenCalledWith('teacher_id', 'teacher-123');
      expect(inMock).toHaveBeenCalledWith('student_id', ['s1']);
      expect(eqYearMock).toHaveBeenCalledWith('year', 2026);
      expect(eqMonthMock).toHaveBeenCalledWith('month', 8);
      expect(res).toEqual(mockPayments);
    });

    it('throws error on payments fetch failure', async () => {
      const eqMonthMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Payments error') });
      const eqYearMock = vi.fn().mockReturnValue({ eq: eqMonthMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqYearMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(attendanceService.fetchAttendancePayments(2026, 8)).rejects.toThrow(
        'Payments error'
      );
    });
  });

  describe('setPaymentStatus', () => {
    it('upserts payment status with paid_at when isPaid is true', async () => {
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
          paid_at: expect.any(String),
        }),
        { onConflict: 'student_id,year,month' }
      );
    });

    it('upserts payment status with paid_at null when isPaid is false', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ upsert: upsertMock });

      await attendanceService.setPaymentStatus('s1', 2026, 8, false);

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 's1',
          year: 2026,
          month: 8,
          is_paid: false,
          paid_at: null,
        }),
        { onConflict: 'student_id,year,month' }
      );
    });

    it('throws error when upsert fails', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: new Error('Upsert error') });
      (supabase.from as any).mockReturnValue({ upsert: upsertMock });

      await expect(attendanceService.setPaymentStatus('s1', 2026, 8, true)).rejects.toThrow(
        'Upsert error'
      );
    });
  });

  describe('fetchAnalyticsData', () => {
    it('aggregates 6 months of projected and collected revenue with custom paymentsMap', async () => {
      const studentsData = [
        { id: 's1', unit_price: 100000 },
        { id: 's2', unit_price: 150000 },
        { id: 's3', unit_price: null }, // edge case: missing unit_price
      ];
      const recordsData = [
        { student_id: 's1' },
        { student_id: 's1' }, // s1 has 2 sessions: 200k
        { student_id: 's2' }, // s2 has 1 session: 150k
        { student_id: 's3' }, // s3 has 1 session: 0k
      ];
      const paymentsData = [{ student_id: 's1', is_paid: true }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attendance_students') {
          return {
            select: vi.fn().mockResolvedValue({ data: studentsData, error: null }),
          };
        }
        if (table === 'attendance_records') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: recordsData, error: null }),
              }),
            }),
          };
        }
        if (table === 'attendance_payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: paymentsData, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      // Pass paymentsMap for current month (August 2026) where s1 and s2 are paid
      const paymentsMap = { s1: true, s2: true };
      const res = await attendanceService.fetchAnalyticsData(2026, 8, paymentsMap);

      expect(res).toHaveLength(6);
      // For current month (m: 8, y: 2026)
      const currentMonth = res.find(r => r.m === 8 && r.y === 2026);
      expect(currentMonth).toBeDefined();
      expect(currentMonth?.projected).toBe(350000); // 200k + 150k
      expect(currentMonth?.collected).toBe(350000); // Both paid in paymentsMap

      // For previous months (e.g. m: 7), it uses paymentsData from db (where only s1 is paid)
      const prevMonth = res.find(r => r.m === 7);
      expect(prevMonth?.projected).toBe(350000);
      expect(prevMonth?.collected).toBe(200000); // Only s1 paid in db paymentsData
    });

    it('aggregates revenue correctly without paymentsMap using db payments for all months', async () => {
      const studentsData = [{ id: 's1', unit_price: 200000 }];
      const recordsData = [{ student_id: 's1' }];
      const paymentsData = [{ student_id: 's1', is_paid: true }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attendance_students') {
          return { select: vi.fn().mockResolvedValue({ data: studentsData, error: null }) };
        }
        if (table === 'attendance_records') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: recordsData, error: null }),
              }),
            }),
          };
        }
        if (table === 'attendance_payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: paymentsData, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await attendanceService.fetchAnalyticsData(2026, 8);
      expect(res).toHaveLength(6);
      expect(res[5].projected).toBe(200000);
      expect(res[5].collected).toBe(200000);
    });
  });
});

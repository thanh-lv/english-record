import { supabase } from '../lib/supabase';
import { withServiceHandling } from './serviceHandler';
import {
  AttendanceStudent,
  AttendanceRecord,
  AttendancePayment,
  AttendanceStudentPayload,
  AttendanceMonthlyTrend,
} from '../types';
import {
  parseApiResponse,
  attendanceStudentsResponseArraySchema,
  attendanceRecordsResponseArraySchema,
  attendancePaymentsResponseArraySchema,
} from '../schemas';

export type {
  AttendanceStudent,
  AttendanceRecord,
  AttendancePayment,
  AttendanceStudentPayload,
  AttendanceMonthlyTrend,
};

export const attendanceService = {
  async fetchAttendanceStudents(): Promise<AttendanceStudent[]> {
    return withServiceHandling('attendanceService', 'fetchAttendanceStudents', async () => {
      const { data, error } = await supabase.from('attendance_students').select('*').order('name');
      if (error) throw error;
      return parseApiResponse(
        attendanceStudentsResponseArraySchema,
        data || []
      ) as AttendanceStudent[];
    });
  },

  async createAttendanceStudent(payload: AttendanceStudentPayload): Promise<AttendanceStudent> {
    return withServiceHandling('attendanceService', 'createAttendanceStudent', async () => {
      const { data, error } = await supabase
        .from('attendance_students')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceStudent;
    });
  },

  async updateAttendanceStudent(
    id: string,
    payload: Partial<AttendanceStudentPayload>
  ): Promise<AttendanceStudent> {
    return withServiceHandling('attendanceService', 'updateAttendanceStudent', async () => {
      const { data, error } = await supabase
        .from('attendance_students')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceStudent;
    });
  },

  async deleteAttendanceStudent(id: string): Promise<void> {
    return withServiceHandling('attendanceService', 'deleteAttendanceStudent', async () => {
      const { error } = await supabase.from('attendance_students').delete().eq('id', id);
      if (error) throw error;
    });
  },

  async fetchAttendanceRecords(
    startDateIso: string,
    endDateIso: string
  ): Promise<AttendanceRecord[]> {
    return withServiceHandling('attendanceService', 'fetchAttendanceRecords', async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, student_id, checkin_time')
        .gte('checkin_time', startDateIso)
        .lte('checkin_time', endDateIso);

      if (error) throw error;
      return parseApiResponse(
        attendanceRecordsResponseArraySchema,
        data || []
      ) as AttendanceRecord[];
    });
  },

  async saveAttendanceCheckin(
    records: Array<{ student_id: string; checkin_time: string }>
  ): Promise<void> {
    return withServiceHandling('attendanceService', 'saveAttendanceCheckin', async () => {
      if (records.length === 0) return;
      const { error } = await supabase.from('attendance_records').insert(records);
      if (error) throw error;
    });
  },

  async deleteAttendanceRecord(id: string): Promise<void> {
    return withServiceHandling('attendanceService', 'deleteAttendanceRecord', async () => {
      const { error } = await supabase.from('attendance_records').delete().eq('id', id);
      if (error) throw error;
    });
  },

  async deleteStudentDayAttendance(
    studentId: string,
    startOfDayIso: string,
    endOfDayIso: string
  ): Promise<void> {
    return withServiceHandling('attendanceService', 'deleteStudentDayAttendance', async () => {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('student_id', studentId)
        .gte('checkin_time', startOfDayIso)
        .lte('checkin_time', endOfDayIso);
      if (error) throw error;
    });
  },

  async fetchAttendancePayments(year: number, month: number): Promise<AttendancePayment[]> {
    return withServiceHandling('attendanceService', 'fetchAttendancePayments', async () => {
      const { data, error } = await supabase
        .from('attendance_payments')
        .select('*')
        .eq('year', year)
        .eq('month', month);

      if (error) throw error;
      return parseApiResponse(
        attendancePaymentsResponseArraySchema,
        data || []
      ) as AttendancePayment[];
    });
  },

  async setPaymentStatus(
    studentId: string,
    year: number,
    month: number,
    isPaid: boolean
  ): Promise<void> {
    return withServiceHandling('attendanceService', 'setPaymentStatus', async () => {
      const { error } = await supabase.from('attendance_payments').upsert(
        {
          student_id: studentId,
          year,
          month,
          is_paid: isPaid,
          paid_at: isPaid ? new Date().toISOString() : null,
        },
        { onConflict: 'student_id,year,month' }
      );

      if (error) throw error;
    });
  },

  async fetchAnalyticsData(year: number, month: number, paymentsMap?: Record<string, boolean>) {
    return withServiceHandling('attendanceService', 'fetchAnalyticsData', async () => {
      // 6-month list
      const monthsList = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        monthsList.push({
          m: d.getMonth() + 1,
          y: d.getFullYear(),
          label: `T${d.getMonth() + 1}`,
        });
      }

      const trendData = await Promise.all(
        monthsList.map(async ({ m, y, label }) => {
          const startDate = new Date(y, m - 1, 1).toISOString();
          const endDate = new Date(y, m, 0, 23, 59, 59).toISOString();

          const [studRes, recRes, payRes] = await Promise.all([
            supabase.from('attendance_students').select('id, unit_price'),
            supabase
              .from('attendance_records')
              .select('student_id')
              .gte('checkin_time', startDate)
              .lte('checkin_time', endDate),
            supabase
              .from('attendance_payments')
              .select('student_id, is_paid')
              .eq('year', y)
              .eq('month', m)
              .eq('is_paid', true),
          ]);

          const priceMap: Record<string, number> = {};
          (studRes.data || []).forEach(s => {
            priceMap[s.id] = Number(s.unit_price) || 0;
          });

          const studentSessions: Record<string, number> = {};
          (recRes.data || []).forEach(r => {
            studentSessions[r.student_id] = (studentSessions[r.student_id] || 0) + 1;
          });

          let projected = 0;
          let collected = 0;

          const paidStudents = new Set((payRes.data || []).map(p => p.student_id));

          Object.entries(studentSessions).forEach(([studId, count]) => {
            const fee = count * (priceMap[studId] || 0);
            projected += fee;
            const isPaid =
              m === month && y === year && paymentsMap
                ? Boolean(paymentsMap[studId])
                : paidStudents.has(studId);
            if (isPaid) collected += fee;
          });

          return { label, projected, collected, m, y };
        })
      );

      return trendData;
    });
  },
};

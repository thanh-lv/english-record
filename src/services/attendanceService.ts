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
  async fetchAttendanceStudents(teacherId?: string): Promise<AttendanceStudent[]> {
    return withServiceHandling('attendanceService', 'fetchAttendanceStudents', async () => {
      let query = supabase.from('attendance_students').select('*').order('name');

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return parseApiResponse(
        attendanceStudentsResponseArraySchema,
        data || [],
        (data || []) as AttendanceStudent[]
      ) as AttendanceStudent[];
    });
  },

  async createAttendanceStudent(payload: AttendanceStudentPayload): Promise<AttendanceStudent> {
    return withServiceHandling('attendanceService', 'createAttendanceStudent', async () => {
      const insertPayload: any = {
        name: payload.name,
        class_name: payload.class_name || 'Chưa phân lớp',
        unit_price: payload.unit_price ?? 0,
        phone: payload.phone || null,
        hoc_lieu_label: payload.hoc_lieu_label || '📚 Học liệu',
        hoc_lieu_value: payload.hoc_lieu_value ?? 0,
        note: payload.note || '',
      };
      if (payload.teacher_id) {
        insertPayload.teacher_id = payload.teacher_id;
      }

      const { data, error } = await supabase
        .from('attendance_students')
        .insert(insertPayload)
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
      const updatePayload: any = {};
      if (payload.name !== undefined) updatePayload.name = payload.name;
      if (payload.class_name !== undefined) updatePayload.class_name = payload.class_name;
      if (payload.unit_price !== undefined) updatePayload.unit_price = payload.unit_price;
      if (payload.phone !== undefined) updatePayload.phone = payload.phone;
      if (payload.hoc_lieu_label !== undefined)
        updatePayload.hoc_lieu_label = payload.hoc_lieu_label;
      if (payload.hoc_lieu_value !== undefined)
        updatePayload.hoc_lieu_value = payload.hoc_lieu_value;
      if (payload.note !== undefined) updatePayload.note = payload.note;
      if (payload.teacher_id !== undefined) updatePayload.teacher_id = payload.teacher_id;

      const { data, error } = await supabase
        .from('attendance_students')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceStudent;
    });
  },

  async deleteAttendanceStudent(id: string): Promise<void> {
    return withServiceHandling('attendanceService', 'deleteAttendanceStudent', async () => {
      await supabase.from('attendance_records').delete().eq('student_id', id);
      const { error } = await supabase.from('attendance_students').delete().eq('id', id);
      if (error) throw error;
    });
  },

  async fetchAttendanceRecords(
    startDateIso: string,
    endDateIso: string,
    teacherId?: string
  ): Promise<AttendanceRecord[]> {
    return withServiceHandling('attendanceService', 'fetchAttendanceRecords', async () => {
      let studentIds: string[] | null = null;
      if (teacherId) {
        const { data: studs, error: studErr } = await supabase
          .from('attendance_students')
          .select('id')
          .eq('teacher_id', teacherId);
        if (studErr) throw studErr;
        studentIds = (studs || []).map((s: any) => s.id);
        if (studentIds.length === 0) return [];
      }

      let query: any = supabase.from('attendance_records').select('id, student_id, checkin_time');

      if (studentIds !== null) {
        query = query.in('student_id', studentIds);
      }

      const { data, error } = await query
        .gte('checkin_time', startDateIso)
        .lte('checkin_time', endDateIso);

      if (error) throw error;
      return parseApiResponse(
        attendanceRecordsResponseArraySchema,
        data || [],
        (data || []) as AttendanceRecord[]
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

  async fetchAttendancePayments(
    year: number,
    month: number,
    teacherId?: string
  ): Promise<AttendancePayment[]> {
    return withServiceHandling('attendanceService', 'fetchAttendancePayments', async () => {
      let studentIds: string[] | null = null;
      if (teacherId) {
        const { data: studs, error: studErr } = await supabase
          .from('attendance_students')
          .select('id')
          .eq('teacher_id', teacherId);
        if (studErr) throw studErr;
        studentIds = (studs || []).map((s: any) => s.id);
        if (studentIds.length === 0) return [];
      }

      let query: any = supabase
        .from('attendance_payments')
        .select('id, student_id, year, month, is_paid, paid_at, notes, created_at, updated_at');

      if (studentIds !== null) {
        query = query.in('student_id', studentIds);
      }

      const { data, error } = await query.eq('year', year).eq('month', month);

      if (error) throw error;
      return parseApiResponse(
        attendancePaymentsResponseArraySchema,
        data || [],
        (data || []) as AttendancePayment[]
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

  async fetchAnalyticsData(
    year: number,
    month: number,
    paymentsMap?: Record<string, boolean>,
    teacherId?: string
  ) {
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

          let studQuery = supabase.from('attendance_students').select('id, unit_price');
          if (teacherId) {
            studQuery = studQuery.eq('teacher_id', teacherId);
          }

          let recQuery: any = supabase.from('attendance_records').select('student_id');
          if (teacherId) {
            recQuery = supabase
              .from('attendance_records')
              .select('student_id, attendance_students!inner(teacher_id)')
              .eq('attendance_students.teacher_id', teacherId);
          }

          let payQuery: any = supabase
            .from('attendance_payments')
            .select('student_id, is_paid')
            .eq('year', y)
            .eq('month', m)
            .eq('is_paid', true);
          if (teacherId) {
            payQuery = supabase
              .from('attendance_payments')
              .select('student_id, is_paid, attendance_students!inner(teacher_id)')
              .eq('attendance_students.teacher_id', teacherId)
              .eq('year', y)
              .eq('month', m)
              .eq('is_paid', true);
          }

          const [studRes, recRes, payRes] = await Promise.all([
            studQuery,
            recQuery.gte('checkin_time', startDate).lte('checkin_time', endDate),
            payQuery,
          ]);

          const priceMap: Record<string, number> = {};
          const teacherStudentIds = new Set<string>();
          (studRes.data || []).forEach(s => {
            priceMap[s.id] = Number(s.unit_price) || 0;
            teacherStudentIds.add(s.id);
          });

          const studentSessions: Record<string, number> = {};
          (recRes.data || []).forEach((r: any) => {
            // Only count sessions for this teacher's students
            if (teacherId && !teacherStudentIds.has(r.student_id)) return;
            studentSessions[r.student_id] = (studentSessions[r.student_id] || 0) + 1;
          });

          let projected = 0;
          let collected = 0;

          const paidStudents = new Set((payRes.data || []).map((p: any) => p.student_id));

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

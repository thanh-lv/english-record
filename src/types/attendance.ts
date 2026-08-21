export interface AttendanceStudent {
  id: string;
  name: string;
  class_name?: string;
  unit_price?: number;
  phone?: string;
  zalo_phone?: string;
  hoc_lieu_label?: string;
  hoc_lieu_value?: number;
  note?: string;
  student_note?: string;
  created_at?: string;
  teacher_id?: string;
}

export type Student = AttendanceStudent;

export interface AttendanceStudentPayload {
  name: string;
  class_name?: string;
  unit_price?: number;
  phone?: string;
  zalo_phone?: string;
  hoc_lieu_label?: string;
  hoc_lieu_value?: number;
  note?: string;
  teacher_id?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  checkin_time: string;
  attendance_students?: {
    name: string;
    unit_price?: number;
  };
}

export interface AttendancePayment {
  id: string;
  student_id: string;
  month: number;
  year: number;
  is_paid: boolean;
  paid_at?: string | null;
}

export interface AttendanceMonthlyTrend {
  label: string;
  fullLabel?: string;
  projected: number;
  collected: number;
  m: number;
  y: number;
}

export interface ClassAttendanceRate {
  cls: string;
  totalStudents: number;
  totalSessions: number;
  avgSessions: number;
}

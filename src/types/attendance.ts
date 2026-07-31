export interface Student {
  id: string;
  name: string;
  class_name?: string;
  unit_price?: number;
  phone?: string;
  zalo_phone?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  checkin_time: string;
}

export interface AttendancePayment {
  id: string;
  student_id: string;
  month: number;
  year: number;
  is_paid: boolean;
  paid_at?: string;
}

import { z } from 'zod';
import { sanitizeString, phoneSchema, coerceNullableNumber, coerceNumber } from './common.schema';

/**
 * Attendance Student schema
 */
export const attendanceStudentSchema = z.object({
  name: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 2, {
      message: 'Tên học sinh phải có ít nhất 2 ký tự.',
    })
    .refine(val => val.length <= 50, {
      message: 'Tên học sinh không được vượt quá 50 ký tự.',
    }),
  class_name: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 50, {
      message: 'Tên lớp không được vượt quá 50 ký tự.',
    })
    .optional()
    .default('Chưa phân lớp'),
  unit_price: z
    .number()
    .int('Học phí phải là số nguyên.')
    .min(0, 'Học phí không được là số âm.')
    .max(100_000_000, 'Số tiền không được vượt quá 100.000.000đ.')
    .default(0),
  hoc_lieu: z
    .number()
    .int('Tiền học liệu phải là số nguyên.')
    .min(0, 'Tiền học liệu không được là số âm.')
    .max(100_000_000, 'Số tiền không được vượt quá 100.000.000đ.')
    .optional()
    .default(0),
  phone: phoneSchema.optional().nullable(),
  note: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 1000, {
      message: 'Ghi chú không được vượt quá 1000 ký tự.',
    })
    .optional()
    .nullable(),
});

export type AttendanceStudentInput = z.infer<typeof attendanceStudentSchema>;

/* ==========================================================================
   API Response Boundary Schemas (Runtime validation for external/DB data)
   ========================================================================== */

export const attendanceStudentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  class_name: z.string().nullable().optional(),
  unit_price: coerceNullableNumber,
  phone: z.string().nullable().optional(),
  zalo_phone: z.string().nullable().optional(),
  hoc_lieu: coerceNullableNumber,
  hoc_lieu_fee: coerceNullableNumber,
  note: z.string().nullable().optional(),
  student_note: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const attendanceStudentsResponseArraySchema = z.array(attendanceStudentResponseSchema);

export const attendanceRecordResponseSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  checkin_time: z.string(),
  attendance_students: z
    .object({
      name: z.string(),
      unit_price: coerceNullableNumber,
    })
    .nullable()
    .optional(),
});

export const attendanceRecordsResponseArraySchema = z.array(attendanceRecordResponseSchema);

export const attendancePaymentResponseSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  month: z.coerce.number(),
  year: z.coerce.number(),
  is_paid: z.boolean().default(false),
  paid_at: z.string().nullable().optional(),
});

export const attendancePaymentsResponseArraySchema = z.array(attendancePaymentResponseSchema);

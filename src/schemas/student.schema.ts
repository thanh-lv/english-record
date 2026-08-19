import { z } from 'zod';
import { sanitizeString } from './common.schema';

const currentYear = new Date().getFullYear();

/**
 * Student name schema (2-50 characters, non-empty after sanitize)
 */
export const studentNameSchema = z
  .string()
  .transform(val => sanitizeString(val))
  .refine(val => val.length >= 2, {
    message: 'Tên học sinh phải có ít nhất 2 ký tự.',
  })
  .refine(val => val.length <= 50, {
    message: 'Tên học sinh không được vượt quá 50 ký tự.',
  });

/**
 * Student password schema (3-100 characters)
 */
export const studentPasswordSchema = z
  .string()
  .trim()
  .min(3, 'Mật khẩu phải có ít nhất 3 ký tự.')
  .max(100, 'Mật khẩu không được vượt quá 100 ký tự.');

/**
 * Year of birth schema (dynamic based on current year)
 */
export const yearBornSchema = z.preprocess(
  val => (typeof val === 'string' ? parseInt(val.trim(), 10) : val),
  z
    .number()
    .int('Năm sinh phải là số nguyên.')
    .min(currentYear - 25, `Năm sinh tối thiểu là ${currentYear - 25}.`)
    .max(currentYear - 2, `Năm sinh tối đa là ${currentYear - 2}.`)
);

/**
 * Student grade schema (optional or 1-12)
 */
export const studentGradeSchema = z.preprocess(val => {
  if (val === '' || val === null || val === undefined) return null;
  return typeof val === 'string' ? parseInt(val.trim(), 10) : val;
}, z.number().int('Khối / Lớp phải là số nguyên.').min(1, 'Khối / Lớp phải từ 1 đến 12.').max(12, 'Khối / Lớp phải từ 1 đến 12.').nullable());

/**
 * Create student payload schema
 */
export const createStudentSchema = z.object({
  name: studentNameSchema,
  password: studentPasswordSchema,
  year_born: yearBornSchema,
  grade: studentGradeSchema.optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/**
 * Edit student payload schema
 */
export const editStudentSchema = z.object({
  year_born: yearBornSchema,
  grade: studentGradeSchema.optional(),
});

export type EditStudentInput = z.infer<typeof editStudentSchema>;

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  password: studentPasswordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

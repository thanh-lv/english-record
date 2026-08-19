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

/* ==========================================================================
   API Response Boundary Schemas (Runtime validation for external/DB data)
   ========================================================================== */

export const userProfileResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['student', 'teacher']).default('student'),
  avatar: z.string().nullable().optional(),
  year_born: z.number().nullable().optional(),
  grade: z.number().nullable().optional(),
  language: z.string().nullable().optional(),
  auth_uid: z.string().nullable().optional(),
  auth_user_id: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const userProfilesResponseArraySchema = z.array(userProfileResponseSchema);

export const recordingResponseSchema = z.object({
  id: z.string(),
  student_name: z.string().optional(),
  topic_id: z.string().nullable().optional(),
  topic_number: z.union([z.string(), z.number()]).nullable().optional(),
  topic: z.string().nullable().optional(),
  question_id: z.string().nullable().optional(),
  question_text: z.string().nullable().optional(),
  audio_url: z.string().optional(),
  created_at: z.string().optional(),
  shadowing_video_id: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  teacher_rating: z.number().nullable().optional(),
  teacher_feedback: z.string().nullable().optional(),
  student_reaction: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
  shadowing_videos: z
    .object({
      youtube_url: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const recordingsResponseArraySchema = z.array(recordingResponseSchema);

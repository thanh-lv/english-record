import { z } from 'zod';
import { sanitizeInput } from '../utils/security';

/**
 * Remove harmful invisible control characters, strip XSS script vectors, and trim whitespace
 */
export function sanitizeString(text: string | null | undefined): string {
  return sanitizeInput(text);
}

/**
 * Zod custom transformer that automatically sanitizes input string
 */
export const sanitizedString = z.string().transform(val => sanitizeString(val));

/**
 * Safely parses and coerces a value to a number, null, or undefined.
 * Preserves undefined if field is omitted, coerces empty string to null, and strings to numbers.
 */
export const coerceNullableNumber = z.preprocess(val => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}, z.number().nullable().optional());

/**
 * Safely parses and coerces a value to a valid number or undefined if omitted.
 */
export const coerceNumber = z.preprocess(val => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}, z.number().optional().default(0));

/**
 * Vietnam mobile phone number regex (10 digits starting with 03, 05, 07, 08, 09, or +84)
 */
export const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

export const phoneSchema = z
  .string()
  .trim()
  .refine(val => !val || VN_PHONE_REGEX.test(val.replace(/[\s.-]/g, '')), {
    message: 'Số điện thoại không hợp lệ (gồm 10 chữ số, ví dụ 0912345678).',
  });

/**
 * Grades array schema (numbers 1-12)
 */
export const gradeNumberSchema = z
  .number()
  .int()
  .min(1, 'Khối lớp phải từ 1 đến 12.')
  .max(12, 'Khối lớp phải từ 1 đến 12.');

export const gradesArraySchema = z.array(gradeNumberSchema);

/**
 * Helper to validate data against any Zod schema with user-friendly error formatting
 */
export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstIssue = result.error.issues[0];
  const errorMessage = firstIssue ? firstIssue.message : 'Dữ liệu không hợp lệ.';
  return { success: false, error: errorMessage, issues: result.error.issues };
}

/**
 * Validates and parses incoming external API response payloads at the system boundary.
 * Throws a formatted Error or returns fallback if validation fails.
 */
export function parseApiResponse<T>(schema: z.ZodType<T>, data: unknown, fallback?: T): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  const firstIssue = result.error.issues[0];
  const path = firstIssue?.path?.length ? ` (${firstIssue.path.join('.')})` : '';
  throw new Error(
    `API Boundary Validation Error${path}: ${firstIssue?.message || 'Dữ liệu API không đúng định dạng'}`
  );
}

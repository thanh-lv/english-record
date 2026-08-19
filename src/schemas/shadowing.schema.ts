import { z } from 'zod';
import { sanitizeString, gradesArraySchema, coerceNullableNumber } from './common.schema';

const YOUTUBE_REGEX = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;

/**
 * Extract YouTube ID (must be 11 characters)
 */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(YOUTUBE_REGEX);
  return match && match[2].length === 11 ? match[2] : null;
}

export const shadowingVideoSchema = z
  .object({
    title: z
      .string()
      .transform(val => sanitizeString(val))
      .refine(val => val.length >= 2, {
        message: 'Tiêu đề video phải có ít nhất 2 ký tự.',
      })
      .refine(val => val.length <= 150, {
        message: 'Tiêu đề video không được vượt quá 150 ký tự.',
      }),
    youtube_url: z
      .string()
      .trim()
      .refine(val => Boolean(extractYoutubeId(val)), {
        message: 'Đường dẫn YouTube không hợp lệ (cần video ID 11 ký tự).',
      }),
    preview_start: z.number().nonnegative('Thời gian không được là số âm.').nullable().optional(),
    preview_end: z.number().nonnegative('Thời gian không được là số âm.').nullable().optional(),
    record_start: z.number().nonnegative('Thời gian không được là số âm.').nullable().optional(),
    record_end: z.number().nonnegative('Thời gian không được là số âm.').nullable().optional(),
    grades: gradesArraySchema.optional().default([]),
  })
  .refine(
    data => {
      if (
        data.preview_start !== null &&
        data.preview_start !== undefined &&
        data.preview_end !== null &&
        data.preview_end !== undefined
      ) {
        return data.preview_start < data.preview_end;
      }
      return true;
    },
    {
      message: 'Thời gian bắt đầu xem trước phải nhỏ hơn thời gian kết thúc.',
      path: ['preview_start'],
    }
  )
  .refine(
    data => {
      if (
        data.record_start !== null &&
        data.record_start !== undefined &&
        data.record_end !== null &&
        data.record_end !== undefined
      ) {
        return data.record_start < data.record_end;
      }
      return true;
    },
    {
      message: 'Thời gian bắt đầu ghi âm phải nhỏ hơn thời gian kết thúc.',
      path: ['record_start'],
    }
  );

export type ShadowingVideoInput = z.infer<typeof shadowingVideoSchema>;

/* ==========================================================================
   API Response Boundary Schemas (Runtime validation for external/DB data)
   ========================================================================== */

export const shadowingVideoResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  youtube_url: z.string().optional(),
  preview_start: coerceNullableNumber,
  preview_end: coerceNullableNumber,
  record_start: coerceNullableNumber,
  record_end: coerceNullableNumber,
  grades: z.array(z.coerce.number()).nullable().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
});

export const shadowingVideosResponseArraySchema = z.array(shadowingVideoResponseSchema);

import { z } from 'zod';
import { sanitizeString, gradesArraySchema, coerceNullableNumber } from './common.schema';

/**
 * Extract YouTube ID (11 characters) from any YouTube URL format
 * (watch?v=, youtu.be/, shorts/, live/, embed/, mobile m., with any query params or whitespace)
 */
export function extractYoutubeId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Must belong to YouTube domain
  const isYouTubeDomain = /(?:youtube(?:-nocookie)?\.com|youtu\.be)/i.test(trimmed);
  if (!isYouTubeDomain) {
    return null;
  }

  // 1. Query parameter `v=ID` (e.g. youtube.com/watch?v=ID, m.youtube.com/watch?feature=...&v=ID)
  const vParamMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})(?:[&#?%/\s]|$)/i);
  if (vParamMatch && vParamMatch[1]) {
    return vParamMatch[1];
  }

  // 2. Path-based: youtu.be/ID, /shorts/ID, /embed/ID, /live/ID, /v/ID, /e/ID, /watch/ID
  const pathMatch = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|e\/|shorts\/|live\/|watch\/))([a-zA-Z0-9_-]{11})(?:[&#?%/\s]|$)/i
  );
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  return null;
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
  teacher_id: z.string().nullable().optional(),
});

export const shadowingVideosResponseArraySchema = z.array(shadowingVideoResponseSchema);

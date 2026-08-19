import { z } from 'zod';
import { sanitizeString, gradesArraySchema } from './common.schema';

/**
 * Vocabulary Set schema
 */
export const vocabSetSchema = z.object({
  title: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 2, {
      message: 'Tên bộ từ vựng phải có ít nhất 2 ký tự.',
    })
    .refine(val => val.length <= 100, {
      message: 'Tên bộ từ vựng không được vượt quá 100 ký tự.',
    }),
  emoji: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 10, {
      message: 'Emoji không được vượt quá 10 ký tự.',
    })
    .optional()
    .default('📚'),
  grades: gradesArraySchema.optional().default([]),
});

export type VocabSetInput = z.infer<typeof vocabSetSchema>;

/**
 * Vocabulary Card schema
 */
export const vocabCardSchema = z.object({
  set_id: z.string().optional(),
  front: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 1, {
      message: 'Vui lòng nhập từ tiếng Anh.',
    })
    .refine(val => val.length <= 200, {
      message: 'Từ vựng không được vượt quá 200 ký tự.',
    }),
  back: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 1, {
      message: 'Vui lòng nhập nghĩa tiếng Việt.',
    })
    .refine(val => val.length <= 500, {
      message: 'Nghĩa không được vượt quá 500 ký tự.',
    }),
  ipa: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 100, {
      message: 'Phiên âm IPA không được vượt quá 100 ký tự.',
    })
    .optional()
    .nullable(),
  image_url: z.string().nullable().optional(),
  order_index: z.number().int().nonnegative().optional().default(0),
});

export type VocabCardInput = z.infer<typeof vocabCardSchema>;

/**
 * Vocab Audio Builder save payload schema
 */
export const vocabAudioBuilderSchema = z.object({
  title: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 2, {
      message: 'Tên bài nghe phải có ít nhất 2 ký tự.',
    })
    .refine(val => val.length <= 100, {
      message: 'Tên bài nghe không được vượt quá 100 ký tự.',
    }),
  word_list: z
    .array(z.string())
    .min(1, 'Danh sách từ vựng không được để trống.')
    .max(1000, 'Danh sách từ vựng vượt quá số lượng cho phép.'),
  audio_url: z.string().optional(),
  words_count: z.number().int().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  config_summary: z.string().optional(),
});

export type VocabAudioBuilderInput = z.infer<typeof vocabAudioBuilderSchema>;

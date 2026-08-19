import { z } from 'zod';
import { sanitizeString, gradesArraySchema } from './common.schema';

/**
 * Story schema
 */
export const storySchema = z.object({
  title: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 2, {
      message: 'Tiêu đề truyện phải có ít nhất 2 ký tự.',
    })
    .refine(val => val.length <= 150, {
      message: 'Tiêu đề truyện không được vượt quá 150 ký tự.',
    }),
  content: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 10, {
      message: 'Nội dung truyện phải có ít nhất 10 ký tự.',
    })
    .refine(val => val.length <= 10000, {
      message: 'Nội dung truyện không được vượt quá 10,000 ký tự.',
    }),
  emoji: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 10, {
      message: 'Emoji không được vượt quá 10 ký tự.',
    })
    .optional()
    .default('📚'),
  type: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 50, {
      message: 'Thể loại không được vượt quá 50 ký tự.',
    })
    .optional()
    .default('Truyện tranh'),
  image_url: z.string().nullable().optional(),
  grades: gradesArraySchema.optional().default([]),
  is_active: z.boolean().optional().default(true),
});

export type StoryInput = z.infer<typeof storySchema>;

/**
 * AI story prompt schema
 */
export const aiStoryPromptSchema = z.object({
  prompt: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 3, {
      message: 'Gợi ý cho AI phải có ít nhất 3 ký tự.',
    })
    .refine(val => val.length <= 500, {
      message: 'Gợi ý cho AI không được vượt quá 500 ký tự.',
    }),
  grades: gradesArraySchema.optional().default([]),
});

export type AiStoryPromptInput = z.infer<typeof aiStoryPromptSchema>;

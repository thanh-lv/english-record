import { z } from 'zod';
import { sanitizeString, gradesArraySchema } from './common.schema';

/**
 * Topic title schema (2-100 characters)
 */
export const topicTitleSchema = z
  .string()
  .transform(val => sanitizeString(val))
  .refine(val => val.length >= 2, {
    message: 'Tên chủ đề phải có ít nhất 2 ký tự.',
  })
  .refine(val => val.length <= 100, {
    message: 'Tên chủ đề không được vượt quá 100 ký tự.',
  });

/**
 * Create topic schema
 */
export const createTopicSchema = z.object({
  title: topicTitleSchema,
  type: z.enum(['standard', 'bongbe']).default('standard'),
  order_index: z.number().int().nonnegative().optional().default(0),
  grades: gradesArraySchema.optional().default([]),
});

export type CreateTopicInput = z.infer<typeof createTopicSchema>;

/**
 * Update topic schema
 */
export const updateTopicSchema = z.object({
  title: topicTitleSchema.optional(),
  grades: gradesArraySchema.optional(),
});

export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;

/**
 * Question schema
 */
export const questionSchema = z.object({
  text: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 2, {
      message: 'Nội dung câu hỏi phải có ít nhất 2 ký tự.',
    })
    .refine(val => val.length <= 500, {
      message: 'Nội dung câu hỏi không được vượt quá 500 ký tự.',
    }),
  translation: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 500, {
      message: 'Bản dịch không được vượt quá 500 ký tự.',
    })
    .optional()
    .nullable(),
  sample_answer: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 1000, {
      message: 'Câu trả lời mẫu không được vượt quá 1000 ký tự.',
    })
    .optional()
    .nullable(),
  target: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 200, {
      message: 'Mục tiêu (target) không được vượt quá 200 ký tự.',
    })
    .optional()
    .nullable(),
  image_url: z.string().url('Đường dẫn ảnh không hợp lệ.').optional().nullable().or(z.literal('')),
});

export type QuestionInput = z.infer<typeof questionSchema>;

/**
 * Parsed question from AI parser
 */
export const parsedQuestionSchema = z.object({
  text: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length >= 2, {
      message: 'Câu hỏi phải có ít nhất 2 ký tự.',
    })
    .refine(val => val.length <= 500, {
      message: 'Câu hỏi không được vượt quá 500 ký tự.',
    }),
  sample_answer: z
    .string()
    .transform(val => sanitizeString(val))
    .refine(val => val.length <= 1000, {
      message: 'Câu trả lời mẫu không được vượt quá 1000 ký tự.',
    })
    .optional()
    .default(''),
});

export type ParsedQuestionInput = z.infer<typeof parsedQuestionSchema>;

/* ==========================================================================
   API Response Boundary Schemas (Runtime validation for external/DB data)
   ========================================================================== */

export const questionResponseSchema = z.object({
  id: z.string(),
  topic_id: z.string().optional(),
  text: z.string(),
  translation: z.string().nullable().optional(),
  sample_answer: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  audio_url: z.string().nullable().optional(),
  sort_order: z.number().nullable().optional(),
  order_index: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const questionsResponseArraySchema = z.array(questionResponseSchema);

export const topicResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['standard', 'bongbe']).catch('standard'),
  is_active: z.boolean().default(true),
  order_index: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  grades: z.array(z.number()).nullable().optional(),
  questions: z.array(questionResponseSchema).default([]),
});

export const topicsResponseArraySchema = z.array(topicResponseSchema);

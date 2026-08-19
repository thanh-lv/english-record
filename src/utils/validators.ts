import { z } from "zod";
import {
  sanitizeString,
  studentGradeSchema,
  gradesArraySchema,
  createFileSchema,
  ALLOWED_IMAGE_MIME_TYPES,
  extractYoutubeId,
} from "../schemas";

export { sanitizeString as sanitizeText, extractYoutubeId };

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate student name using Zod studentNameSchema
 */
export function validateStudentName(
  name: string,
  errorMsgs?: { required?: string; min?: string; max?: string },
): ValidationResult {
  const clean = sanitizeString(name);
  if (!clean) {
    return {
      isValid: false,
      error: errorMsgs?.required || "Vui lòng nhập tên học sinh.",
    };
  }
  const schema = z
    .string()
    .min(2, errorMsgs?.min || "Tên phải có ít nhất 2 ký tự.")
    .max(50, errorMsgs?.max || "Tên không được vượt quá 50 ký tự.");

  const res = schema.safeParse(clean);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate password using Zod studentPasswordSchema
 */
export function validatePassword(
  password: string,
  minLen: number = 3,
  errorMsgs?: { required?: string; min?: string; max?: string },
): ValidationResult {
  const clean = password ? password.trim() : "";
  if (!clean) {
    return {
      isValid: false,
      error: errorMsgs?.required || "Vui lòng nhập mật khẩu.",
    };
  }
  const schema = z
    .string()
    .min(minLen, errorMsgs?.min || `Mật khẩu phải có ít nhất ${minLen} ký tự.`)
    .max(100, errorMsgs?.max || "Mật khẩu không được vượt quá 100 ký tự.");

  const res = schema.safeParse(clean);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate year of birth using Zod yearBornSchema
 */
export function validateYearBorn(
  year: number | string,
  minYear?: number,
  maxYear?: number,
  errorMsg?: string,
): ValidationResult {
  const currentYear = new Date().getFullYear();
  const min = minYear ?? currentYear - 20;
  const max = maxYear ?? currentYear - 2;

  const schema = z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val.trim(), 10) : val),
    z
      .number()
      .int()
      .min(min)
      .max(max),
  );

  const res = schema.safeParse(year);
  if (!res.success) {
    return {
      isValid: false,
      error:
        errorMsg ||
        `Năm sinh không hợp lệ. Vui lòng nhập từ ${min} đến ${max}.`,
    };
  }
  return { isValid: true };
}

/**
 * Validate grade (1 - 12 or null/empty) using Zod studentGradeSchema
 */
export function validateGrade(
  grade: number | string | null | undefined,
  errorMsg?: string,
): ValidationResult {
  const res = studentGradeSchema.safeParse(grade);
  if (!res.success) {
    return {
      isValid: false,
      error: errorMsg || "Khối / Lớp phải là số từ 1 đến 12.",
    };
  }
  return { isValid: true };
}

/**
 * Validate grades array using Zod gradesArraySchema
 */
export function validateGrades(
  grades: unknown,
  errorMsg?: string,
): ValidationResult {
  const res = gradesArraySchema.safeParse(grades);
  if (!res.success) {
    return {
      isValid: false,
      error: errorMsg || "Khối lớp phải từ 1 đến 12.",
    };
  }
  return { isValid: true };
}

/**
 * Validate topic title using Zod topicTitleSchema
 */
export function validateTopicTitle(
  title: string,
  errorMsgs?: { required?: string; min?: string; max?: string },
): ValidationResult {
  const clean = sanitizeString(title);
  if (!clean) {
    return {
      isValid: false,
      error: errorMsgs?.required || "Vui lòng nhập tên chủ đề.",
    };
  }
  const schema = z
    .string()
    .min(2, errorMsgs?.min || "Tên chủ đề phải có ít nhất 2 ký tự.")
    .max(100, errorMsgs?.max || "Tên chủ đề không được vượt quá 100 ký tự.");

  const res = schema.safeParse(clean);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate question details using Zod questionSchema
 */
export function validateQuestion(
  data: {
    text: string;
    translation?: string;
    sample_answer?: string;
    target?: string;
    image_url?: string;
  },
  errorMsgs?: {
    textRequired?: string;
    textMin?: string;
    textMax?: string;
    translationMax?: string;
    sampleAnswerMax?: string;
    targetMax?: string;
  },
): ValidationResult {
  const customSchema = z.object({
    text: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length >= 2, {
        message: errorMsgs?.textMin || "Câu hỏi phải có ít nhất 2 ký tự.",
      })
      .refine((val) => val.length <= 500, {
        message: errorMsgs?.textMax || "Câu hỏi không được vượt quá 500 ký tự.",
      }),
    translation: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length <= 500, {
        message: errorMsgs?.translationMax || "Bản dịch không được vượt quá 500 ký tự.",
      })
      .optional()
      .nullable(),
    sample_answer: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length <= 1000, {
        message: errorMsgs?.sampleAnswerMax || "Câu trả lời mẫu không được vượt quá 1000 ký tự.",
      })
      .optional()
      .nullable(),
    target: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length <= 200, {
        message: errorMsgs?.targetMax || "Mục tiêu (target) không được vượt quá 200 ký tự.",
      })
      .optional()
      .nullable(),
  });

  const res = customSchema.safeParse(data);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate Shadowing video input using Zod shadowingVideoSchema
 */
export function validateShadowingVideo(
  data: {
    title: string;
    youtube_url: string;
    preview_start?: number | null;
    preview_end?: number | null;
    record_start?: number | null;
    record_end?: number | null;
  },
  errorMsgs?: {
    titleRequired?: string;
    titleMax?: string;
    urlInvalid?: string;
    previewRangeInvalid?: string;
    recordRangeInvalid?: string;
    negativeTime?: string;
  },
): ValidationResult {
  const customSchema = z
    .object({
      title: z
        .string()
        .transform((val) => sanitizeString(val))
        .refine((val) => val.length >= 2, {
          message: errorMsgs?.titleRequired || "Tiêu đề video phải có ít nhất 2 ký tự.",
        })
        .refine((val) => val.length <= 150, {
          message: errorMsgs?.titleMax || "Tiêu đề không được vượt quá 150 ký tự.",
        }),
      youtube_url: z
        .string()
        .trim()
        .refine((val) => Boolean(extractYoutubeId(val)), {
          message:
            errorMsgs?.urlInvalid ||
            "Link YouTube không hợp lệ. Vui lòng kiểm tra lại đường dẫn.",
        }),
      preview_start: z
        .number()
        .nonnegative(errorMsgs?.negativeTime || "Thời gian không được là số âm.")
        .nullable()
        .optional(),
      preview_end: z
        .number()
        .nonnegative(errorMsgs?.negativeTime || "Thời gian không được là số âm.")
        .nullable()
        .optional(),
      record_start: z
        .number()
        .nonnegative(errorMsgs?.negativeTime || "Thời gian không được là số âm.")
        .nullable()
        .optional(),
      record_end: z
        .number()
        .nonnegative(errorMsgs?.negativeTime || "Thời gian không được là số âm.")
        .nullable()
        .optional(),
    })
    .refine(
      (d) => {
        if (
          d.preview_start !== null &&
          d.preview_start !== undefined &&
          d.preview_end !== null &&
          d.preview_end !== undefined
        ) {
          return d.preview_start < d.preview_end;
        }
        return true;
      },
      {
        message:
          errorMsgs?.previewRangeInvalid ||
          "Thời gian kết thúc xem thử phải lớn hơn thời gian bắt đầu.",
      },
    )
    .refine(
      (d) => {
        if (
          d.record_start !== null &&
          d.record_start !== undefined &&
          d.record_end !== null &&
          d.record_end !== undefined
        ) {
          return d.record_start < d.record_end;
        }
        return true;
      },
      {
        message:
          errorMsgs?.recordRangeInvalid ||
          "Thời gian kết thúc ghi âm phải lớn hơn thời gian bắt đầu.",
      },
    );

  const res = customSchema.safeParse(data);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate Story data using Zod storySchema
 */
export function validateStory(
  data: {
    title: string;
    content: string;
    emoji?: string;
    type?: string;
  },
  errorMsgs?: {
    titleRequired?: string;
    titleMax?: string;
    contentRequired?: string;
    contentMax?: string;
    emojiMax?: string;
  },
): ValidationResult {
  const customSchema = z.object({
    title: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length >= 2, {
        message: errorMsgs?.titleRequired || "Tiêu đề truyện phải có ít nhất 2 ký tự.",
      })
      .refine((val) => val.length <= 150, {
        message: errorMsgs?.titleMax || "Tiêu đề không được vượt quá 150 ký tự.",
      }),
    content: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length >= 10, {
        message: errorMsgs?.contentRequired || "Nội dung truyện phải có ít nhất 10 ký tự.",
      })
      .refine((val) => val.length <= 10000, {
        message: errorMsgs?.contentMax || "Nội dung truyện không được vượt quá 10,000 ký tự.",
      }),
    emoji: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length <= 10, {
        message: errorMsgs?.emojiMax || "Emoji không hợp lệ.",
      })
      .optional(),
  });

  const res = customSchema.safeParse(data);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate Vocabulary Set using Zod vocabSetSchema
 */
export function validateVocabSet(
  data: { title: string; emoji?: string },
  errorMsgs?: { titleRequired?: string; titleMax?: string; emojiMax?: string },
): ValidationResult {
  const customSchema = z.object({
    title: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length >= 2, {
        message: errorMsgs?.titleRequired || "Tên bộ từ phải có ít nhất 2 ký tự.",
      })
      .refine((val) => val.length <= 100, {
        message: errorMsgs?.titleMax || "Tên bộ từ không được vượt quá 100 ký tự.",
      }),
    emoji: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length <= 10, {
        message: errorMsgs?.emojiMax || "Emoji không hợp lệ.",
      })
      .optional(),
  });

  const res = customSchema.safeParse(data);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate Vocabulary Card using Zod vocabCardSchema
 */
export function validateVocabCard(
  data: { front: string; back: string; ipa?: string },
  errorMsgs?: {
    frontRequired?: string;
    frontMax?: string;
    backRequired?: string;
    backMax?: string;
    ipaMax?: string;
  },
): ValidationResult {
  const customSchema = z.object({
    front: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length >= 1, {
        message: errorMsgs?.frontRequired || "Vui lòng nhập từ tiếng Anh (mặt trước).",
      })
      .refine((val) => val.length <= 200, {
        message: errorMsgs?.frontMax || "Từ vựng không được vượt quá 200 ký tự.",
      }),
    back: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length >= 1, {
        message: errorMsgs?.backRequired || "Vui lòng nhập nghĩa (mặt sau).",
      })
      .refine((val) => val.length <= 500, {
        message: errorMsgs?.backMax || "Nghĩa không được vượt quá 500 ký tự.",
      }),
    ipa: z
      .string()
      .transform((val) => sanitizeString(val))
      .refine((val) => val.length <= 100, {
        message: errorMsgs?.ipaMax || "Phiên âm IPA không được vượt quá 100 ký tự.",
      })
      .optional()
      .nullable(),
  });

  const res = customSchema.safeParse(data);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate Image file upload using Zod imageFileSchema
 */
export function validateImageFile(
  file: File | Blob,
  maxSizeMb: number = 5,
  errorMsgs?: { typeInvalid?: string; sizeTooLarge?: string },
): ValidationResult {
  const schema = createFileSchema({
    maxSizeMb,
    allowedTypes: ALLOWED_IMAGE_MIME_TYPES,
    typeErrorMessage:
      errorMsgs?.typeInvalid ||
      "Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP hoặc GIF.",
    sizeErrorMessage:
      errorMsgs?.sizeTooLarge ||
      `Dung lượng ảnh vượt quá giới hạn cho phép (${maxSizeMb}MB).`,
  });

  const res = schema.safeParse(file);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

/**
 * Validate Phone number using Zod phoneSchema
 */
export function validatePhone(
  phone: string,
  errorMsg?: string,
): ValidationResult {
  const clean = sanitizeString(phone);
  if (!clean) return { isValid: true };

  const schema = z.string().refine(
    (val) => /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(val),
    {
      message: errorMsg || "Số điện thoại không đúng định dạng.",
    },
  );

  const res = schema.safeParse(clean);
  if (!res.success) {
    return { isValid: false, error: res.error.issues[0]?.message };
  }
  return { isValid: true };
}

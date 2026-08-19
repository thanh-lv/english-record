/* eslint-disable no-control-regex */
/**
 * Input validation and sanitization utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Remove harmful invisible control characters and trim whitespace
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  // Strip non-printable ASCII control chars (except standard newlines/tabs)
  return text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .trim();
}

/**
 * Validate student name
 * - Length: 2 to 50 characters
 * - Must not consist only of special characters
 */
export function validateStudentName(
  name: string,
  errorMsgs?: { required?: string; min?: string; max?: string },
): ValidationResult {
  const clean = sanitizeText(name);
  if (!clean) {
    return {
      isValid: false,
      error: errorMsgs?.required || "Vui lòng nhập tên học sinh.",
    };
  }
  if (clean.length < 2) {
    return {
      isValid: false,
      error: errorMsgs?.min || "Tên phải có ít nhất 2 ký tự.",
    };
  }
  if (clean.length > 50) {
    return {
      isValid: false,
      error: errorMsgs?.max || "Tên không được vượt quá 50 ký tự.",
    };
  }
  return { isValid: true };
}

/**
 * Validate password
 * - Student password: 3 to 100 characters
 * - Teacher password: 6 to 100 characters
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
  if (clean.length < minLen) {
    return {
      isValid: false,
      error: errorMsgs?.min || `Mật khẩu phải có ít nhất ${minLen} ký tự.`,
    };
  }
  if (clean.length > 100) {
    return {
      isValid: false,
      error: errorMsgs?.max || "Mật khẩu không được vượt quá 100 ký tự.",
    };
  }
  return { isValid: true };
}

/**
 * Validate year of birth
 */
export function validateYearBorn(
  year: number | string,
  minYear?: number,
  maxYear?: number,
  errorMsg?: string,
): ValidationResult {
  const currentYear = new Date().getFullYear();
  const defaultMin = minYear ?? currentYear - 20;
  const defaultMax = maxYear ?? currentYear - 2;

  const parsed = typeof year === "string" ? parseInt(year.trim(), 10) : year;
  if (
    !Number.isInteger(parsed) ||
    isNaN(parsed) ||
    parsed < defaultMin ||
    parsed > defaultMax
  ) {
    return {
      isValid: false,
      error:
        errorMsg ||
        `Năm sinh không hợp lệ. Vui lòng nhập từ ${defaultMin} đến ${defaultMax}.`,
    };
  }
  return { isValid: true };
}

/**
 * Validate grade (1 - 12 or null/empty)
 */
export function validateGrade(
  grade: number | string | null | undefined,
  errorMsg?: string,
): ValidationResult {
  if (grade === null || grade === undefined || grade === "") {
    return { isValid: true };
  }
  const parsed = typeof grade === "string" ? parseInt(grade.trim(), 10) : grade;
  if (!Number.isInteger(parsed) || isNaN(parsed) || parsed < 1 || parsed > 12) {
    return {
      isValid: false,
      error: errorMsg || "Khối / Lớp phải là số từ 1 đến 12.",
    };
  }
  return { isValid: true };
}

/**
 * Validate grades array
 */
export function validateGrades(
  grades: unknown,
  errorMsg?: string,
): ValidationResult {
  if (!Array.isArray(grades)) {
    return {
      isValid: false,
      error: errorMsg || "Danh sách khối lớp không hợp lệ.",
    };
  }
  const invalid = grades.some(
    (g) => !Number.isInteger(g) || typeof g !== "number" || g < 1 || g > 12,
  );
  if (invalid) {
    return { isValid: false, error: errorMsg || "Khối lớp phải từ 1 đến 12." };
  }
  return { isValid: true };
}

/**
 * Validate topic title
 * - Length: 2 to 100 characters
 */
export function validateTopicTitle(
  title: string,
  errorMsgs?: { required?: string; min?: string; max?: string },
): ValidationResult {
  const clean = sanitizeText(title);
  if (!clean) {
    return {
      isValid: false,
      error: errorMsgs?.required || "Vui lòng nhập tên chủ đề.",
    };
  }
  if (clean.length < 2) {
    return {
      isValid: false,
      error: errorMsgs?.min || "Tên chủ đề phải có ít nhất 2 ký tự.",
    };
  }
  if (clean.length > 100) {
    return {
      isValid: false,
      error: errorMsgs?.max || "Tên chủ đề không được vượt quá 100 ký tự.",
    };
  }
  return { isValid: true };
}

/**
 * Validate question details
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
  const text = sanitizeText(data.text);
  if (!text) {
    return {
      isValid: false,
      error: errorMsgs?.textRequired || "Vui lòng nhập nội dung câu hỏi.",
    };
  }
  if (text.length < 2) {
    return {
      isValid: false,
      error: errorMsgs?.textMin || "Câu hỏi phải có ít nhất 2 ký tự.",
    };
  }
  if (text.length > 500) {
    return {
      isValid: false,
      error: errorMsgs?.textMax || "Câu hỏi không được vượt quá 500 ký tự.",
    };
  }
  if (data.translation && data.translation.trim().length > 500) {
    return {
      isValid: false,
      error:
        errorMsgs?.translationMax || "Bản dịch không được vượt quá 500 ký tự.",
    };
  }
  if (data.sample_answer && data.sample_answer.trim().length > 1000) {
    return {
      isValid: false,
      error:
        errorMsgs?.sampleAnswerMax ||
        "Câu trả lời mẫu không được vượt quá 1000 ký tự.",
    };
  }
  if (data.target && data.target.trim().length > 200) {
    return {
      isValid: false,
      error:
        errorMsgs?.targetMax ||
        "Mục tiêu (target) không được vượt quá 200 ký tự.",
    };
  }
  return { isValid: true };
}

/**
 * Extract YouTube Video ID and validate URL
 */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = clean.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Validate Shadowing video input
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
  const title = sanitizeText(data.title);
  if (!title || title.length < 2) {
    return {
      isValid: false,
      error:
        errorMsgs?.titleRequired || "Tiêu đề video phải có ít nhất 2 ký tự.",
    };
  }
  if (title.length > 150) {
    return {
      isValid: false,
      error: errorMsgs?.titleMax || "Tiêu đề không được vượt quá 150 ký tự.",
    };
  }
  const ytId = extractYoutubeId(data.youtube_url);
  if (!ytId) {
    return {
      isValid: false,
      error:
        errorMsgs?.urlInvalid ||
        "Link YouTube không hợp lệ. Vui lòng kiểm tra lại đường dẫn.",
    };
  }

  const { preview_start, preview_end, record_start, record_end } = data;

  if (
    (preview_start !== undefined &&
      preview_start !== null &&
      preview_start < 0) ||
    (preview_end !== undefined && preview_end !== null && preview_end < 0) ||
    (record_start !== undefined && record_start !== null && record_start < 0) ||
    (record_end !== undefined && record_end !== null && record_end < 0)
  ) {
    return {
      isValid: false,
      error: errorMsgs?.negativeTime || "Thời gian không được là số âm.",
    };
  }

  if (
    preview_start !== undefined &&
    preview_start !== null &&
    preview_end !== undefined &&
    preview_end !== null
  ) {
    if (preview_end <= preview_start) {
      return {
        isValid: false,
        error:
          errorMsgs?.previewRangeInvalid ||
          "Thời gian kết thúc xem thử phải lớn hơn thời gian bắt đầu.",
      };
    }
  }

  if (
    record_start !== undefined &&
    record_start !== null &&
    record_end !== undefined &&
    record_end !== null
  ) {
    if (record_end <= record_start) {
      return {
        isValid: false,
        error:
          errorMsgs?.recordRangeInvalid ||
          "Thời gian kết thúc ghi âm phải lớn hơn thời gian bắt đầu.",
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate Story data
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
  const title = sanitizeText(data.title);
  const content = sanitizeText(data.content);

  if (!title || title.length < 2) {
    return {
      isValid: false,
      error:
        errorMsgs?.titleRequired || "Tiêu đề truyện phải có ít nhất 2 ký tự.",
    };
  }
  if (title.length > 150) {
    return {
      isValid: false,
      error: errorMsgs?.titleMax || "Tiêu đề không được vượt quá 150 ký tự.",
    };
  }
  if (!content || content.length < 10) {
    return {
      isValid: false,
      error:
        errorMsgs?.contentRequired ||
        "Nội dung truyện phải có ít nhất 10 ký tự.",
    };
  }
  if (content.length > 10000) {
    return {
      isValid: false,
      error:
        errorMsgs?.contentMax ||
        "Nội dung truyện không được vượt quá 10,000 ký tự.",
    };
  }
  if (data.emoji && data.emoji.trim().length > 10) {
    return {
      isValid: false,
      error: errorMsgs?.emojiMax || "Emoji không hợp lệ.",
    };
  }
  return { isValid: true };
}

/**
 * Validate Vocabulary Set
 */
export function validateVocabSet(
  data: { title: string; emoji?: string },
  errorMsgs?: { titleRequired?: string; titleMax?: string; emojiMax?: string },
): ValidationResult {
  const title = sanitizeText(data.title);
  if (!title || title.length < 2) {
    return {
      isValid: false,
      error: errorMsgs?.titleRequired || "Tên bộ từ phải có ít nhất 2 ký tự.",
    };
  }
  if (title.length > 100) {
    return {
      isValid: false,
      error: errorMsgs?.titleMax || "Tên bộ từ không được vượt quá 100 ký tự.",
    };
  }
  if (data.emoji && data.emoji.trim().length > 10) {
    return {
      isValid: false,
      error: errorMsgs?.emojiMax || "Emoji không hợp lệ.",
    };
  }
  return { isValid: true };
}

/**
 * Validate Vocabulary Card
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
  const front = sanitizeText(data.front);
  const back = sanitizeText(data.back);

  if (!front) {
    return {
      isValid: false,
      error:
        errorMsgs?.frontRequired || "Vui lòng nhập từ tiếng Anh (mặt trước).",
    };
  }
  if (front.length > 200) {
    return {
      isValid: false,
      error: errorMsgs?.frontMax || "Từ vựng không được vượt quá 200 ký tự.",
    };
  }
  if (!back) {
    return {
      isValid: false,
      error: errorMsgs?.backRequired || "Vui lòng nhập nghĩa (mặt sau).",
    };
  }
  if (back.length > 500) {
    return {
      isValid: false,
      error: errorMsgs?.backMax || "Nghĩa không được vượt quá 500 ký tự.",
    };
  }
  if (data.ipa && data.ipa.trim().length > 100) {
    return {
      isValid: false,
      error: errorMsgs?.ipaMax || "Phiên âm IPA không được vượt quá 100 ký tự.",
    };
  }
  return { isValid: true };
}

/**
 * Validate Image file upload
 */
export function validateImageFile(
  file: File | Blob,
  maxSizeMb: number = 5,
  errorMsgs?: { typeInvalid?: string; sizeTooLarge?: string },
): ValidationResult {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error:
        errorMsgs?.typeInvalid ||
        "Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP hoặc GIF.",
    };
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      isValid: false,
      error:
        errorMsgs?.sizeTooLarge ||
        `Dung lượng ảnh vượt quá giới hạn cho phép (${maxSizeMb}MB).`,
    };
  }

  return { isValid: true };
}

/**
 * Validate Phone number
 */
export function validatePhone(
  phone: string,
  errorMsg?: string,
): ValidationResult {
  const clean = sanitizeText(phone);
  if (!clean) return { isValid: true }; // optional
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
  if (!phoneRegex.test(clean)) {
    return {
      isValid: false,
      error: errorMsg || "Số điện thoại không đúng định dạng.",
    };
  }
  return { isValid: true };
}

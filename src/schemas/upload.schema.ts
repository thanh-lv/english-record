import { z } from "zod";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mpeg",
  "audio/x-m4a",
  "audio/mp4",
];

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_AUDIO_MIME_TYPES,
];

/**
 * File upload validation schema generator
 */
export function createFileSchema(options: {
  maxSizeMb?: number;
  allowedTypes?: string[];
  typeErrorMessage?: string;
  sizeErrorMessage?: string;
}) {
  const maxSizeMb = options.maxSizeMb ?? 10;
  const allowedTypes = options.allowedTypes ?? ALLOWED_MEDIA_MIME_TYPES;
  const maxBytes = maxSizeMb * 1024 * 1024;

  return z.custom<File | Blob>(
    (file) => file instanceof Blob || file instanceof File,
    { message: "Tệp tải lên không hợp lệ." },
  )
    .refine(
      (file) => {
        if (!file.type) return true;
        return allowedTypes.includes(file.type.toLowerCase());
      },
      {
        message:
          options.typeErrorMessage ||
          "Định dạng tệp không được hỗ trợ (chỉ chấp nhận JPG, PNG, WEBP, GIF, WebM, MP3, WAV).",
      },
    )
    .refine(
      (file) => file.size <= maxBytes,
      {
        message:
          options.sizeErrorMessage ||
          `Dung lượng tệp vượt quá giới hạn cho phép (${maxSizeMb}MB).`,
      },
    );
}

export const imageFileSchema = createFileSchema({
  maxSizeMb: 5,
  allowedTypes: ALLOWED_IMAGE_MIME_TYPES,
  typeErrorMessage: "Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP, GIF).",
  sizeErrorMessage: "Dung lượng ảnh không được vượt quá 5MB.",
});

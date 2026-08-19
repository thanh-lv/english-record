import { S3_BUCKET, getS3Client } from '../lib/s3';
import { createFileSchema, ALLOWED_IMAGE_MIME_TYPES, ALLOWED_MEDIA_MIME_TYPES } from '../schemas';
import { optimizeImageFile } from '../utils/imageOptimizer';

/**
 * Service handling file uploads to S3 / Cloudflare R2 with lazy loaded S3 SDK,
 * automatic client-side image compression (WebP downsampling), and Zod validation.
 */
export const uploadService = {
  async uploadFile(
    file: File | Blob,
    folder: string = 'uploads',
    maxSizeMb: number = 10
  ): Promise<string> {
    const isImageOnlyFolder = ['question_images', 'vocab_images', 'stories', 'avatars'].includes(
      folder
    );

    const allowedTypes = isImageOnlyFolder ? ALLOWED_IMAGE_MIME_TYPES : ALLOWED_MEDIA_MIME_TYPES;

    const schema = createFileSchema({
      maxSizeMb,
      allowedTypes,
      typeErrorMessage: isImageOnlyFolder
        ? 'Định dạng tệp không được hỗ trợ (chỉ chấp nhận JPG, PNG, WEBP, GIF).'
        : 'Định dạng tệp không được hỗ trợ (chỉ chấp nhận JPG, PNG, WEBP, GIF, WebM, MP3, WAV).',
      sizeErrorMessage: `Dung lượng tệp vượt quá giới hạn cho phép (${maxSizeMb}MB).`,
    });

    const parsed = schema.safeParse(file);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Tệp không hợp lệ.');
    }

    // Automatically optimize raster images (downscale & compress to WebP)
    let processedFile: File | Blob = file;
    if (file.type && file.type.startsWith('image/')) {
      try {
        processedFile = await optimizeImageFile(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.85,
          outputFormat: 'image/webp',
        });
      } catch {
        processedFile = file;
      }
    }

    const rawExt = processedFile.type ? processedFile.type.split('/')[1] : 'bin';
    const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '') || 'webp';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const arrayBuffer = await processedFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Lazy load PutObjectCommand and S3Client only when upload is requested
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = await getS3Client();

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: filename,
      Body: uint8Array,
      ContentType: processedFile.type || 'application/octet-stream',
    });

    await s3Client.send(command);

    const publicDomain =
      import.meta.env.VITE_S3_PUBLIC_DOMAIN || import.meta.env.VITE_R2_PUBLIC_URL;
    if (publicDomain) {
      return `${publicDomain.replace(/\/$/, '')}/${filename}`;
    }

    const endpoint = import.meta.env.VITE_S3_ENDPOINT || '';
    return `${endpoint.replace(/\/$/, '')}/${S3_BUCKET}/${filename}`;
  },
};

export const uploadToStorage = uploadService.uploadFile;

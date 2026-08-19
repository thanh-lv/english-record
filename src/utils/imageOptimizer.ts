/**
 * @file imageOptimizer.ts
 * @description
 * Client-side multimedia optimization utility that downscales high-resolution
 * images, compresses raster graphics to modern WebP format, and preserves aspect ratio.
 *
 * @module utils/imageOptimizer
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Optimizes and compresses an image file before upload.
 *
 * - Bypasses non-image files (audio, video) and animated/vector formats (GIF, SVG).
 * - Scales down large images to specified max dimensions (default 1280x1280) preserving aspect ratio.
 * - Converts to optimized WebP format with configurable compression quality (default 0.85).
 * - Falls back to original if compression yields a larger size (e.g. tiny icons) or environment lacks Canvas.
 *
 * @param {File | Blob} file - Input image file or blob.
 * @param {ImageOptimizationOptions} [options] - Compression options.
 * @returns {Promise<File | Blob>} The optimized file or blob.
 */
export async function optimizeImageFile(
  file: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<File | Blob> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.85,
    outputFormat = 'image/webp',
  } = options;

  const fileType = file.type || '';

  // Skip optimization for non-image media, SVG, or animated GIF
  if (
    !fileType.startsWith('image/') ||
    fileType === 'image/svg+xml' ||
    fileType === 'image/gif'
  ) {
    return file;
  }

  // Safety check for browser environment with Canvas support
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function'
  ) {
    return file;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => {
        reject(new Error('Image decode timeout'));
      }, 500);

      image.onload = () => {
        clearTimeout(timer);
        resolve(image);
      };
      image.onerror = err => {
        clearTimeout(timer);
        reject(err);
      };
      image.src = objectUrl;
    });

    let { width, height } = img;

    // Check if resize is needed
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    URL.revokeObjectURL(objectUrl);

    const blob = await new Promise<Blob | null>(resolve => {
      if (typeof canvas.toBlob !== 'function') {
        resolve(null);
        return;
      }
      canvas.toBlob(b => resolve(b), outputFormat, quality);
    });

    if (!blob) {
      return file;
    }

    // If optimized blob is smaller than original, wrap as File or return Blob
    if (blob.size < file.size) {
      if (file instanceof File) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const ext = outputFormat === 'image/webp' ? '.webp' : outputFormat === 'image/jpeg' ? '.jpg' : '.png';
        return new File([blob], `${nameWithoutExt}${ext}`, { type: outputFormat });
      }
      return blob;
    }

    return file;
  } catch {
    // If canvas decoding fails or times out in headless environment, safely return original file
    return file;
  }
}

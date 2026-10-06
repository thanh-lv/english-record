import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadService, getStorageKeyFromUrl } from '../uploadService';
import { getS3Client } from '../../lib/s3';

const sendMock = vi.fn().mockResolvedValue({});

vi.mock('../../lib/s3', () => ({
  S3_BUCKET: 'test-bucket',
  getS3Client: vi.fn().mockResolvedValue({
    send: (...args: any[]) => sendMock(...args),
  }),
}));

describe('uploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects unsupported file mime types in media folders', async () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    await expect(uploadService.uploadFile(file, 'uploads', 10)).rejects.toThrow(
      'Định dạng tệp không được hỗ trợ (chỉ chấp nhận JPG, PNG, WEBP, GIF, WebM, MP3, WAV).'
    );
  });

  it('rejects audio/media files in image-only folders like vocab_images or question_images', async () => {
    const audioFile = new File(['audio-content'], 'sound.mp3', { type: 'audio/mpeg' });
    await expect(uploadService.uploadFile(audioFile, 'vocab_images', 10)).rejects.toThrow(
      'Định dạng tệp không được hỗ trợ (chỉ chấp nhận JPG, PNG, WEBP, GIF).'
    );
  });

  it('rejects files exceeding the specified maxSizeMb', async () => {
    const largeContent = new Uint8Array(3 * 1024 * 1024);
    const file = new File([largeContent], 'photo.png', { type: 'image/png' });
    await expect(uploadService.uploadFile(file, 'uploads', 2)).rejects.toThrow(
      'Dung lượng tệp vượt quá giới hạn cho phép (2MB).'
    );
  });

  it('uploads valid image file and sends PutObjectCommand to lazy s3Client', async () => {
    const file = new File(['audio-binary'], 'recording.wav', { type: 'audio/wav' });
    const url = await uploadService.uploadFile(file, 'uploads', 10);

    expect(getS3Client).toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(url).toContain('uploads/');
    expect(url).toContain('.wav');
  });

  it('resolves URL using VITE_S3_PUBLIC_DOMAIN if present', async () => {
    vi.stubEnv('VITE_S3_PUBLIC_DOMAIN', 'https://cdn.englishrecord.com/');
    const file = new File(['img-data'], 'pic.png', { type: 'image/png' });
    const url = await uploadService.uploadFile(file, 'question_images', 10);

    expect(url.startsWith('https://cdn.englishrecord.com/question_images/')).toBe(true);
  });

  it('resolves URL using VITE_R2_PUBLIC_URL if VITE_S3_PUBLIC_DOMAIN is not present', async () => {
    vi.stubEnv('VITE_S3_PUBLIC_DOMAIN', '');
    vi.stubEnv('VITE_R2_PUBLIC_URL', 'https://r2.englishrecord.com/');
    const file = new File(['img-data'], 'pic.png', { type: 'image/png' });
    const url = await uploadService.uploadFile(file, 'vocab_images', 10);

    expect(url.startsWith('https://r2.englishrecord.com/vocab_images/')).toBe(true);
  });

  it('resolves URL using fallback endpoint when public domains are not set', async () => {
    vi.stubEnv('VITE_S3_PUBLIC_DOMAIN', '');
    vi.stubEnv('VITE_R2_PUBLIC_URL', '');
    vi.stubEnv('VITE_S3_ENDPOINT', 'https://s3.example.com/');

    const file = new File(['img-data'], 'pic.jpeg', { type: 'image/jpeg' });
    const url = await uploadService.uploadFile(file, 'stories', 10);

    expect(url.startsWith('https://s3.example.com/test-bucket/stories/')).toBe(true);
  });

  describe('getStorageKeyFromUrl', () => {
    it('extracts the object key from public-domain and R2 public URLs', () => {
      vi.stubEnv('VITE_S3_PUBLIC_DOMAIN', 'https://cdn.englishrecord.com/');
      vi.stubEnv('VITE_R2_PUBLIC_URL', 'https://pub-123.r2.dev');

      expect(getStorageKeyFromUrl('https://cdn.englishrecord.com/stories/a.webp')).toBe(
        'stories/a.webp'
      );
      expect(getStorageKeyFromUrl('https://pub-123.r2.dev/profile-1/123_topic_1_q0.webm')).toBe(
        'profile-1/123_topic_1_q0.webm'
      );
    });

    it('extracts the key from raw endpoint URLs with or without the bucket segment', () => {
      vi.stubEnv('VITE_S3_PUBLIC_DOMAIN', '');
      vi.stubEnv('VITE_R2_PUBLIC_URL', '');
      vi.stubEnv('VITE_S3_ENDPOINT', 'https://s3.example.com/');
      expect(getStorageKeyFromUrl('https://s3.example.com/test-bucket/uploads/a%20b.mp3')).toBe(
        'uploads/a b.mp3'
      );

      vi.stubEnv('VITE_S3_ENDPOINT', 'https://test-bucket.s3.example.com');
      expect(getStorageKeyFromUrl('https://test-bucket.s3.example.com/p1/x.webm')).toBe(
        'p1/x.webm'
      );
    });

    it('returns null for URLs outside the bucket', () => {
      vi.stubEnv('VITE_R2_PUBLIC_URL', 'https://pub-123.r2.dev');
      expect(getStorageKeyFromUrl('https://evil.example.com/p1/x.webm')).toBeNull();
      expect(getStorageKeyFromUrl('https://pub-123.r2.dev.evil.com/p1/x.webm')).toBeNull();
      expect(getStorageKeyFromUrl('')).toBeNull();
    });
  });

  describe('deleteFileByUrl', () => {
    it('sends a DeleteObjectCommand for files in the bucket', async () => {
      vi.stubEnv('VITE_R2_PUBLIC_URL', 'https://pub-123.r2.dev');

      await expect(
        uploadService.deleteFileByUrl('https://pub-123.r2.dev/p1/old.webm')
      ).resolves.toBe(true);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const command = sendMock.mock.calls[0][0];
      expect(command.constructor.name).toBe('DeleteObjectCommand');
      expect(command.input).toEqual({ Bucket: 'test-bucket', Key: 'p1/old.webm' });
    });

    it('skips foreign URLs and swallows storage errors', async () => {
      vi.stubEnv('VITE_R2_PUBLIC_URL', 'https://pub-123.r2.dev');

      await expect(uploadService.deleteFileByUrl('https://other.example.com/x')).resolves.toBe(
        false
      );
      expect(sendMock).not.toHaveBeenCalled();

      sendMock.mockRejectedValueOnce(new Error('AccessDenied'));
      await expect(
        uploadService.deleteFileByUrl('https://pub-123.r2.dev/p1/old.webm')
      ).resolves.toBe(false);
    });
  });
});

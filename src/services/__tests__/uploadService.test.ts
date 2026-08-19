import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadService } from '../uploadService';
import { s3Client } from '../../lib/s3';

vi.mock('../../lib/s3', () => ({
  S3_BUCKET: 'test-bucket',
  s3Client: {
    send: vi.fn().mockResolvedValue({}),
  },
}));

describe('uploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects unsupported file mime types in media folders', async () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    await expect(uploadService.uploadFile(file, 'uploads', 10)).rejects.toThrow(
      'Định dạng tệp không được hỗ trợ'
    );
  });

  it('rejects files exceeding the specified maxSizeMb', async () => {
    const largeContent = new Uint8Array(3 * 1024 * 1024);
    const file = new File([largeContent], 'photo.png', { type: 'image/png' });
    await expect(uploadService.uploadFile(file, 'uploads', 2)).rejects.toThrow(
      'Dung lượng tệp vượt quá giới hạn cho phép (2MB).'
    );
  });

  it('uploads valid image file and sends PutObjectCommand to s3Client', async () => {
    const file = new File(['audio-binary'], 'recording.wav', { type: 'audio/wav' });
    const url = await uploadService.uploadFile(file, 'uploads', 10);

    expect(s3Client.send).toHaveBeenCalledTimes(1);
    expect(url).toContain('uploads/');
    expect(url).toContain('.wav');
  });

  it('resolves URL using VITE_S3_PUBLIC_DOMAIN if present', async () => {
    vi.stubEnv('VITE_S3_PUBLIC_DOMAIN', 'https://cdn.englishrecord.com/');
    const file = new File(['img-data'], 'pic.png', { type: 'image/png' });
    const url = await uploadService.uploadFile(file, 'question_images', 10);

    expect(url.startsWith('https://cdn.englishrecord.com/question_images/')).toBe(true);
  });

  it('resolves URL using fallback endpoint when public domains are not set', async () => {
    vi.stubEnv('VITE_S3_PUBLIC_DOMAIN', '');
    vi.stubEnv('VITE_R2_PUBLIC_URL', '');
    vi.stubEnv('VITE_S3_ENDPOINT', 'https://s3.example.com/');

    const file = new File(['img-data'], 'pic.jpeg', { type: 'image/jpeg' });
    const url = await uploadService.uploadFile(file, 'stories', 10);

    expect(url.startsWith('https://s3.example.com/test-bucket/stories/')).toBe(true);
  });
});

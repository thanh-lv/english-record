import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withServiceHandling, ServiceError } from '../serviceHandler';
import { loggerService } from '../loggerService';

vi.mock('../loggerService', () => ({
  loggerService: {
    error: vi.fn(),
  },
}));

describe('serviceHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data successfully when operation resolves', async () => {
    const result = await withServiceHandling('testModule', 'testOp', async () => {
      return { success: true, count: 42 };
    });

    expect(result).toEqual({ success: true, count: 42 });
    expect(loggerService.error).not.toHaveBeenCalled();
  });

  it('catches and normalizes raw error into ServiceError and logs it', async () => {
    const rawError = {
      message: 'Database relation not found',
      code: '42P01',
      details: 'table missing',
    };

    await expect(
      withServiceHandling('TopicService', 'getTopics', async () => {
        throw rawError;
      })
    ).rejects.toThrow('Database relation not found');

    expect(loggerService.error).toHaveBeenCalledTimes(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      'TopicService',
      '[getTopics] Database relation not found',
      expect.any(ServiceError)
    );
  });

  it('uses fallback message when error object has no message property', async () => {
    await expect(
      withServiceHandling(
        'AuthService',
        'login',
        async () => {
          throw {};
        },
        'Fallback failure message'
      )
    ).rejects.toThrow('Fallback failure message');

    expect(loggerService.error).toHaveBeenCalledWith(
      'AuthService',
      '[login] Fallback failure message',
      expect.any(ServiceError)
    );
  });

  it('handles existing ServiceError correctly without re-wrapping', async () => {
    const existing = new ServiceError('Already wrapped error');

    await expect(
      withServiceHandling('UploadService', 'uploadFile', async () => {
        throw existing;
      })
    ).rejects.toThrow('Already wrapped error');

    expect(loggerService.error).toHaveBeenCalledWith(
      'UploadService',
      '[uploadFile] Already wrapped error',
      existing
    );
  });
});

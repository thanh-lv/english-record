import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecording } from '../useRecording';
import { supabase } from '../../../../lib/supabase';
const sendMock = vi.fn().mockResolvedValue({});

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../../lib/s3', () => ({
  S3_BUCKET: 'test-bucket',
  getS3Client: vi.fn().mockResolvedValue({
    send: (...args: any[]) => sendMock(...args),
  }),
}));

vi.mock('../../../../i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      common: {
        micNotSupported: 'Không hỗ trợ microphone',
        micError: 'Lỗi truy cập microphone',
        offlineError: 'Không có kết nối mạng',
        submitError: 'Lỗi gửi bài ghi âm',
      },
    },
  }),
}));

describe('useRecording hook', () => {
  const mockUser = { id: 'student-user-123' };
  const mockProfile = { name: 'David' };
  const mockTopic = {
    id: 't1',
    title: 'Animals',
    questions: [{ id: 'q1', text: 'Favorite animal?' }],
  };
  const onSaveSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSaveSuccess.mockClear();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  it('formats recording time accurately in mm:ss', () => {
    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        onSaveSuccess,
      })
    );

    expect(result.current.formatTime(0)).toBe('0:00');
    expect(result.current.formatTime(5)).toBe('0:05');
    expect(result.current.formatTime(65)).toBe('1:05');
    expect(result.current.formatTime(600)).toBe('10:00');
  });

  it('resets recorded audios in resetAudio', () => {
    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        onSaveSuccess,
      })
    );

    const dummyBlob = new Blob(['audio'], { type: 'audio/webm' });
    act(() => {
      result.current.setBongBeAudios({ 0: dummyBlob });
      result.current.setAudioBase64(dummyBlob);
    });

    expect(result.current.hasPendingAudios).toBe(true);

    act(() => {
      result.current.resetAudio();
    });

    expect(result.current.hasPendingAudios).toBe(false);
    expect(result.current.audioBase64).toBeNull();
  });

  it('handles microphone start and stop recording cycle', async () => {
    const mockTracks = [{ stop: vi.fn() }];
    const mockStream = { getTracks: () => mockTracks };
    let capturedOnDataAvailable: any = null;
    let capturedOnStop: any = null;

    let mockMediaRecorderInstance: any = null;

    class MockMediaRecorder {
      state = 'recording';
      mimeType = 'audio/webm';
      ondataavailable: any = null;
      onstop: any = null;
      start = vi.fn();
      stop = vi.fn().mockImplementation(() => {
        if (this.onstop) this.onstop();
      });
      constructor() {
        mockMediaRecorderInstance = this;
      }
    }

    vi.stubGlobal('MediaRecorder', MockMediaRecorder);

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        onSaveSuccess,
      })
    );

    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;

    await act(async () => {
      await result.current.startRecording(mockEvent);
    });

    expect(result.current.isRecording).toBe(true);
    expect(mockMediaRecorderInstance.start).toHaveBeenCalled();

    // Trigger data available
    act(() => {
      if (mockMediaRecorderInstance?.ondataavailable) {
        mockMediaRecorderInstance.ondataavailable({ data: new Blob(['voice-blob'], { type: 'audio/webm' }) });
      }
    });

    // Stop recording
    act(() => {
      result.current.stopRecording(mockEvent);
    });

    expect(mockMediaRecorderInstance.stop).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    expect(mockTracks[0].stop).toHaveBeenCalled();
  });

  it('handles mic error when getUserMedia rejects', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        onSaveSuccess,
      })
    );

    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;

    await act(async () => {
      await result.current.startRecording(mockEvent);
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.appError.length).toBeGreaterThan(0);
  });

  it('saves recordings to S3 and Supabase when saveRecording is triggered', async () => {
    const savedRecord = { id: 'rec-saved-1', topic_number: 1, student_name: 'David' };
    const selectMock = vi.fn().mockResolvedValue({ data: [savedRecord], error: null });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'recordings') {
        return {
          insert: insertMock,
          delete: deleteMock,
        };
      }
      return {};
    });

    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        existingRecordingId: 'old-rec-id',
        shadowingVideoId: 'video-123',
        onSaveSuccess,
      })
    );

    const dummyBlob = new Blob(['audio-binary-data'], { type: 'audio/webm' });
    act(() => {
      result.current.setBongBeAudios({ 0: dummyBlob });
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;

    await act(async () => {
      await result.current.saveRecording(mockEvent);
    });

    expect(sendMock).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('recordings');
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('id', 'old-rec-id');
    expect(insertMock).toHaveBeenCalled();
    expect(onSaveSuccess).toHaveBeenCalledWith([savedRecord], 1);
    expect(result.current.hasPendingAudios).toBe(false);
  });

  it('handles offline state and sets error message in saveRecording', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        onSaveSuccess,
      })
    );

    const dummyBlob = new Blob(['audio'], { type: 'audio/webm' });
    act(() => {
      result.current.setBongBeAudios({ 0: dummyBlob });
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;

    await act(async () => {
      await result.current.saveRecording(mockEvent);
    });

    expect(result.current.appError.length).toBeGreaterThan(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('handles save failure gracefully and sets submit error', async () => {
    sendMock.mockRejectedValueOnce(new Error('S3 Network Failure'));

    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        onSaveSuccess,
      })
    );

    const dummyBlob = new Blob(['audio'], { type: 'audio/webm' });
    act(() => {
      result.current.setBongBeAudios({ 0: dummyBlob });
    });

    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;

    await act(async () => {
      await result.current.saveRecording(mockEvent);
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.appError.length).toBeGreaterThan(0);
  });
});

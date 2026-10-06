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

const deleteFileByUrlMock = vi.fn().mockResolvedValue(true);

vi.mock('../../../../services/uploadService', () => ({
  uploadService: {
    deleteFileByUrl: (...args: any[]) => deleteFileByUrlMock(...args),
  },
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
  const mockProfile = { id: 'profile-david', name: 'David', teacher_id: 'teacher-123' };
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

    class MockMediaRecorder {
      static current: MockMediaRecorder | null = null;
      state = 'recording';
      mimeType = 'audio/webm';
      ondataavailable: any = null;
      onstop: any = null;
      start = vi.fn();
      stop = vi.fn().mockImplementation(() => {
        if (this.onstop) this.onstop();
      });
      constructor() {
        MockMediaRecorder.current = this;
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
    expect(MockMediaRecorder.current?.start).toHaveBeenCalled();

    // Trigger data available
    act(() => {
      if (MockMediaRecorder.current?.ondataavailable) {
        MockMediaRecorder.current.ondataavailable({
          data: new Blob(['voice-blob'], { type: 'audio/webm' }),
        });
      }
    });

    // Stop recording
    act(() => {
      result.current.stopRecording(mockEvent);
    });

    expect(MockMediaRecorder.current?.stop).toHaveBeenCalled();
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

  const mockEvent = () => ({ preventDefault: vi.fn(), stopPropagation: vi.fn() }) as any;

  function mockRecordingsTable({
    insertResults = [{ data: [{ id: 'rec-saved-1' }], error: null }],
    deletedRows = [{ audio_url: 'https://pub.example.dev/profile-david/old.webm' }],
  }: { insertResults?: any[]; deletedRows?: any[] } = {}) {
    const insertedPayloads: any[] = [];
    let insertCall = 0;
    const insertMock = vi.fn((rows: any[]) => {
      insertedPayloads.push({ ...rows[0] });
      const res = insertResults[Math.min(insertCall++, insertResults.length - 1)];
      return { select: vi.fn().mockResolvedValue(res) };
    });
    const deleteSelectMock = vi.fn().mockResolvedValue({ data: deletedRows, error: null });
    const eqMock = vi.fn().mockReturnValue({ select: deleteSelectMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockImplementation((table: string) =>
      table === 'recordings' ? { insert: insertMock, delete: deleteMock } : {}
    );
    return { insertMock, insertedPayloads, deleteMock, eqMock };
  }

  async function saveOneRecording(options: { existingRecordingId?: string | null } = {}) {
    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: mockProfile,
        selectedNumber: 1,
        currentTopic: mockTopic,
        activeQuestionIndex: 0,
        existingRecordingId: options.existingRecordingId ?? null,
        onSaveSuccess,
      })
    );
    act(() => {
      result.current.setBongBeAudios({ 0: new Blob(['audio'], { type: 'audio/webm' }) });
    });
    await act(async () => {
      await result.current.saveRecording(mockEvent());
    });
    return result;
  }

  it('links the new recording to the student profile id', async () => {
    const { insertedPayloads } = mockRecordingsTable();

    await saveOneRecording();

    expect(insertedPayloads[0]).toMatchObject({
      student_id: 'profile-david',
      student_name: 'David',
    });
  });

  it('retries without student_id when the database has not been migrated yet', async () => {
    const { insertedPayloads } = mockRecordingsTable({
      insertResults: [
        {
          data: null,
          error: {
            code: 'PGRST204',
            message: "Could not find the 'student_id' column of 'recordings' in the schema cache",
          },
        },
        { data: [{ id: 'rec-saved-1' }], error: null },
      ],
    });

    const result = await saveOneRecording();

    expect(insertedPayloads).toHaveLength(2);
    expect(insertedPayloads[0].student_id).toBe('profile-david');
    expect(insertedPayloads[1]).not.toHaveProperty('student_id');
    expect(onSaveSuccess).toHaveBeenCalledWith([{ id: 'rec-saved-1' }], 1);
    expect(result.current.appError).toBe('');
  });

  it('removes the replaced recording and its audio file only after the new one is saved', async () => {
    const { insertMock, deleteMock, eqMock } = mockRecordingsTable();

    await saveOneRecording({ existingRecordingId: 'old-rec-id' });

    expect(eqMock).toHaveBeenCalledWith('id', 'old-rec-id');
    expect(insertMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMock.mock.invocationCallOrder[0]
    );
    expect(deleteFileByUrlMock).toHaveBeenCalledWith(
      'https://pub.example.dev/profile-david/old.webm'
    );
    expect(onSaveSuccess).toHaveBeenCalled();
  });

  it('keeps the previous recording when saving the new one fails', async () => {
    const { deleteMock } = mockRecordingsTable({
      insertResults: [{ data: null, error: { code: '23514', message: 'check violation' } }],
    });

    const result = await saveOneRecording({ existingRecordingId: 'old-rec-id' });

    expect(deleteMock).not.toHaveBeenCalled();
    expect(deleteFileByUrlMock).not.toHaveBeenCalled();
    expect(onSaveSuccess).not.toHaveBeenCalled();
    expect(result.current.appError.length).toBeGreaterThan(0);
  });

  it('keeps the previous recording when the audio upload fails', async () => {
    const { insertMock, deleteMock } = mockRecordingsTable();
    sendMock.mockRejectedValueOnce(new Error('S3 Network Failure'));

    await saveOneRecording({ existingRecordingId: 'old-rec-id' });

    expect(insertMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('saves recordings to S3 and Supabase when saveRecording is triggered', async () => {
    const savedRecord = { id: 'rec-saved-1', topic_number: 1, student_name: 'David' };
    const selectMock = vi.fn().mockResolvedValue({ data: [savedRecord], error: null });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const deleteSelectMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqMock = vi.fn().mockReturnValue({ select: deleteSelectMock });
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

  it('sets error and prevents save when student profile is missing teacher_id', async () => {
    const unlinkedProfile = { name: 'David' }; // missing teacher_id

    const { result } = renderHook(() =>
      useRecording({
        user: mockUser,
        profile: unlinkedProfile,
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
    expect(result.current.appError).toContain('chưa được liên kết với giáo viên');
    expect(sendMock).not.toHaveBeenCalled();
  });
});

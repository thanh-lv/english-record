import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecording } from '../useRecording';
import { supabase } from '../../../../lib/supabase';
import { s3Client } from '../../../../lib/s3';

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../../lib/s3', () => ({
  S3_BUCKET: 'test-bucket',
  s3Client: {
    send: vi.fn().mockResolvedValue({}),
  },
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

  it('saves recordings to S3 and Supabase when saveRecording is triggered', async () => {
    const savedRecord = { id: 'rec-saved-1', topic_number: 1, student_name: 'David' };
    const selectMock = vi.fn().mockResolvedValue({ data: [savedRecord], error: null });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    (supabase.from as any).mockReturnValue({ insert: insertMock });

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

    expect(s3Client.send).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('recordings');
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
    expect(s3Client.send).not.toHaveBeenCalled();
  });
});

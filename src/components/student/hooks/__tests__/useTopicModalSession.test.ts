import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTopicModalSession } from '../useTopicModalSession';

describe('useTopicModalSession hook', () => {
  const mockTopics: any[] = [
    {
      id: 'top-1',
      title: 'Family',
      questions: [
        { id: 'q1', text: 'Who is your mother?', image_url: 'https://example.com/mother.png' },
        { id: 'q2', text: 'Who is your father?' },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens and closes topic modal session cleanly', () => {
    const onModalReset = vi.fn();
    const { result } = renderHook(() =>
      useTopicModalSession({
        activeTopics: mockTopics,
        myRecordings: [],
        isBongBe: false,
        onModalReset,
      })
    );

    expect(result.current.selectedNumber).toBeNull();
    expect(result.current.currentTopic).toBeNull();

    act(() => {
      result.current.openTopicModal(1);
    });

    expect(result.current.selectedNumber).toBe(1);
    expect(result.current.currentTopic?.title).toBe('Family');
    expect(onModalReset).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.closeTopicModal();
    });

    expect(result.current.selectedNumber).toBeNull();
    expect(result.current.currentTopic).toBeNull();
  });

  it('derives topicImage and TTS audio correctly when active question changes', () => {
    const { result } = renderHook(() =>
      useTopicModalSession({
        activeTopics: mockTopics,
        myRecordings: [],
        isBongBe: false,
      })
    );

    act(() => {
      result.current.openTopicModal(1);
    });

    expect(result.current.topicImage).toBe('https://example.com/mother.png');
    expect(result.current.topicAudio).toBe('browser_tts');

    // Switch to question 2 (no image)
    act(() => {
      result.current.setActiveQuestionIndex(1);
    });

    expect(result.current.topicImage).toBeNull();
  });

  it('computes matchedQuestionRecording and isTopicFullyRecorded', () => {
    const mockRecordings: any[] = [
      { id: 'rec-1', topic_number: 1, question_id: 'q1', text: 'Who is your mother?' },
      { id: 'rec-2', topic_number: 1, question_id: 'q2', text: 'Who is your father?' },
    ];

    const { result } = renderHook(() =>
      useTopicModalSession({
        activeTopics: mockTopics,
        myRecordings: mockRecordings,
        isBongBe: false,
      })
    );

    act(() => {
      result.current.openTopicModal(1);
    });

    expect(result.current.matchedQuestionRecording?.id).toBe('rec-1');
    expect(result.current.isTopicFullyRecorded).toBe(true);
    expect(result.current.canRetry).toBe(false);
  });
});

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Topic, Recording } from '../../../types';

interface UseTopicModalSessionOptions {
  activeTopics: Topic[];
  myRecordings: Recording[];
  isBongBe: boolean;
  onModalReset?: () => void;
}

/**
 * Headless hook encapsulating all session state and audio/image interactions
 * for the Student Topic Exercise Modal.
 */
export function useTopicModalSession({
  activeTopics,
  myRecordings,
  isBongBe,
  onModalReset,
}: UseTopicModalSessionOptions) {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const [topicImage, setTopicImage] = useState<string | null>(null);
  const [topicAudio, setTopicAudio] = useState<string | null>(null);
  const [isPlayingTopicAudio, setIsPlayingTopicAudio] = useState(false);

  const topicAudioRef = useRef<HTMLAudioElement | null>(null);
  const retryRecordingRef = useRef<{ id: string; topic_number: number } | null>(null);

  // Sync question image and TTS audio source when active topic or question index changes
  useEffect(() => {
    if (!selectedNumber) return;

    const topic = activeTopics[selectedNumber - 1];
    if (!topic) return;

    setTopicImage(null);
    setIsPlayingTopicAudio(false);

    const activeQuestion = topic.questions[activeQuestionIndex] || null;
    if (activeQuestion?.image_url) {
      setTopicImage(activeQuestion.image_url);
    }

    setTopicAudio('browser_tts');
  }, [selectedNumber, activeQuestionIndex, activeTopics]);

  const openTopicModal = useCallback(
    (num: number, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const topicData = activeTopics[num - 1];
      if (!topicData) return;

      setSelectedNumber(num);
      setCurrentTopic(topicData);
      setActiveQuestionIndex(0);
      onModalReset?.();
    },
    [activeTopics, onModalReset]
  );

  const closeTopicModal = useCallback(() => {
    if (topicAudioRef.current) topicAudioRef.current.pause();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTopicAudio(false);
    setSelectedNumber(null);
    setCurrentTopic(null);
  }, []);

  const playTopicAudio = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!topicAudio || !currentTopic) return;

      if (isPlayingTopicAudio) {
        if (topicAudioRef.current) topicAudioRef.current.pause();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsPlayingTopicAudio(false);
        return;
      }

      const activeQuestion = currentTopic.questions?.[activeQuestionIndex];
      const textToRead = activeQuestion ? activeQuestion.text : currentTopic.title;

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;

        utterance.onstart = () => setIsPlayingTopicAudio(true);
        utterance.onend = () => setIsPlayingTopicAudio(false);
        utterance.onerror = () => setIsPlayingTopicAudio(false);

        window.speechSynthesis.speak(utterance);
      }
    },
    [topicAudio, currentTopic, isPlayingTopicAudio, activeQuestionIndex]
  );

  // Matched recording for the active question
  const matchedQuestionRecording = useMemo(() => {
    if (!selectedNumber || !currentTopic) return null;
    const activeQuestion = currentTopic.questions?.[activeQuestionIndex];
    if (!activeQuestion) return null;

    const isTopicMatch = (r: any) =>
      (r.topic_id && currentTopic.id && r.topic_id === currentTopic.id) ||
      (r.topic &&
        currentTopic.title &&
        r.topic.trim().toLowerCase() === currentTopic.title.trim().toLowerCase()) ||
      Number(r.topic_number) === selectedNumber ||
      (currentTopic.order_index != null &&
        Number(r.topic_number) === Number(currentTopic.order_index));

    return (
      myRecordings.find(
        (r: any) =>
          isTopicMatch(r) &&
          ((r.question_id && activeQuestion.id && r.question_id === activeQuestion.id) ||
            (r.question_text &&
              activeQuestion.text &&
              r.question_text.trim().toLowerCase() === activeQuestion.text.trim().toLowerCase()) ||
            (isBongBe && r.topic === currentTopic.title) ||
            (!r.question_id && !r.question_text))
      ) || null
    );
  }, [selectedNumber, currentTopic, activeQuestionIndex, myRecordings, isBongBe]);

  // Derived state: topic completion and retry status
  const { isTopicFullyRecorded, canRetry } = useMemo(() => {
    if (!selectedNumber || !currentTopic) {
      return { isTopicFullyRecorded: false, canRetry: false };
    }

    const isTopicMatch = (r: any) =>
      (r.topic_id && currentTopic.id && r.topic_id === currentTopic.id) ||
      (r.topic &&
        currentTopic.title &&
        r.topic.trim().toLowerCase() === currentTopic.title.trim().toLowerCase()) ||
      Number(r.topic_number) === selectedNumber ||
      (currentTopic.order_index != null &&
        Number(r.topic_number) === Number(currentTopic.order_index));

    const recordedQuestionsCount = currentTopic.questions.filter((q: any) =>
      myRecordings.some(
        (r: any) =>
          isTopicMatch(r) &&
          ((r.question_id && q.id && r.question_id === q.id) ||
            (r.question_text &&
              q.text &&
              r.question_text.trim().toLowerCase() === q.text.trim().toLowerCase()) ||
            (!r.question_id && !r.question_text))
      )
    ).length;

    const hasGlobal = myRecordings.some(
      (r: any) => isTopicMatch(r) && !r.question_id && !r.question_text
    );
    const hasAny = myRecordings.some((r: any) => isTopicMatch(r));

    const fullyRecorded =
      hasGlobal ||
      (currentTopic.questions.length > 0 &&
        recordedQuestionsCount === currentTopic.questions.length) ||
      (currentTopic.questions.length === 0 && hasAny);

    const topicRecordings = myRecordings.filter((r: any) => isTopicMatch(r));
    const hasRejected = topicRecordings.some((r: any) => r.status === 'rejected');

    return {
      isTopicFullyRecorded: fullyRecorded,
      canRetry: hasRejected,
    };
  }, [selectedNumber, currentTopic, myRecordings]);

  return {
    selectedNumber,
    setSelectedNumber,
    currentTopic,
    setCurrentTopic,
    activeQuestionIndex,
    setActiveQuestionIndex,
    topicImage,
    topicAudio,
    isPlayingTopicAudio,
    matchedQuestionRecording,
    isTopicFullyRecorded,
    canRetry,
    retryRecordingRef,
    openTopicModal,
    closeTopicModal,
    playTopicAudio,
  };
}

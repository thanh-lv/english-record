import { useEffect, useRef, useState } from 'react';

/**
 * Hook that decouples completion tracking and celebration triggering logic
 * from the student presentation component.
 *
 * @param completedTopicNumbers - List of fully completed topic numbers
 * @param topicsLoading - Loading state of topic data
 * @param activeTopicsCount - Total number of active topics
 */
export function useCelebrationTrigger(
  completedTopicNumbers: number[],
  topicsLoading: boolean,
  activeTopicsCount: number
) {
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedCount = useRef(0);
  const isDataReady = useRef(false);

  useEffect(() => {
    if (topicsLoading || activeTopicsCount === 0) return;

    const fullyCompletedCount = completedTopicNumbers.length;

    if (!isDataReady.current) {
      isDataReady.current = true;
      prevCompletedCount.current = fullyCompletedCount;
      return;
    }

    if (fullyCompletedCount > prevCompletedCount.current) {
      setShowCelebration(true);
    }
    prevCompletedCount.current = fullyCompletedCount;
  }, [completedTopicNumbers, topicsLoading, activeTopicsCount]);

  const closeCelebration = () => setShowCelebration(false);

  return {
    showCelebration,
    closeCelebration,
  };
}

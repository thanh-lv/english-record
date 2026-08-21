import { useEffect, useRef, useState } from 'react';

/**
 * Hook that decouples completion tracking and celebration triggering logic
 * from the student presentation component.
 *
 * @param completedTopicNumbers - List of fully completed topic numbers
 * @param isDataLoading - Loading state of topic & recording data
 * @param activeTopicsCount - Total number of active topics
 */
export function useCelebrationTrigger(
  completedTopicNumbers: number[],
  isDataLoading: boolean,
  activeTopicsCount: number
) {
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedCount = useRef<number | null>(null);
  const isDataReady = useRef(false);

  useEffect(() => {
    // If still loading either topics or student recordings, or no active topics yet, wait!
    if (isDataLoading || activeTopicsCount === 0) return;

    const fullyCompletedCount = completedTopicNumbers.length;

    // First time data is completely loaded and settled: snapshot initial count without triggering celebration
    if (!isDataReady.current) {
      isDataReady.current = true;
      prevCompletedCount.current = fullyCompletedCount;
      return;
    }

    // Only trigger celebration if count actually increased during this active session
    if (prevCompletedCount.current !== null && fullyCompletedCount > prevCompletedCount.current) {
      setShowCelebration(true);
    }
    prevCompletedCount.current = fullyCompletedCount;
  }, [completedTopicNumbers, isDataLoading, activeTopicsCount]);

  const closeCelebration = () => setShowCelebration(false);

  return {
    showCelebration,
    closeCelebration,
  };
}

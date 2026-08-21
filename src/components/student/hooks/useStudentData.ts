import { useMemo } from 'react';
import { calculateStreak } from '../../../utils';
import { useStudentTopics } from './useStudentTopics';
import { useStudentRecordings } from './useStudentRecordings';
import { useStudentStories } from './useStudentStories';

export { useStudentTopics, useStudentRecordings, useStudentStories };

export function useStudentData(user: any, profile: any, isBongBe: boolean, _studentAge?: number) {
  const { activeTopics, topicsLoading } = useStudentTopics(profile, isBongBe);
  const {
    myRecordings,
    setMyRecordings,
    completedNumbers,
    setCompletedNumbers,
    recordingsLoading,
  } = useStudentRecordings(user, profile);
  const { dbStories } = useStudentStories(profile);

  const streak = useMemo(() => calculateStreak(myRecordings), [myRecordings]);
  const isInitialLoading = topicsLoading || recordingsLoading;

  return {
    activeTopics,
    topicsLoading,
    recordingsLoading,
    isInitialLoading,
    myRecordings,
    setMyRecordings,
    completedNumbers,
    setCompletedNumbers,
    dbStories,
    streak,
  };
}

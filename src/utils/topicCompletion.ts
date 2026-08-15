/**
 * Determines which topic numbers are fully completed based on recordings.
 * A topic is "completed" if:
 * - It has a global recording (no question_id/question_text), OR
 * - It has no questions and any recording exists, OR
 * - All its questions have matching recordings.
 */
export function getCompletedTopicNumbers(
  activeTopics: any[],
  recordings: any[],
): number[] {
  return activeTopics
    .map((topic, idx) => {
      const topicNum = idx + 1;
      const hasGlobalRecording = recordings.some(
        (r: any) =>
          r.topic_number === topicNum && !r.question_id && !r.question_text,
      );
      if (hasGlobalRecording) return topicNum;

      const questions: any[] = topic.questions || [];
      if (questions.length === 0) {
        return recordings.some((r: any) => r.topic_number === topicNum)
          ? topicNum
          : null;
      }

      const allAnswered = questions.every((q: any) =>
        recordings.some(
          (r: any) =>
            r.topic_number === topicNum &&
            (r.question_id === q.id || r.question_text === q.text),
        ),
      );
      return allAnswered ? topicNum : null;
    })
    .filter((num): num is number => num !== null);
}

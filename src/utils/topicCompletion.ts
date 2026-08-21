/**
 * Determines which topic numbers are fully completed based on recordings.
 * A topic is "completed" if:
 * - It has a global recording (matching topic_id, topic title, or topic_number with no question_id/question_text), OR
 * - It has no questions and any matching recording exists, OR
 * - All its questions have matching recordings.
 */
export function getCompletedTopicNumbers(activeTopics: any[], recordings: any[]): number[] {
  return activeTopics
    .map((topic, idx) => {
      const topicNum = idx + 1;
      const isTopicMatch = (r: any) =>
        (r.topic_id && topic?.id && r.topic_id === topic.id) ||
        (r.topic &&
          topic?.title &&
          r.topic.trim().toLowerCase() === topic.title.trim().toLowerCase()) ||
        Number(r.topic_number) === topicNum ||
        (topic?.order_index != null && Number(r.topic_number) === Number(topic.order_index));

      const hasGlobalRecording = recordings.some(
        (r: any) => isTopicMatch(r) && !r.question_id && !r.question_text
      );
      if (hasGlobalRecording) return topicNum;

      const questions: any[] = topic.questions || [];
      if (questions.length === 0) {
        return recordings.some((r: any) => isTopicMatch(r)) ? topicNum : null;
      }

      const allAnswered = questions.every((q: any) =>
        recordings.some(
          (r: any) =>
            isTopicMatch(r) &&
            ((r.question_id && q.id && r.question_id === q.id) ||
              (r.question_text &&
                q.text &&
                r.question_text.trim().toLowerCase() === q.text.trim().toLowerCase()))
        )
      );
      return allAnswered ? topicNum : null;
    })
    .filter((num): num is number => num !== null);
}

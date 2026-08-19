import { describe, it, expect } from 'vitest';
import { getCompletedTopicNumbers } from '../topicCompletion';

describe('getCompletedTopicNumbers', () => {
  const activeTopics = [
    {
      id: 't1',
      title: 'Topic 1 - Self Introduction',
      questions: [
        { id: 'q1', text: 'What is your name?' },
        { id: 'q2', text: 'How old are you?' },
      ],
    },
    {
      id: 't2',
      title: 'Topic 2 - Free Speaking (No questions)',
      questions: [],
    },
    {
      id: 't3',
      title: 'Topic 3 - Family',
      questions: [
        { id: 'q3', text: 'How many people in your family?' },
        { id: 'q4', text: 'Who is your best friend in family?' },
      ],
    },
  ];

  it('returns empty array when there are no recordings', () => {
    expect(getCompletedTopicNumbers(activeTopics, [])).toEqual([]);
  });

  it('identifies completed topic with global recording (no question_id or question_text)', () => {
    const recordings = [
      { topic_number: 1, question_id: null, question_text: null },
    ];
    // Topic 1 has global recording -> completed
    expect(getCompletedTopicNumbers(activeTopics, recordings)).toEqual([1]);
  });

  it('identifies topic with no questions as completed when any recording exists for it', () => {
    const recordings = [
      { topic_number: 2, question_id: 'any-dummy-id' },
    ];
    expect(getCompletedTopicNumbers(activeTopics, recordings)).toEqual([2]);
  });

  it('identifies topic as completed when all questions are answered by question_id', () => {
    const recordings = [
      { topic_number: 1, question_id: 'q1' },
      { topic_number: 1, question_id: 'q2' },
    ];
    expect(getCompletedTopicNumbers(activeTopics, recordings)).toEqual([1]);
  });

  it('identifies topic as completed when questions are answered by matching question_text', () => {
    const recordings = [
      { topic_number: 1, question_text: 'What is your name?' },
      { topic_number: 1, question_text: 'How old are you?' },
    ];
    expect(getCompletedTopicNumbers(activeTopics, recordings)).toEqual([1]);
  });

  it('does not mark topic as completed if only some questions are answered', () => {
    const recordings = [
      { topic_number: 1, question_id: 'q1' }, // q2 is missing
    ];
    expect(getCompletedTopicNumbers(activeTopics, recordings)).toEqual([]);
  });

  it('handles multiple completed topics simultaneously', () => {
    const recordings = [
      { topic_number: 1, question_id: 'q1' },
      { topic_number: 1, question_id: 'q2' },
      { topic_number: 2, question_id: null },
      { topic_number: 3, question_id: 'q3' }, // q4 missing for topic 3
    ];
    expect(getCompletedTopicNumbers(activeTopics, recordings)).toEqual([1, 2]);
  });
});

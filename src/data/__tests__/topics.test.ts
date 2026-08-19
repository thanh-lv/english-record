import { describe, it, expect } from 'vitest';
import { TOPICS } from '../topics';

describe('TOPICS static dataset', () => {
  it('contains a non-empty list of structured topics', () => {
    expect(Array.isArray(TOPICS)).toBe(true);
    expect(TOPICS.length).toBeGreaterThan(0);
  });

  it('validates each topic has valid id, title, and matching questions/translations/sampleAnswers', () => {
    TOPICS.forEach((topic, idx) => {
      expect(topic.id).toBe(idx + 1);
      expect(typeof topic.title).toBe('string');
      expect(topic.title.trim().length).toBeGreaterThan(0);

      expect(Array.isArray(topic.questions)).toBe(true);
      expect(Array.isArray(topic.translations)).toBe(true);
      expect(Array.isArray(topic.sampleAnswers)).toBe(true);

      expect(topic.questions.length).toBe(topic.translations.length);
      expect(topic.questions.length).toBe(topic.sampleAnswers.length);

      topic.questions.forEach(q => {
        expect(typeof q).toBe('string');
        expect(q.trim().length).toBeGreaterThan(0);
      });
    });
  });
});

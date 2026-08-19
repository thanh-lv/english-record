import { describe, it, expect } from 'vitest';
import { PRIZES, getPrizeForTopic } from '../prizes';

describe('prizes utility', () => {
  it('defines a non-empty list of prize emojis', () => {
    expect(PRIZES).toBeDefined();
    expect(Array.isArray(PRIZES)).toBe(true);
    expect(PRIZES).toHaveLength(14);
    PRIZES.forEach(p => {
      expect(typeof p).toBe('string');
      expect(p.length).toBeGreaterThan(0);
    });
  });

  it('contains expected iconic prize emojis in order', () => {
    expect(PRIZES[0]).toBe('🎈');
    expect(PRIZES[1]).toBe('🎁');
    expect(PRIZES[2]).toBe('🌟');
    expect(PRIZES[3]).toBe('🏅');
    expect(PRIZES[4]).toBe('👑');
    expect(PRIZES[5]).toBe('💎');
    expect(PRIZES[13]).toBe('🎠');
  });

  it('returns corresponding prize for 1-based topic numbers within first cycle', () => {
    for (let i = 1; i <= PRIZES.length; i++) {
      expect(getPrizeForTopic(i)).toBe(PRIZES[i - 1]);
    }
  });

  it('cycles correctly for topic numbers beyond first cycle', () => {
    const len = PRIZES.length;
    expect(getPrizeForTopic(len + 1)).toBe(PRIZES[0]); // 15 -> index 0 ('🎈')
    expect(getPrizeForTopic(len + 2)).toBe(PRIZES[1]); // 16 -> index 1 ('🎁')
    expect(getPrizeForTopic(len * 2)).toBe(PRIZES[len - 1]); // 28 -> index 13 ('🎠')
    expect(getPrizeForTopic(len * 2 + 1)).toBe(PRIZES[0]); // 29 -> index 0 ('🎈')
  });

  it('handles edge case numbers gracefully', () => {
    // topic 1
    expect(getPrizeForTopic(1)).toBe('🎈');

    // large numbers
    const largeTopic = PRIZES.length * 100 + 1; // index 0
    expect(getPrizeForTopic(largeTopic)).toBe('🎈');

    const topic100 = 100; // (99 % 14 = 1) -> PRIZES[1]
    expect(getPrizeForTopic(topic100)).toBe(PRIZES[99 % PRIZES.length]);
  });
});

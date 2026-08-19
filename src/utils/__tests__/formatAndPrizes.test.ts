import { describe, it, expect } from 'vitest';
import { formatClassName } from '../format';
import { getPrizeForTopic, PRIZES } from '../prizes';

describe('format and prize utilities', () => {
  describe('formatClassName', () => {
    it('returns default unassigned text for null, undefined, or empty string', () => {
      expect(formatClassName(null)).toBe('Chưa phân lớp');
      expect(formatClassName(undefined)).toBe('Chưa phân lớp');
      expect(formatClassName('')).toBe('Chưa phân lớp');
      expect(formatClassName('   ')).toBe('Chưa phân lớp');
    });

    it('returns custom unassigned text when specified', () => {
      expect(formatClassName(null, 'No Class')).toBe('No Class');
    });

    it('adds prefix "Lớp " if className is just a grade or name without prefix', () => {
      expect(formatClassName('5A')).toBe('Lớp 5A');
      expect(formatClassName('10')).toBe('Lớp 10');
    });

    it('does not double-prefix if already prefixed with lớp, khối, class, grade', () => {
      expect(formatClassName('Lớp 5A')).toBe('Lớp 5A');
      expect(formatClassName('lớp 12')).toBe('lớp 12');
      expect(formatClassName('Khối 3')).toBe('Khối 3');
      expect(formatClassName('Class 4B')).toBe('Class 4B');
      expect(formatClassName('Grade 1')).toBe('Grade 1');
    });

    it('preserves special filter options like All or Tất cả lớp', () => {
      expect(formatClassName('all')).toBe('all');
      expect(formatClassName('All')).toBe('All');
      expect(formatClassName('Tất cả lớp')).toBe('Tất cả lớp');
      expect(formatClassName('tất cả các lớp')).toBe('tất cả các lớp');
    });
  });

  describe('getPrizeForTopic', () => {
    it('returns correct prize according to topic index', () => {
      expect(getPrizeForTopic(1)).toBe(PRIZES[0]);
      expect(getPrizeForTopic(2)).toBe(PRIZES[1]);
      expect(getPrizeForTopic(PRIZES.length)).toBe(PRIZES[PRIZES.length - 1]);
    });

    it('cycles prizes modulo when topic number exceeds prize list length', () => {
      expect(getPrizeForTopic(PRIZES.length + 1)).toBe(PRIZES[0]);
      expect(getPrizeForTopic(PRIZES.length + 2)).toBe(PRIZES[1]);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateStreak } from '../streak';

describe('calculateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 19, 12, 0, 0)); // Aug 19, 2026 local time
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to generate ISO string relative to current local mock date
  function makeDate(daysAgo: number, hour = 12): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  it('returns 0 for null or empty records array', () => {
    expect(calculateStreak([])).toBe(0);
    expect(calculateStreak(null as any)).toBe(0);
    expect(calculateStreak(undefined as any)).toBe(0);
  });

  it('returns 0 when records contain no valid created_at fields', () => {
    const records = [{ id: 1 }, { id: 2, created_at: null }, { id: 3, created_at: '' }];
    expect(calculateStreak(records)).toBe(0);
  });

  it('returns 1 when user recorded only today', () => {
    const records = [{ created_at: makeDate(0, 9) }];
    expect(calculateStreak(records)).toBe(1);
  });

  it('returns 1 when user recorded yesterday and has not recorded today yet', () => {
    const records = [{ created_at: makeDate(1, 15) }];
    expect(calculateStreak(records)).toBe(1);
  });

  it('returns 0 when the latest record is 2 days ago (streak broken)', () => {
    const records = [{ created_at: makeDate(2, 10) }, { created_at: makeDate(3, 10) }];
    expect(calculateStreak(records)).toBe(0);
  });

  it('handles multiple records on the same day without inflating streak', () => {
    const records = [
      { created_at: makeDate(0, 8) },
      { created_at: makeDate(0, 12) },
      { created_at: makeDate(0, 16) },
    ];
    expect(calculateStreak(records)).toBe(1);
  });

  it('calculates consecutive streak ending today', () => {
    const records = [
      { created_at: makeDate(0, 9) },
      { created_at: makeDate(1, 10) },
      { created_at: makeDate(2, 11) },
      { created_at: makeDate(3, 8) },
      { created_at: makeDate(4, 15) },
    ];
    expect(calculateStreak(records)).toBe(5);
  });

  it('calculates consecutive streak ending yesterday when today has no records', () => {
    const records = [
      { created_at: makeDate(1, 10) },
      { created_at: makeDate(2, 11) },
      { created_at: makeDate(3, 8) },
    ];
    expect(calculateStreak(records)).toBe(3);
  });

  it('stops counting streak when there is a gap in consecutive days', () => {
    const records = [
      { created_at: makeDate(0, 9) }, // Today (Day 1)
      { created_at: makeDate(1, 10) }, // Yesterday (Day 2)
      // Gap: makeDate(2) is missing!
      { created_at: makeDate(3, 8) },
      { created_at: makeDate(4, 15) },
    ];
    expect(calculateStreak(records)).toBe(2);
  });

  it('handles unsorted record entries properly', () => {
    const records = [
      { created_at: makeDate(2, 11) },
      { created_at: makeDate(0, 9) },
      { created_at: makeDate(1, 10) },
    ];
    expect(calculateStreak(records)).toBe(3);
  });
});

import { describe, it, expect } from 'vitest';
import { solarToLunar, lunarFromDate, isLunarMonthStart, nextLunarFirstDay } from '../lunar';

describe('solarToLunar', () => {
  it.each([
    [10, 2, 2024, 2024],
    [29, 1, 2025, 2025],
    [17, 2, 2026, 2026],
    [6, 2, 2027, 2027],
  ])('maps Tết %i/%i/%i to mùng 1 tháng Giêng', (d, m, y, lunarYear) => {
    expect(solarToLunar(d, m, y)).toEqual({ day: 1, month: 1, year: lunarYear, leap: false });
  });

  it('keeps the old lunar year on the day before Tết', () => {
    expect(solarToLunar(16, 2, 2026)).toEqual({ day: 29, month: 12, year: 2025, leap: false });
    expect(solarToLunar(9, 2, 2024)).toEqual({ day: 30, month: 12, year: 2023, leap: false });
  });

  it('handles leap months', () => {
    // 2023 nhuận tháng 2, 2025 nhuận tháng 6
    expect(solarToLunar(22, 3, 2023)).toEqual({ day: 1, month: 2, year: 2023, leap: true });
    expect(solarToLunar(20, 2, 2023)).toEqual({ day: 1, month: 2, year: 2023, leap: false });
    expect(solarToLunar(25, 7, 2025)).toEqual({ day: 1, month: 6, year: 2025, leap: true });
  });

  it('maps well-known festival dates', () => {
    // Trung thu 2025 và 2026
    expect(solarToLunar(6, 10, 2025)).toMatchObject({ day: 15, month: 8 });
    expect(solarToLunar(25, 9, 2026)).toMatchObject({ day: 15, month: 8 });
  });

  it('reads the date from a Date object in local time', () => {
    expect(lunarFromDate(new Date(2026, 1, 17))).toMatchObject({ day: 1, month: 1, year: 2026 });
  });
});

describe('nextLunarFirstDay', () => {
  it('finds the next mùng 1 strictly after the given day', () => {
    expect(nextLunarFirstDay(new Date(2026, 1, 10))).toEqual(new Date(2026, 1, 17));
    // Đang là mùng 1 thì trả về mùng 1 của tháng sau
    expect(nextLunarFirstDay(new Date(2026, 1, 17))).toEqual(new Date(2026, 2, 19));
  });
});

describe('isLunarMonthStart', () => {
  it('is true only for mùng 1 and mùng 2', () => {
    expect(isLunarMonthStart(solarToLunar(17, 2, 2026))).toBe(true);
    expect(isLunarMonthStart(solarToLunar(18, 2, 2026))).toBe(true);
    expect(isLunarMonthStart(solarToLunar(19, 2, 2026))).toBe(false);
    expect(isLunarMonthStart(solarToLunar(16, 2, 2026))).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { formatClassName } from '../format';

describe('formatClassName utility', () => {
  it('returns unassignedText when input is null, undefined, or empty string', () => {
    expect(formatClassName(null)).toBe('Chưa phân lớp');
    expect(formatClassName(undefined)).toBe('Chưa phân lớp');
    expect(formatClassName('')).toBe('Chưa phân lớp');
    expect(formatClassName('   ')).toBe('Chưa phân lớp');
    expect(formatClassName(null, 'Unassigned Class')).toBe('Unassigned Class');
  });

  it('preserves special filter keywords and existing unassigned strings', () => {
    expect(formatClassName('Chưa phân lớp')).toBe('Chưa phân lớp');
    expect(formatClassName('all')).toBe('all');
    expect(formatClassName('ALL')).toBe('ALL');
    expect(formatClassName('Tất cả lớp')).toBe('Tất cả lớp');
    expect(formatClassName('Tất cả các lớp')).toBe('Tất cả các lớp');
  });

  it('preserves names that already start with class/grade prefixes', () => {
    expect(formatClassName('Lớp 5A')).toBe('Lớp 5A');
    expect(formatClassName('lớp 3B')).toBe('lớp 3B');
    expect(formatClassName('Khối 1')).toBe('Khối 1');
    expect(formatClassName('Class 4A')).toBe('Class 4A');
    expect(formatClassName('Grade 2')).toBe('Grade 2');
  });

  it('prefixes class name with default or custom class prefix when prefix is missing', () => {
    expect(formatClassName('5A')).toBe('Lớp 5A');
    expect(formatClassName('Mầm Non')).toBe('Lớp Mầm Non');
    expect(formatClassName('3B', 'Chưa phân lớp', 'Class ')).toBe('Class 3B');
  });
});

import { describe, it, expect } from 'vitest';
import { vi } from '../vi';
import { en } from '../en';

describe('i18n translations consistency', () => {
  function compareKeys(obj1: Record<string, any>, obj2: Record<string, any>, path = '') {
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();

    // Check all keys in obj1 exist in obj2
    for (const key of keys1) {
      const currentPath = path ? `${path}.${key}` : key;
      expect(obj2, `Missing key "${currentPath}" in target translation`).toHaveProperty(key);

      const val1 = obj1[key];
      const val2 = obj2[key];

      if (Array.isArray(val1)) {
        expect(Array.isArray(val2), `Expected "${currentPath}" to be an array in both translations`).toBe(true);
        expect(val1.length, `Array length mismatch for "${currentPath}"`).toBe(val2.length);
        val1.forEach((item: any, i: number) => {
          expect(typeof item).toBe('string');
          expect(typeof val2[i]).toBe('string');
          expect(item.trim().length).toBeGreaterThan(0);
          expect(val2[i].trim().length).toBeGreaterThan(0);
        });
      } else if (typeof val1 === 'object' && val1 !== null) {
        expect(typeof val2, `Expected "${currentPath}" to be an object`).toBe('object');
        compareKeys(val1, val2, currentPath);
      } else {
        expect(typeof val1, `Type of "${currentPath}" in source`).toBe('string');
        expect(typeof val2, `Type of "${currentPath}" in target`).toBe('string');
        expect(val1.trim().length, `Empty string at "${currentPath}" in source`).toBeGreaterThan(0);
        expect(val2.trim().length, `Empty string at "${currentPath}" in target`).toBeGreaterThan(0);
      }
    }

    // Check no extra keys in obj2 that are not in obj1
    for (const key of keys2) {
      const currentPath = path ? `${path}.${key}` : key;
      expect(obj1, `Extra key "${currentPath}" found in target translation`).toHaveProperty(key);
    }
  }

  it('ensures Vietnamese and English translation dictionaries have identical nested keys', () => {
    compareKeys(vi, en);
  });
});

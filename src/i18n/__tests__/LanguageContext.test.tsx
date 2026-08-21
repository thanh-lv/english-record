import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useLanguage, interpolate } from '../LanguageContext';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(Promise.resolve({})),
      }),
    }),
  },
}));

describe('LanguageContext and interpolate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('interpolate helper', () => {
    it('replaces single and multiple placeholders with provided values', () => {
      expect(interpolate('Hello {name}!', { name: 'Thanh' })).toBe('Hello Thanh!');
      expect(
        interpolate('{greeting}, {name}! You have {count} messages.', {
          greeting: 'Hi',
          name: 'Alice',
          count: 5,
        })
      ).toBe('Hi, Alice! You have 5 messages.');
    });

    it('replaces missing variables with empty string', () => {
      expect(interpolate('Hello {unknown}!', {})).toBe('Hello !');
    });
  });

  describe('LanguageProvider and useLanguage', () => {
    it('defaults to saved language in localStorage if valid', () => {
      localStorage.setItem('app-language', 'en');
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });
      expect(result.current.lang).toBe('en');
      expect(result.current.t.appName).toBe('English with Fun');
    });

    it('switches language and persists to localStorage and Supabase profile', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLang('en', 'profile-123');
      });

      expect(result.current.lang).toBe('en');
      expect(localStorage.getItem('app-language')).toBe('en');
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
  });
});

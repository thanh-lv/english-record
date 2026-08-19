import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  validateStudentName,
  validatePassword,
  validateYearBorn,
  validateGrade,
  validateGrades,
  validateTopicTitle,
  validateQuestion,
  extractYoutubeId,
  validateShadowingVideo,
  validateStory,
  validateVocabSet,
  validateVocabCard,
  validateImageFile,
  validatePhone,
} from '../validators';

describe('validators utilities', () => {
  describe('sanitizeText', () => {
    it('returns empty string for null, undefined, or empty string', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText('   ')).toBe('');
    });

    it('strips non-printable ASCII control characters but preserves clean text', () => {
      const malicious = 'Hello\u0000\u0007\u001F World\u007F!';
      expect(sanitizeText(malicious)).toBe('Hello World!');
    });

    it('trims leading and trailing whitespace', () => {
      expect(sanitizeText('   Clean Name   ')).toBe('Clean Name');
    });
  });

  describe('validateStudentName', () => {
    it('validates correct student name', () => {
      expect(validateStudentName('Nguyen Van A')).toEqual({ isValid: true });
    });

    it('fails when name is empty or only whitespace', () => {
      const res = validateStudentName('   ');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Vui lòng nhập tên học sinh.');
    });

    it('fails when name is shorter than 2 characters', () => {
      const res = validateStudentName('A');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Tên phải có ít nhất 2 ký tự.');
    });

    it('fails when name exceeds 50 characters', () => {
      const longName = 'A'.repeat(51);
      const res = validateStudentName(longName);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Tên không được vượt quá 50 ký tự.');
    });

    it('uses custom error messages when provided', () => {
      const res = validateStudentName('', { required: 'Custom required message' });
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Custom required message');
    });
  });

  describe('validatePassword', () => {
    it('validates password with default minimum length (3)', () => {
      expect(validatePassword('123')).toEqual({ isValid: true });
      expect(validatePassword('12')).toEqual({
        isValid: false,
        error: 'Mật khẩu phải có ít nhất 3 ký tự.',
      });
    });

    it('validates password with custom minimum length (6 for teachers)', () => {
      expect(validatePassword('123456', 6)).toEqual({ isValid: true });
      expect(validatePassword('12345', 6)).toEqual({
        isValid: false,
        error: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
    });

    it('fails when password is empty', () => {
      expect(validatePassword('')).toEqual({
        isValid: false,
        error: 'Vui lòng nhập mật khẩu.',
      });
    });

    it('fails when password exceeds 100 characters', () => {
      const longPass = 'p'.repeat(101);
      const res = validatePassword(longPass);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Mật khẩu không được vượt quá 100 ký tự.');
    });
  });

  describe('validateYearBorn', () => {
    const currentYear = new Date().getFullYear();

    it('validates year in default range', () => {
      expect(validateYearBorn(currentYear - 10)).toEqual({ isValid: true });
      expect(validateYearBorn(String(currentYear - 10))).toEqual({ isValid: true });
    });

    it('fails when year is below min or above max', () => {
      expect(validateYearBorn(currentYear - 25).isValid).toBe(false);
      expect(validateYearBorn(currentYear - 1).isValid).toBe(false);
    });

    it('fails for non-integer or NaN inputs', () => {
      expect(validateYearBorn('not-a-number').isValid).toBe(false);
      expect(validateYearBorn(2015.5).isValid).toBe(false);
    });

    it('respects custom minYear and maxYear parameters', () => {
      expect(validateYearBorn(2000, 1990, 2010)).toEqual({ isValid: true });
      expect(validateYearBorn(1985, 1990, 2010).isValid).toBe(false);
    });
  });

  describe('validateGrade & validateGrades', () => {
    it('allows null, undefined, or empty grade', () => {
      expect(validateGrade(null)).toEqual({ isValid: true });
      expect(validateGrade(undefined)).toEqual({ isValid: true });
      expect(validateGrade('')).toEqual({ isValid: true });
    });

    it('validates grade between 1 and 12', () => {
      expect(validateGrade(1)).toEqual({ isValid: true });
      expect(validateGrade(12)).toEqual({ isValid: true });
      expect(validateGrade('5')).toEqual({ isValid: true });

      expect(validateGrade(0).isValid).toBe(false);
      expect(validateGrade(13).isValid).toBe(false);
      expect(validateGrade('invalid').isValid).toBe(false);
    });

    it('validates grades array', () => {
      expect(validateGrades([1, 2, 3, 12])).toEqual({ isValid: true });
      expect(validateGrades('not-array').isValid).toBe(false);
      expect(validateGrades([1, 15]).isValid).toBe(false);
    });
  });

  describe('validateTopicTitle', () => {
    it('validates valid topic title', () => {
      expect(validateTopicTitle('Unit 1: Animals')).toEqual({ isValid: true });
    });

    it('fails when title is empty or < 2 characters', () => {
      expect(validateTopicTitle('').isValid).toBe(false);
      expect(validateTopicTitle('A').isValid).toBe(false);
    });

    it('fails when title exceeds 100 characters', () => {
      expect(validateTopicTitle('A'.repeat(101)).isValid).toBe(false);
    });
  });

  describe('validateQuestion', () => {
    it('validates valid question data', () => {
      const q = {
        text: 'What is your favorite color?',
        translation: 'Màu yêu thích của bạn là gì?',
        sample_answer: 'My favorite color is blue.',
        target: 'Colors vocabulary',
      };
      expect(validateQuestion(q)).toEqual({ isValid: true });
    });

    it('fails when question text is missing or too short', () => {
      expect(validateQuestion({ text: '' }).isValid).toBe(false);
      expect(validateQuestion({ text: 'Q' }).isValid).toBe(false);
    });

    it('fails when question fields exceed max length', () => {
      expect(validateQuestion({ text: 'A'.repeat(501) }).isValid).toBe(false);
      expect(
        validateQuestion({ text: 'Valid question', translation: 'A'.repeat(501) }).isValid,
      ).toBe(false);
      expect(
        validateQuestion({ text: 'Valid question', sample_answer: 'A'.repeat(1001) }).isValid,
      ).toBe(false);
      expect(
        validateQuestion({ text: 'Valid question', target: 'A'.repeat(201) }).isValid,
      ).toBe(false);
    });
  });

  describe('extractYoutubeId', () => {
    it('extracts ID from standard watch URL', () => {
      expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from shortened youtu.be URL', () => {
      expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from embed URL', () => {
      expect(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for invalid or empty URLs', () => {
      expect(extractYoutubeId('')).toBeNull();
      expect(extractYoutubeId('https://google.com')).toBeNull();
      expect(extractYoutubeId('https://youtube.com/watch?v=short')).toBeNull();
    });
  });

  describe('validateShadowingVideo', () => {
    it('validates a valid shadowing video configuration', () => {
      const data = {
        title: 'Shadowing Lesson 1',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        preview_start: 0,
        preview_end: 10,
        record_start: 10,
        record_end: 20,
      };
      expect(validateShadowingVideo(data)).toEqual({ isValid: true });
    });

    it('fails when title or URL is invalid', () => {
      expect(
        validateShadowingVideo({
          title: '',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }).isValid,
      ).toBe(false);

      expect(
        validateShadowingVideo({
          title: 'Valid title',
          youtube_url: 'invalid-url',
        }).isValid,
      ).toBe(false);
    });

    it('fails when timing intervals are negative or end <= start', () => {
      expect(
        validateShadowingVideo({
          title: 'Valid title',
          youtube_url: 'https://youtu.be/dQw4w9WgXcQ',
          preview_start: -1,
        }).isValid,
      ).toBe(false);

      expect(
        validateShadowingVideo({
          title: 'Valid title',
          youtube_url: 'https://youtu.be/dQw4w9WgXcQ',
          preview_start: 10,
          preview_end: 5,
        }).isValid,
      ).toBe(false);

      expect(
        validateShadowingVideo({
          title: 'Valid title',
          youtube_url: 'https://youtu.be/dQw4w9WgXcQ',
          record_start: 20,
          record_end: 20,
        }).isValid,
      ).toBe(false);
    });
  });

  describe('validateStory', () => {
    it('validates a complete story', () => {
      const data = {
        title: 'The Tortoise and The Hare',
        content: 'Once upon a time there was a speedy hare who bragged about how fast he could run.',
        emoji: '🐢',
      };
      expect(validateStory(data)).toEqual({ isValid: true });
    });

    it('fails when title is too short or content is less than 10 characters', () => {
      expect(validateStory({ title: 'A', content: 'Long enough content here' }).isValid).toBe(
        false,
      );
      expect(validateStory({ title: 'Valid Title', content: 'Short' }).isValid).toBe(false);
    });

    it('fails when content exceeds 10,000 characters or emoji is invalid', () => {
      expect(
        validateStory({
          title: 'Valid Title',
          content: 'A'.repeat(10001),
        }).isValid,
      ).toBe(false);

      expect(
        validateStory({
          title: 'Valid Title',
          content: 'Valid content is here',
          emoji: 'A'.repeat(11),
        }).isValid,
      ).toBe(false);
    });
  });

  describe('validateVocabSet & validateVocabCard', () => {
    it('validates vocab set title and emoji', () => {
      expect(validateVocabSet({ title: 'Animals', emoji: '🦁' })).toEqual({ isValid: true });
      expect(validateVocabSet({ title: 'A' }).isValid).toBe(false);
      expect(validateVocabSet({ title: 'A'.repeat(101) }).isValid).toBe(false);
    });

    it('validates vocab card front, back, and ipa', () => {
      expect(validateVocabCard({ front: 'Lion', back: 'Sư tử', ipa: '/ˈlaɪ.ən/' })).toEqual({
        isValid: true,
      });
      expect(validateVocabCard({ front: '', back: 'Sư tử' }).isValid).toBe(false);
      expect(validateVocabCard({ front: 'Lion', back: '' }).isValid).toBe(false);
      expect(
        validateVocabCard({ front: 'Lion', back: 'Sư tử', ipa: 'a'.repeat(101) }).isValid,
      ).toBe(false);
    });
  });

  describe('validateImageFile', () => {
    it('validates allowed image formats within size limit', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      expect(validateImageFile(file, 5)).toEqual({ isValid: true });
    });

    it('rejects disallowed file types', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const res = validateImageFile(file);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Định dạng ảnh không hợp lệ');
    });

    it('rejects files exceeding maximum size', () => {
      const largeContent = new Uint8Array(6 * 1024 * 1024);
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const res = validateImageFile(file, 5);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Dung lượng ảnh vượt quá giới hạn');
    });
  });

  describe('validatePhone', () => {
    it('allows empty phone numbers (optional)', () => {
      expect(validatePhone('')).toEqual({ isValid: true });
      expect(validatePhone('   ')).toEqual({ isValid: true });
    });

    it('validates standard phone numbers', () => {
      expect(validatePhone('0912345678')).toEqual({ isValid: true });
      expect(validatePhone('+84912345678')).toEqual({ isValid: true });
      expect(validatePhone('(024) 3789 1234')).toEqual({ isValid: true });
    });

    it('fails for invalid phone numbers', () => {
      expect(validatePhone('123').isValid).toBe(false);
      expect(validatePhone('abcdefghij').isValid).toBe(false);
    });
  });
});

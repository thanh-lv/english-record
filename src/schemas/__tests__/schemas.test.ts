import { describe, it, expect } from 'vitest';
import {
  studentNameSchema,
  studentPasswordSchema,
  yearBornSchema,
  studentGradeSchema,
  createStudentSchema,
  editStudentSchema,
  topicTitleSchema,
  createTopicSchema,
  updateTopicSchema,
  questionSchema,
  parsedQuestionSchema,
  shadowingVideoSchema,
  storySchema,
  aiStoryPromptSchema,
  vocabSetSchema,
  vocabCardSchema,
  vocabAudioBuilderSchema,
  attendanceStudentSchema,
  imageFileSchema,
  validateWithSchema,
  parseApiResponse,
  storyResponseSchema,
  userProfileResponseSchema,
} from '../index';

describe('Zod Schemas Validation', () => {
  describe('studentNameSchema', () => {
    it('validates valid name and auto-sanitizes', () => {
      const res = studentNameSchema.safeParse('  Le Van A  ');
      expect(res.success).toBe(true);
      if (res.success) expect(res.data).toBe('Le Van A');
    });

    it('rejects short or empty names', () => {
      expect(studentNameSchema.safeParse('').success).toBe(false);
      expect(studentNameSchema.safeParse('A').success).toBe(false);
    });

    it('rejects names longer than 50 characters', () => {
      expect(studentNameSchema.safeParse('A'.repeat(51)).success).toBe(false);
    });
  });

  describe('createStudentSchema & editStudentSchema', () => {
    it('validates complete student payload', () => {
      const currentYear = new Date().getFullYear();
      const payload = {
        name: 'Tran Thi B',
        password: 'password123',
        year_born: currentYear - 10,
        grade: 5,
      };
      const res = createStudentSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('validates edit student payload', () => {
      const currentYear = new Date().getFullYear();
      const res = editStudentSchema.safeParse({
        year_born: currentYear - 10,
        grade: 4,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('topicTitleSchema, createTopicSchema & updateTopicSchema', () => {
    it('validates valid topic payload', () => {
      const payload = {
        title: 'Family and Friends',
        type: 'standard' as const,
        grades: [1, 2, 3],
      };
      const res = createTopicSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects invalid grades', () => {
      const payload = {
        title: 'Test Topic',
        grades: [0, 15],
      };
      const res = createTopicSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });

    it('validates updateTopicSchema', () => {
      const res = updateTopicSchema.safeParse({
        title: 'New Topic Title',
        grades: [4, 5],
      });
      expect(res.success).toBe(true);
    });
  });

  describe('questionSchema & parsedQuestionSchema', () => {
    it('validates question details with target and optional image_url', () => {
      const payload = {
        text: 'What is your name?',
        translation: 'Tên bạn là gì?',
        sample_answer: 'My name is John.',
        target: 'Vocabulary lesson 1',
        image_url: 'https://example.com/photo.png',
      };
      const res = questionSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('validates parsedQuestionSchema', () => {
      const res = parsedQuestionSchema.safeParse({
        text: 'Where do you live?',
        sample_answer: 'I live in Hanoi.',
      });
      expect(res.success).toBe(true);
    });

    it('rejects parsed question with short text', () => {
      expect(parsedQuestionSchema.safeParse({ text: 'A' }).success).toBe(false);
    });
  });

  describe('shadowingVideoSchema', () => {
    it('validates shadowing video with valid YouTube ID and timestamps', () => {
      const payload = {
        title: 'Practice Lesson 1',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        preview_start: 5,
        preview_end: 15,
        record_start: 10,
        record_end: 25,
      };
      const res = shadowingVideoSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects invalid preview range', () => {
      const payload = {
        title: 'Practice Lesson 1',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        preview_start: 20,
        preview_end: 10,
      };
      const res = shadowingVideoSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });
  });

  describe('storySchema & aiStoryPromptSchema', () => {
    it('validates story data', () => {
      const payload = {
        title: 'The Friendly Dragon',
        content: 'Once upon a time, there was a friendly dragon living in the green mountains.',
        emoji: '🐉',
        type: 'Truyện tranh',
        grades: [1, 2],
      };
      const res = storySchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('validates aiStoryPromptSchema', () => {
      const res = aiStoryPromptSchema.safeParse({
        prompt: 'A brave astronaut explores Mars.',
        grades: [3, 4],
      });
      expect(res.success).toBe(true);
    });

    it('rejects short AI prompt', () => {
      expect(aiStoryPromptSchema.safeParse({ prompt: 'ab' }).success).toBe(false);
    });
  });

  describe('vocabSetSchema & vocabCardSchema', () => {
    it('validates vocab set', () => {
      const res = vocabSetSchema.safeParse({ title: 'Animal Kingdom', emoji: '🦁' });
      expect(res.success).toBe(true);
    });

    it('validates vocab card', () => {
      const res = vocabCardSchema.safeParse({
        front: 'Lion',
        back: 'Sư tử',
        ipa: '/ˈlaɪ.ən/',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('attendanceStudentSchema', () => {
    it('validates attendance student with fee, hoc_lieu, note, and phone', () => {
      const payload = {
        name: 'Hoang Van C',
        class_name: 'Lớp 3A',
        unit_price: 150000,
        hoc_lieu: 50000,
        phone: '0912345678',
        note: 'Học sinh mới chuyển lớp',
      };
      const res = attendanceStudentSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects negative fee or negative hoc_lieu', () => {
      expect(
        attendanceStudentSchema.safeParse({
          name: 'Hoang Van C',
          unit_price: -50000,
        }).success
      ).toBe(false);

      expect(
        attendanceStudentSchema.safeParse({
          name: 'Hoang Van C',
          unit_price: 100000,
          hoc_lieu: -20000,
        }).success
      ).toBe(false);
    });
  });

  describe('studentPasswordSchema, yearBornSchema, studentGradeSchema', () => {
    it('validates student password', () => {
      expect(studentPasswordSchema.safeParse('12345').success).toBe(true);
      expect(studentPasswordSchema.safeParse('12').success).toBe(false);
    });

    it('validates yearBorn and grade', () => {
      const currentYear = new Date().getFullYear();
      expect(yearBornSchema.safeParse(currentYear - 10).success).toBe(true);
      expect(studentGradeSchema.safeParse(5).success).toBe(true);
      expect(studentGradeSchema.safeParse(15).success).toBe(false);
    });
  });

  describe('vocabAudioBuilderSchema', () => {
    it('validates audio builder payload', () => {
      const res = vocabAudioBuilderSchema.safeParse({
        title: 'Daily Vocabulary Lesson',
        word_list: ['hello', 'world'],
      });
      expect(res.success).toBe(true);
    });
  });

  describe('imageFileSchema', () => {
    it('validates valid image blob', () => {
      const blob = new Blob(['fake-image-content'], { type: 'image/png' });
      expect(imageFileSchema.safeParse(blob).success).toBe(true);
    });
  });

  describe('validateWithSchema helper', () => {
    it('returns formatted error message on failure', () => {
      const res = validateWithSchema(topicTitleSchema, 'A');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Tên chủ đề phải có ít nhất 2 ký tự.');
      }
    });
  });

  describe('parseApiResponse & API Boundary Validation', () => {
    it('parses valid API responses successfully', () => {
      const validStory = {
        id: 'story-1',
        title: 'Bedtime Story',
        type: 'Truyện tranh',
        emoji: '📖',
        content: 'Long text here...',
        is_active: true,
      };
      const result = parseApiResponse(storyResponseSchema, validStory);
      expect(result.id).toBe('story-1');
      expect(result.title).toBe('Bedtime Story');
    });

    it('robustly coerces string grades and string year_born in userProfileResponseSchema', () => {
      const profileWithStringGrade = {
        id: 'user-1',
        name: 'Nguyen Van A',
        role: 'student',
        grade: '3',
        year_born: '2016',
      };
      const result = parseApiResponse(userProfileResponseSchema, profileWithStringGrade);
      expect(result.grade).toBe(3);
      expect(result.year_born).toBe(2016);

      const profileWithEmptyGrade = {
        id: 'user-2',
        name: 'Tran Thi B',
        role: 'student',
        grade: '',
        year_born: null,
      };
      const result2 = parseApiResponse(userProfileResponseSchema, profileWithEmptyGrade);
      expect(result2.grade).toBeNull();
      expect(result2.year_born).toBeNull();
    });

    it('returns fallback data when validation fails and fallback is provided', () => {
      const invalidData = { id: 123, title: '' };
      const fallback = 'Fallback Title';
      const result = parseApiResponse(topicTitleSchema, invalidData, fallback);
      expect(result).toBe(fallback);
    });

    it('throws descriptive error when validation fails and no fallback is given', () => {
      expect(() => parseApiResponse(topicTitleSchema, '')).toThrow(
        'API Boundary Validation Error: Tên chủ đề phải có ít nhất 2 ký tự.'
      );
    });
  });
});

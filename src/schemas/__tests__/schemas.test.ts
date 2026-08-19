import { describe, it, expect } from "vitest";
import {
  studentNameSchema,
  studentPasswordSchema,
  yearBornSchema,
  studentGradeSchema,
  createStudentSchema,
  topicTitleSchema,
  createTopicSchema,
  questionSchema,
  shadowingVideoSchema,
  storySchema,
  vocabSetSchema,
  vocabCardSchema,
  vocabAudioBuilderSchema,
  attendanceStudentSchema,
  imageFileSchema,
  validateWithSchema,
} from "../index";

describe("Zod Schemas Validation", () => {
  describe("studentNameSchema", () => {
    it("validates valid name and auto-sanitizes", () => {
      const res = studentNameSchema.safeParse("  Le Van A  ");
      expect(res.success).toBe(true);
      if (res.success) expect(res.data).toBe("Le Van A");
    });

    it("rejects short or empty names", () => {
      expect(studentNameSchema.safeParse("").success).toBe(false);
      expect(studentNameSchema.safeParse("A").success).toBe(false);
    });

    it("rejects names longer than 50 characters", () => {
      expect(studentNameSchema.safeParse("A".repeat(51)).success).toBe(false);
    });
  });

  describe("createStudentSchema", () => {
    it("validates complete student payload", () => {
      const currentYear = new Date().getFullYear();
      const payload = {
        name: "Tran Thi B",
        password: "password123",
        year_born: currentYear - 10,
        grade: 5,
      };
      const res = createStudentSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });
  });

  describe("topicTitleSchema & createTopicSchema", () => {
    it("validates valid topic payload", () => {
      const payload = {
        title: "Family and Friends",
        type: "standard" as const,
        grades: [1, 2, 3],
      };
      const res = createTopicSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it("rejects invalid grades", () => {
      const payload = {
        title: "Test Topic",
        grades: [0, 15],
      };
      const res = createTopicSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });
  });

  describe("questionSchema", () => {
    it("validates question details", () => {
      const payload = {
        text: "What is your name?",
        translation: "Tên bạn là gì?",
        sample_answer: "My name is John.",
      };
      const res = questionSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });
  });

  describe("shadowingVideoSchema", () => {
    it("validates shadowing video with valid YouTube ID and timestamps", () => {
      const payload = {
        title: "Practice Lesson 1",
        youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        preview_start: 5,
        preview_end: 15,
        record_start: 10,
        record_end: 25,
      };
      const res = shadowingVideoSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it("rejects invalid preview range", () => {
      const payload = {
        title: "Practice Lesson 1",
        youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        preview_start: 20,
        preview_end: 10,
      };
      const res = shadowingVideoSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });
  });

  describe("storySchema", () => {
    it("validates story data", () => {
      const payload = {
        title: "The Friendly Dragon",
        content: "Once upon a time, there was a friendly dragon living in the green mountains.",
        emoji: "🐉",
      };
      const res = storySchema.safeParse(payload);
      expect(res.success).toBe(true);
    });
  });

  describe("vocabSetSchema & vocabCardSchema", () => {
    it("validates vocab set", () => {
      const res = vocabSetSchema.safeParse({ title: "Animal Kingdom", emoji: "🦁" });
      expect(res.success).toBe(true);
    });

    it("validates vocab card", () => {
      const res = vocabCardSchema.safeParse({
        front: "Lion",
        back: "Sư tử",
        ipa: "/ˈlaɪ.ən/",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("attendanceStudentSchema", () => {
    it("validates attendance student with fee and phone", () => {
      const payload = {
        name: "Hoang Van C",
        class_name: "Lớp 3A",
        unit_price: 150000,
        phone: "0912345678",
      };
      const res = attendanceStudentSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it("rejects negative fee", () => {
      const res = attendanceStudentSchema.safeParse({
        name: "Hoang Van C",
        unit_price: -50000,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("studentPasswordSchema, yearBornSchema, studentGradeSchema", () => {
    it("validates student password", () => {
      expect(studentPasswordSchema.safeParse("12345").success).toBe(true);
      expect(studentPasswordSchema.safeParse("12").success).toBe(false);
    });

    it("validates yearBorn and grade", () => {
      const currentYear = new Date().getFullYear();
      expect(yearBornSchema.safeParse(currentYear - 10).success).toBe(true);
      expect(studentGradeSchema.safeParse(5).success).toBe(true);
      expect(studentGradeSchema.safeParse(15).success).toBe(false);
    });
  });

  describe("vocabAudioBuilderSchema", () => {
    it("validates audio builder payload", () => {
      const res = vocabAudioBuilderSchema.safeParse({
        title: "Daily Vocabulary Lesson",
        word_list: ["hello", "world"],
      });
      expect(res.success).toBe(true);
    });
  });

  describe("imageFileSchema", () => {
    it("validates valid image blob", () => {
      const blob = new Blob(["fake-image-content"], { type: "image/png" });
      expect(imageFileSchema.safeParse(blob).success).toBe(true);
    });
  });

  describe("validateWithSchema helper", () => {
    it("returns formatted error message on failure", () => {
      const res = validateWithSchema(topicTitleSchema, "A");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("Tên chủ đề phải có ít nhất 2 ký tự.");
      }
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studentService } from '../studentService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('studentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStudents', () => {
    it('fetches student profiles ordered by name', async () => {
      const mockStudents = [
        { id: '1', name: 'Alice', role: 'student' },
        { id: '2', name: 'Bob', role: 'student' },
      ];

      const orderMock = vi.fn().mockResolvedValue({ data: mockStudents, error: null });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await studentService.fetchStudents();

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(eqMock).toHaveBeenCalledWith('role', 'student');
      expect(orderMock).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockStudents);
    });

    it('throws error when query fails', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(studentService.fetchStudents()).rejects.toThrow('DB Error');
    });
  });

  describe('checkStudentNameExists', () => {
    it('returns true when a profile with the name exists', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: 'st-1' }, error: null });
      const ilikeMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const exists = await studentService.checkStudentNameExists('Alice');
      expect(exists).toBe(true);
      expect(ilikeMock).toHaveBeenCalledWith('name', 'Alice');
    });

    it('returns false when no profile matches', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const ilikeMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const exists = await studentService.checkStudentNameExists('Nonexistent');
      expect(exists).toBe(false);
    });

    it('throws error when check query fails', async () => {
      const maybeSingleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Check error') });
      const ilikeMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(studentService.checkStudentNameExists('Alice')).rejects.toThrow('Check error');
    });
  });

  describe('createStudent', () => {
    it('creates student profile and returns created data', async () => {
      const created = { id: 'st-1', name: 'Alice', year_born: 2016, grade: 3 };

      const singleMock = vi.fn().mockResolvedValue({ data: created, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const res = await studentService.createStudent({
        name: 'Alice',
        password: '123',
        year_born: 2016,
        grade: 3,
      });

      expect(res).toEqual(created);
    });

    it('handles fallback when grade column fails in database', async () => {
      let callCount = 0;
      const insertMock = vi.fn().mockImplementation((payload: any) => ({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: null,
                error: { message: 'column "grade" does not exist' },
              });
            }
            return Promise.resolve({ data: { id: 'st-1', name: payload.name }, error: null });
          }),
        }),
      }));
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const res = await studentService.createStudent({
        name: 'Alice',
        password: '123',
        year_born: 2016,
        grade: 3,
      });

      expect(callCount).toBe(2);
      expect(res.name).toBe('Alice');
    });

    it('throws error when insert completely fails', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Insert error') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(studentService.createStudent({ name: 'Alice' })).rejects.toThrow('Insert error');
    });
  });

  describe('updateStudent', () => {
    it('updates student profile and returns updated record', async () => {
      const updated = { id: 'st-1', year_born: 2017, grade: 4 };

      const singleMock = vi.fn().mockResolvedValue({ data: updated, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      const res = await studentService.updateStudent('st-1', {
        year_born: 2017,
        grade: 4,
      });

      expect(res).toEqual(updated);
    });

    it('handles fallback when grade column fails during update', async () => {
      let callCount = 0;
      const updateMock = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'column "grade" does not exist' },
                });
              }
              return Promise.resolve({ data: { id: 'st-1', year_born: 2018 }, error: null });
            }),
          }),
        }),
      }));
      (supabase.from as any).mockReturnValue({ update: updateMock });

      const res = await studentService.updateStudent('st-1', {
        year_born: 2018,
        grade: 5,
      });

      expect(callCount).toBe(2);
      expect(res.year_born).toBe(2018);
    });

    it('throws error when update fails', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Update error') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await expect(studentService.updateStudent('st-1', { name: 'Alice' })).rejects.toThrow(
        'Update error'
      );
    });
  });

  describe('resetStudentPassword', () => {
    it('updates the student password', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await studentService.resetStudentPassword('st-1', 'new-pass-123');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-pass-123' })
      );
      expect(eqMock).toHaveBeenCalledWith('id', 'st-1');
    });

    it('throws error when password reset fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Reset failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await expect(studentService.resetStudentPassword('st-1', 'new-pass-123')).rejects.toThrow(
        'Reset failed'
      );
    });
  });

  describe('deleteStudent', () => {
    it('deletes student by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await studentService.deleteStudent('st-1');
      expect(eqMock).toHaveBeenCalledWith('id', 'st-1');
    });

    it('throws error when delete fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete error') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await expect(studentService.deleteStudent('st-1')).rejects.toThrow('Delete error');
    });
  });

  describe('fetchStudentRecordings', () => {
    it('fetches recordings with pagination and joins shadowing video url', async () => {
      const mockRecordings = [
        {
          id: 'r1',
          student_name: 'Alice',
          shadowing_videos: { youtube_url: 'https://youtube.com/watch?v=123' },
        },
      ];

      const queryObj = {
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockRecordings, error: null, count: 1 }),
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(queryObj),
      });

      const res = await studentService.fetchStudentRecordings('Alice', 1, 10);
      expect(res.records[0].youtube_url).toBe('https://youtube.com/watch?v=123');
      expect(res.total).toBe(1);
    });

    it('applies topic-only filter when filterType is topic', async () => {
      const isMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      const queryObj = {
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        is: isMock,
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(queryObj),
      });

      await studentService.fetchStudentRecordings('Alice', 1, 10, 'topic');
      expect(isMock).toHaveBeenCalledWith('shadowing_video_id', null);
    });

    it('applies shadowing-only filter when filterType is shadowing', async () => {
      const notMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      const queryObj = {
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        not: notMock,
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(queryObj),
      });

      await studentService.fetchStudentRecordings('Alice', 1, 10, 'shadowing');
      expect(notMock).toHaveBeenCalledWith('shadowing_video_id', 'is', null);
    });

    it('throws error when recordings query fails', async () => {
      const queryObj = {
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Recordings error'), count: 0 }),
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(queryObj),
      });

      await expect(studentService.fetchStudentRecordings('Alice')).rejects.toThrow(
        'Recordings error'
      );
    });
  });
});

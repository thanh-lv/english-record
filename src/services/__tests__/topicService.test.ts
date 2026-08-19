import { describe, it, expect, vi, beforeEach } from 'vitest';
import { topicService } from '../topicService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('topicService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAllTopics', () => {
    it('fetches topics and sorts their questions by order_index', async () => {
      const mockData = [
        {
          id: 'topic-1',
          title: 'Topic 1',
          order_index: 1,
          questions: [
            { id: 'q2', text: 'Q2', order_index: 2 },
            { id: 'q1', text: 'Q1', order_index: 1 },
          ],
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const topics = await topicService.fetchAllTopics();

      expect(supabase.from).toHaveBeenCalledWith('topics');
      expect(topics).toHaveLength(1);
      expect(topics[0].questions[0].id).toBe('q1');
      expect(topics[0].questions[1].id).toBe('q2');
    });

    it('throws error when supabase returns an error', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(topicService.fetchAllTopics()).rejects.toThrow('DB Error');
    });
  });

  describe('toggleTopicActive', () => {
    it('updates is_active to negated current value', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await topicService.toggleTopicActive('topic-1', true);

      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
      expect(eqMock).toHaveBeenCalledWith('id', 'topic-1');
    });
  });

  describe('updateTopic', () => {
    it('updates title and grades for topic', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await topicService.updateTopic('topic-1', { title: 'New Title', grades: [1, 2] });

      expect(updateMock).toHaveBeenCalledWith({ title: 'New Title', grades: [1, 2] });
      expect(eqMock).toHaveBeenCalledWith('id', 'topic-1');
    });

    it('handles fallback when grades column fails in database', async () => {
      let callCount = 0;
      const updateMock = vi.fn().mockImplementation((_payload: any) => ({
        eq: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ error: { message: 'column "grades" does not exist' } });
          }
          return Promise.resolve({ error: null });
        }),
      }));
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await topicService.updateTopic('topic-1', { title: 'New Title', grades: [1, 2] });
      expect(callCount).toBe(2);
    });

    it('updateTopicTitle calls updateTopic with title only', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await topicService.updateTopicTitle('topic-1', 'Updated Title');
      expect(updateMock).toHaveBeenCalledWith({ title: 'Updated Title' });
    });
  });

  describe('createTopic and deleteTopic', () => {
    it('creates topic with payload', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await topicService.createTopic('Topic A', 'standard', 1, [3, 4]);

      expect(insertMock).toHaveBeenCalledWith({
        title: 'Topic A',
        type: 'standard',
        order_index: 1,
        is_active: true,
        grades: [3, 4],
      });
    });

    it('creates topic with fallback when grades column does not exist', async () => {
      let callCount = 0;
      const insertMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ error: { message: 'column "grades" not found' } });
        }
        return Promise.resolve({ error: null });
      });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await topicService.createTopic('Topic A', 'bongbe', 2, [5]);
      expect(callCount).toBe(2);
    });

    it('deletes topic by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await topicService.deleteTopic('topic-delete-id');
      expect(eqMock).toHaveBeenCalledWith('id', 'topic-delete-id');
    });
  });

  describe('questions management', () => {
    it('creates question', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await topicService.createQuestion({ topic_id: 't1', text: 'Hello?' });
      expect(insertMock).toHaveBeenCalledWith({ topic_id: 't1', text: 'Hello?' });
    });

    it('updates question', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await topicService.updateQuestion('q1', { text: 'New Question' });
      expect(updateMock).toHaveBeenCalledWith({ text: 'New Question' });
      expect(eqMock).toHaveBeenCalledWith('id', 'q1');
    });

    it('deletes question', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await topicService.deleteQuestion('q1');
      expect(eqMock).toHaveBeenCalledWith('id', 'q1');
    });

    it('inserts parsed questions with auto-incremented order', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const parsed = [
        { text: 'Q1', sample_answer: 'A1' },
        { text: 'Q2' },
      ];

      await topicService.insertParsedQuestions('t1', parsed, 5);

      expect(insertMock).toHaveBeenCalledWith([
        { topic_id: 't1', text: 'Q1', sample_answer: 'A1', order_index: 5 },
        { topic_id: 't1', text: 'Q2', sample_answer: null, order_index: 6 },
      ]);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storyService } from '../storyService';
import { supabase } from '../../lib/supabase';
import { clientCache } from '../../lib/cache';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('storyService', () => {
  beforeEach(() => {
    clientCache.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('fetchAllStories', () => {
    it('fetches all stories ordered by created_at descending', async () => {
      const mockStories = [
        { id: 's1', title: 'Story 1', created_at: '2026-08-19T10:00:00Z', is_active: true },
        { id: 's2', title: 'Story 2', created_at: '2026-08-18T10:00:00Z', is_active: false },
      ];
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await storyService.fetchAllStories();
      expect(supabase.from).toHaveBeenCalledWith('stories');
      expect(selectMock).toHaveBeenCalledWith(
        'id, title, type, emoji, image_url, content, grades, created_at, is_active'
      );
      expect(res).toEqual(mockStories);
    });

    it('returns empty array when database data is null or undefined', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await storyService.fetchAllStories();
      expect(res).toEqual([]);
    });

    it('throws error when supabase query fails', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Database connection failed') }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(storyService.fetchAllStories()).rejects.toThrow('Database connection failed');
    });
  });

  describe('toggleStoryActive', () => {
    it('toggles is_active from false to true', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await storyService.toggleStoryActive('s1', false);
      expect(supabase.from).toHaveBeenCalledWith('stories');
      expect(updateMock).toHaveBeenCalledWith({ is_active: true });
      expect(eqMock).toHaveBeenCalledWith('id', 's1');
    });

    it('toggles is_active from true to false', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await storyService.toggleStoryActive('s1', true);
      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
      expect(eqMock).toHaveBeenCalledWith('id', 's1');
    });

    it('throws error if toggle update fails in database', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Update active failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await expect(storyService.toggleStoryActive('s1', true)).rejects.toThrow(
        'Update active failed'
      );
    });
  });

  describe('updateStory', () => {
    it('updates partial story fields in database', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await storyService.updateStory('s1', {
        title: 'New Story Title',
        content: 'Updated content of story...',
        emoji: '📖',
        grades: [1, 2, 3],
      });

      expect(supabase.from).toHaveBeenCalledWith('stories');
      expect(updateMock).toHaveBeenCalledWith({
        title: 'New Story Title',
        content: 'Updated content of story...',
        emoji: '📖',
        grades: [1, 2, 3],
      });
      expect(eqMock).toHaveBeenCalledWith('id', 's1');
    });

    it('throws error when update query fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Update failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await expect(storyService.updateStory('s1', { title: 'Test' })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('createStory', () => {
    it('creates a new story and returns single created object', async () => {
      const newStoryInput = {
        title: 'The Brave Lion',
        content: 'A brave lion protected the animals in the jungle.',
        emoji: '🦁',
        grades: [2, 3],
        type: 'standard',
        image_url: 'https://example.com/lion.png',
      };
      const createdStoryRecord = {
        id: 'story-new-id',
        ...newStoryInput,
        created_at: '2026-08-19T10:00:00Z',
      };

      const singleMock = vi.fn().mockResolvedValue({ data: createdStoryRecord, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const result = await storyService.createStory(newStoryInput);

      expect(supabase.from).toHaveBeenCalledWith('stories');
      expect(insertMock).toHaveBeenCalledWith(newStoryInput);
      expect(result).toEqual(createdStoryRecord);
    });

    it('throws error when story creation fails', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Insert story failed') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(storyService.createStory({ title: 'Fail' })).rejects.toThrow(
        'Insert story failed'
      );
    });
  });

  describe('deleteStory', () => {
    it('deletes story by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await storyService.deleteStory('story-to-delete');
      expect(supabase.from).toHaveBeenCalledWith('stories');
      expect(eqMock).toHaveBeenCalledWith('id', 'story-to-delete');
    });

    it('throws error when delete fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete story failed') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await expect(storyService.deleteStory('story-to-delete')).rejects.toThrow(
        'Delete story failed'
      );
    });
  });

  describe('generateAiText', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_AI_API_KEY', 'valid-ai-key-123');
    });

    it('generates story text tailored for single grade [3]', async () => {
      let requestBody: any = null;
      let requestHeaders: any = null;

      global.fetch = vi.fn().mockImplementation((_url: string, options: any) => {
        requestHeaders = options.headers;
        requestBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ story: 'Once upon a time in Grade 3...' }),
        });
      });

      const story = await storyService.generateAiText('A magic forest', [3]);

      expect(story).toBe('Once upon a time in Grade 3...');
      expect(requestHeaders['Authorization']).toBe('Bearer valid-ai-key-123');
      expect(requestHeaders['Content-Type']).toBe('application/json');
      expect(requestBody.type).toBe('text');
      expect(requestBody.prompt).toContain('Grade 3 students');
      expect(requestBody.prompt).toContain('A magic forest');
      expect(requestBody.prompt).toContain('Keep it under 150 words');
    });

    it('generates story text tailored for multiple grades [1, 2, 5]', async () => {
      let requestBody: any = null;

      global.fetch = vi.fn().mockImplementation((_url: string, options: any) => {
        requestBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ story: 'A puppy and a kitten...' }),
        });
      });

      const story = await storyService.generateAiText('Friendship', [1, 2, 5]);

      expect(story).toBe('A puppy and a kitten...');
      expect(requestBody.prompt).toContain('Grade 1, 2, 5 students');
    });

    it('uses fallback target age description when grades array is empty', async () => {
      let requestBody: any = null;

      global.fetch = vi.fn().mockImplementation((_url: string, options: any) => {
        requestBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ story: 'Children story...' }),
        });
      });

      const story = await storyService.generateAiText('Space exploration');

      expect(story).toBe('Children story...');
      expect(requestBody.prompt).toContain('children aged 5 to 10');
    });

    it('throws error when VITE_AI_API_KEY environment variable is empty or missing', async () => {
      vi.stubEnv('VITE_AI_API_KEY', '');
      await expect(storyService.generateAiText('Test')).rejects.toThrow('Thiếu AI API Key');
    });

    it('throws error when AI Worker returns non-200 status code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(storyService.generateAiText('Test')).rejects.toThrow(
        'Lỗi tạo nội dung câu chuyện AI'
      );
    });

    it('re-throws when network request fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));
      await expect(storyService.generateAiText('Test')).rejects.toThrow('Network disconnected');
    });
  });

  describe('generateAiImage', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_AI_API_KEY', 'valid-ai-key-123');
    });

    it('sends prompt to worker and returns image Blob on success', async () => {
      const mockImageBlob = new Blob(['image-raw-data'], { type: 'image/png' });
      let requestBody: any = null;
      let requestHeaders: any = null;

      global.fetch = vi.fn().mockImplementation((_url: string, options: any) => {
        requestHeaders = options.headers;
        requestBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          blob: async () => mockImageBlob,
        });
      });

      const resultBlob = await storyService.generateAiImage('A cute dragon sleeping on a cloud');

      expect(resultBlob).toBe(mockImageBlob);
      expect(requestHeaders['Authorization']).toBe('Bearer valid-ai-key-123');
      expect(requestHeaders['Content-Type']).toBe('application/json');
      expect(requestBody).toEqual({
        prompt: 'A cute dragon sleeping on a cloud',
        type: 'image',
      });
    });

    it('throws error when VITE_AI_API_KEY is missing', async () => {
      vi.stubEnv('VITE_AI_API_KEY', '');
      await expect(storyService.generateAiImage('A dragon')).rejects.toThrow('Thiếu AI API Key');
    });

    it('throws error when AI Worker returns error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      await expect(storyService.generateAiImage('A dragon')).rejects.toThrow('Lỗi tạo hình ảnh AI');
    });

    it('re-throws when fetch network error occurs', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Fetch timeout'));
      await expect(storyService.generateAiImage('A dragon')).rejects.toThrow('Fetch timeout');
    });
  });
});

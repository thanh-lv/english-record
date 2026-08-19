import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storyService } from '../storyService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('storyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAllStories', () => {
    it('fetches all stories ordered by created_at descending', async () => {
      const mockStories = [{ id: 's1', title: 'Story 1' }];
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await storyService.fetchAllStories();
      expect(supabase.from).toHaveBeenCalledWith('stories');
      expect(res).toEqual(mockStories);
    });

    it('throws error if supabase fails', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed to fetch') }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(storyService.fetchAllStories()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('toggleStoryActive', () => {
    it('updates is_active', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await storyService.toggleStoryActive('s1', false);
      expect(updateMock).toHaveBeenCalledWith({ is_active: true });
      expect(eqMock).toHaveBeenCalledWith('id', 's1');
    });
  });

  describe('updateStory, createStory, deleteStory', () => {
    it('updates story', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await storyService.updateStory('s1', { title: 'Updated' });
      expect(updateMock).toHaveBeenCalledWith({ title: 'Updated' });
      expect(eqMock).toHaveBeenCalledWith('id', 's1');
    });

    it('creates story and returns created object', async () => {
      const newStory = { id: 's2', title: 'New Story' };
      const singleMock = vi.fn().mockResolvedValue({ data: newStory, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const result = await storyService.createStory({ title: 'New Story' });
      expect(insertMock).toHaveBeenCalledWith({ title: 'New Story' });
      expect(result).toEqual(newStory);
    });

    it('deletes story', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await storyService.deleteStory('s1');
      expect(eqMock).toHaveBeenCalledWith('id', 's1');
    });
  });

  describe('generateAiText and generateAiImage', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_AI_API_KEY', 'test-ai-key');
    });

    it('generates AI story text with specific grades', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ story: 'Once upon a time in a magic forest...' }),
      });

      const storyText = await storyService.generateAiText('A magic forest', [1, 2]);
      expect(storyText).toBe('Once upon a time in a magic forest...');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('generates AI story text with default grade description when grades empty', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ story: 'A lovely dog played ball.' }),
      });

      const storyText = await storyService.generateAiText('A lovely dog');
      expect(storyText).toBe('A lovely dog played ball.');
    });

    it('throws error when VITE_AI_API_KEY is missing in generateAiText', async () => {
      vi.stubEnv('VITE_AI_API_KEY', '');
      await expect(storyService.generateAiText('A kitten')).rejects.toThrow('Thiếu AI API Key');
    });

    it('throws error when AI fetch fails in generateAiText', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      await expect(storyService.generateAiText('A kitten')).rejects.toThrow('Lỗi tạo nội dung');
    });

    it('generates AI image blob successfully', async () => {
      const mockBlob = new Blob(['image-bytes'], { type: 'image/png' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const blob = await storyService.generateAiImage('A cute panda');
      expect(blob).toBe(mockBlob);
    });

    it('throws error when VITE_AI_API_KEY is missing in generateAiImage', async () => {
      vi.stubEnv('VITE_AI_API_KEY', '');
      await expect(storyService.generateAiImage('A puppy')).rejects.toThrow('Thiếu AI API Key');
    });

    it('throws error when AI image fetch returns !ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      await expect(storyService.generateAiImage('A puppy')).rejects.toThrow('Lỗi tạo hình ảnh');
    });
  });
});

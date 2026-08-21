import { supabase } from '../lib/supabase';
import { clientCache } from '../lib/cache';
import { withServiceHandling } from './serviceHandler';
import { Story } from '../types';
import { parseApiResponse, storiesResponseArraySchema, storyResponseSchema } from '../schemas';

const WORKER_URL = 'https://free-image-generation-api.levanthanh29111999.workers.dev/';

export const storyService = {
  async fetchAllStories(teacherId?: string): Promise<Story[]> {
    return withServiceHandling('storyService', 'fetchAllStories', async () => {
      const cacheKey = teacherId ? `stories:all:${teacherId}` : 'stories:all';
      return clientCache.fetchWithCache(
        cacheKey,
        async () => {
          let query = supabase
            .from('stories')
            .select('id, title, type, emoji, image_url, content, grades, created_at, is_active')
            .order('created_at', { ascending: false });

          if (teacherId) {
            query = query.eq('teacher_id', teacherId);
          }

          const { data, error } = await query;
          if (error) throw error;
          return parseApiResponse(
            storiesResponseArraySchema,
            data || [],
            (data || []) as Story[]
          ) as Story[];
        },
        { ttlMs: 60 * 1000, persist: true }
      );
    });
  },

  async toggleStoryActive(storyId: string, currentValue: boolean): Promise<void> {
    return withServiceHandling('storyService', 'toggleStoryActive', async () => {
      const { error } = await supabase
        .from('stories')
        .update({ is_active: !currentValue })
        .eq('id', storyId);
      if (error) throw error;
      clientCache.invalidate('stories');
    });
  },

  async updateStory(storyId: string, updates: Partial<Story>): Promise<void> {
    return withServiceHandling('storyService', 'updateStory', async () => {
      const { error } = await supabase.from('stories').update(updates).eq('id', storyId);
      if (error) throw error;
      clientCache.invalidate('stories');
    });
  },

  async createStory(storyData: Partial<Story>): Promise<Story> {
    return withServiceHandling('storyService', 'createStory', async () => {
      const { data, error } = await supabase.from('stories').insert(storyData).select().single();
      if (error) throw error;
      clientCache.invalidate('stories');
      return parseApiResponse(storyResponseSchema, data) as Story;
    });
  },

  async deleteStory(storyId: string): Promise<void> {
    return withServiceHandling('storyService', 'deleteStory', async () => {
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
      clientCache.invalidate('stories');
    });
  },

  async generateAiText(prompt: string, grades: number[] = []): Promise<string> {
    return withServiceHandling('storyService', 'generateAiText', async () => {
      const aiApiKey = import.meta.env.VITE_AI_API_KEY;
      if (!aiApiKey) throw new Error('Thiếu AI API Key');

      const gradeDesc =
        grades.length > 0 ? `Grade ${grades.join(', ')} students` : 'children aged 5 to 10';
      const textPrompt = `You are a friendly storyteller for children. Write a short, simple, and engaging English story based on the prompt: ${prompt}. Keep it under 150 words. The story is for ${gradeDesc}, so use appropriate simple vocabulary and short sentences. Return only the story text.`;

      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({ prompt: textPrompt, type: 'text' }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            'Lỗi xác thực: VITE_AI_API_KEY không hợp lệ hoặc đã hết hạn (401 Unauthorized)'
          );
        }
        let errDetail = '';
        try {
          const errJson = await res.json();
          errDetail = errJson.error || errJson.message || '';
        } catch {}
        throw new Error(
          errDetail
            ? `Lỗi tạo nội dung câu chuyện AI: ${errDetail}`
            : 'Lỗi tạo nội dung câu chuyện AI'
        );
      }
      const data = await res.json();
      return data.story;
    });
  },

  async generateAiImage(prompt: string): Promise<Blob> {
    return withServiceHandling('storyService', 'generateAiImage', async () => {
      const aiApiKey = import.meta.env.VITE_AI_API_KEY;
      if (!aiApiKey) throw new Error('Thiếu AI API Key');

      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({ prompt, type: 'image' }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            'Lỗi xác thực: VITE_AI_API_KEY không hợp lệ hoặc đã hết hạn (401 Unauthorized)'
          );
        }
        throw new Error('Lỗi tạo hình ảnh AI');
      }
      return await res.blob();
    });
  },
};

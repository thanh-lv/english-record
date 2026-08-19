import { supabase } from '../lib/supabase';
import { clientCache } from '../lib/cache';
import { Story } from '../types';

const WORKER_URL = 'https://free-image-generation-api.levanthanh29111999.workers.dev/';

export const storyService = {
  async fetchAllStories(): Promise<Story[]> {
    return clientCache.fetchWithCache(
      'stories:all',
      async () => {
        const { data, error } = await supabase
          .from('stories')
          .select('id, title, type, emoji, image_url, content, grades, created_at, is_active')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as Story[];
      },
      { ttlMs: 60 * 1000, persist: true }
    );
  },

  async toggleStoryActive(storyId: string, currentValue: boolean): Promise<void> {
    const { error } = await supabase
      .from('stories')
      .update({ is_active: !currentValue })
      .eq('id', storyId);
    if (error) throw error;
    clientCache.invalidate('stories');
  },

  async updateStory(storyId: string, updates: Partial<Story>): Promise<void> {
    const { error } = await supabase.from('stories').update(updates).eq('id', storyId);
    if (error) throw error;
    clientCache.invalidate('stories');
  },

  async createStory(storyData: Partial<Story>): Promise<Story> {
    const { data, error } = await supabase.from('stories').insert(storyData).select().single();
    if (error) throw error;
    clientCache.invalidate('stories');
    return data as Story;
  },

  async deleteStory(storyId: string): Promise<void> {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (error) throw error;
    clientCache.invalidate('stories');
  },

  async generateAiText(prompt: string, grades: number[] = []): Promise<string> {
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

    if (!res.ok) throw new Error('Lỗi tạo nội dung câu chuyện AI');
    const data = await res.json();
    return data.story;
  },

  async generateAiImage(prompt: string): Promise<Blob> {
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

    if (!res.ok) throw new Error('Lỗi tạo hình ảnh AI');
    return await res.blob();
  },
};

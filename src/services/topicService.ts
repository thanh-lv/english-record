import { supabase } from '../lib/supabase';
import { clientCache } from '../lib/cache';
import { Topic, Question } from '../types';

export const topicService = {
  async fetchAllTopics(): Promise<Topic[]> {
    return clientCache.fetchWithCache(
      'topics:all',
      async () => {
        const { data, error } = await supabase
          .from('topics')
          .select('*, questions(*)')
          .order('order_index');

        if (error) throw error;

        return (data || []).map((t: any) => ({
          ...t,
          questions: (t.questions || []).sort(
            (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
          ),
        }));
      },
      { ttlMs: 60 * 1000, persist: true }
    );
  },

  async toggleTopicActive(topicId: string, currentValue: boolean): Promise<void> {
    const { error } = await supabase
      .from('topics')
      .update({ is_active: !currentValue })
      .eq('id', topicId);
    if (error) throw error;
    clientCache.invalidate('topics');
  },

  async updateTopic(
    topicId: string,
    updates: { title?: string; grades?: number[] }
  ): Promise<void> {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.grades !== undefined) payload.grades = updates.grades;

    let { error } = await supabase.from('topics').update(payload).eq('id', topicId);

    if (error && error.message?.includes('grades')) {
      delete payload.grades;
      if (Object.keys(payload).length > 0) {
        const fallback = await supabase.from('topics').update(payload).eq('id', topicId);
        error = fallback.error;
      }
    }

    if (error) throw error;
    clientCache.invalidate('topics');
  },

  async updateTopicTitle(topicId: string, title: string): Promise<void> {
    return this.updateTopic(topicId, { title });
  },

  async createTopic(
    title: string,
    type: 'standard' | 'bongbe',
    orderIndex: number,
    grades?: number[]
  ): Promise<void> {
    const payload: any = {
      title,
      type,
      order_index: orderIndex,
      is_active: true,
      grades: grades || [],
    };

    let { error } = await supabase.from('topics').insert(payload);

    if (error && error.message?.includes('grades')) {
      delete payload.grades;
      const fallback = await supabase.from('topics').insert(payload);
      error = fallback.error;
    }

    if (error) throw error;
    clientCache.invalidate('topics');
  },

  async deleteTopic(topicId: string): Promise<void> {
    const { error } = await supabase.from('topics').delete().eq('id', topicId);
    if (error) throw error;
    clientCache.invalidate('topics');
  },

  async createQuestion(questionData: Partial<Question>): Promise<void> {
    const { error } = await supabase.from('questions').insert(questionData);
    if (error) throw error;
    clientCache.invalidate('topics');
  },

  async updateQuestion(questionId: string, questionData: Partial<Question>): Promise<void> {
    const { error } = await supabase.from('questions').update(questionData).eq('id', questionId);
    if (error) throw error;
    clientCache.invalidate('topics');
  },

  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) throw error;
    clientCache.invalidate('topics');
  },

  async insertParsedQuestions(
    topicId: string,
    questions: { text: string; sample_answer?: string }[],
    startingOrder: number
  ): Promise<void> {
    let order = startingOrder;
    const rows = questions.map(q => ({
      topic_id: topicId,
      text: q.text,
      sample_answer: q.sample_answer || null,
      order_index: order++,
    }));
    const { error } = await supabase.from('questions').insert(rows);
    if (error) throw error;
    clientCache.invalidate('topics');
  },
};

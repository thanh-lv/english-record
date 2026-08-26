import { supabase } from '../lib/supabase';
import { clientCache } from '../lib/cache';
import { withServiceHandling } from './serviceHandler';
import { Topic, Question } from '../types';
import { parseApiResponse, topicsResponseArraySchema } from '../schemas';

export const topicService = {
  async fetchAllTopics(teacherId?: string): Promise<Topic[]> {
    return withServiceHandling('topicService', 'fetchAllTopics', async () => {
      const cacheKey = teacherId ? `topics:all:${teacherId}` : 'topics:all';
      return clientCache.fetchWithCache(
        cacheKey,
        async () => {
          let query = supabase.from('topics').select('*, questions(*)').order('order_index');

          if (teacherId) {
            query = query.eq('teacher_id', teacherId);
          }

          const { data, error } = await query;

          if (error) throw error;

          const mapped = (data || []).map((t: any) => ({
            ...t,
            questions: (t.questions || []).sort(
              (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
            ),
          }));

          return parseApiResponse(topicsResponseArraySchema, mapped, mapped) as Topic[];
        },
        { ttlMs: 60 * 1000, persist: true }
      );
    });
  },

  async toggleTopicActive(topicId: string, currentValue: boolean): Promise<void> {
    return withServiceHandling('topicService', 'toggleTopicActive', async () => {
      const { error } = await supabase
        .from('topics')
        .update({ is_active: !currentValue })
        .eq('id', topicId);
      if (error) throw error;
      clientCache.invalidate('topics');
    });
  },

  async updateTopic(
    topicId: string,
    updates: { title?: string; grades?: number[] }
  ): Promise<void> {
    return withServiceHandling('topicService', 'updateTopic', async () => {
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
    });
  },

  async updateTopicTitle(topicId: string, title: string): Promise<void> {
    return this.updateTopic(topicId, { title });
  },

  async createTopic(
    title: string,
    type: 'standard' | 'bongbe',
    orderIndex: number,
    grades?: number[],
    teacherId?: string
  ): Promise<void> {
    return withServiceHandling('topicService', 'createTopic', async () => {
      const payload: any = {
        title,
        type,
        order_index: orderIndex,
        is_active: true,
        grades: grades || [],
      };
      if (teacherId) {
        payload.teacher_id = teacherId;
      }

      let { error } = await supabase.from('topics').insert(payload);

      if (error && error.message?.includes('grades')) {
        delete payload.grades;
        const fallback = await supabase.from('topics').insert(payload);
        error = fallback.error;
      }

      if (error) throw error;
      clientCache.invalidate('topics');
    });
  },

  async deleteTopic(topicId: string): Promise<void> {
    return withServiceHandling('topicService', 'deleteTopic', async () => {
      // 1. Unlink any recordings referencing this topic to prevent foreign key constraint blocks
      try {
        await supabase
          .from('recordings')
          .update({ topic_id: null, question_id: null })
          .eq('topic_id', topicId);
      } catch (err) {
        console.warn('[topicService] Unlink recordings warning (ignored):', err);
      }
      // 2. Delete associated questions first in case DB foreign key does not have CASCADE
      const { error: qErr } = await supabase.from('questions').delete().eq('topic_id', topicId);
      if (qErr) {
        console.warn('[topicService] Delete questions warning:', qErr);
      }
      // 3. Delete the topic row
      const { error } = await supabase.from('topics').delete().eq('id', topicId);
      if (error) throw error;
      clientCache.invalidate('topics');
    });
  },

  async deleteTopics(topicIds: string[]): Promise<void> {
    return withServiceHandling('topicService', 'deleteTopics', async () => {
      if (!topicIds || topicIds.length === 0) return;
      // 1. Unlink any recordings referencing these topics to prevent foreign key constraint blocks
      try {
        await supabase
          .from('recordings')
          .update({ topic_id: null, question_id: null })
          .in('topic_id', topicIds);
      } catch (err) {
        console.warn('[topicService] Unlink recordings warning (ignored):', err);
      }
      // 2. Delete associated questions first in case DB foreign key does not have CASCADE
      const { error: qErr } = await supabase.from('questions').delete().in('topic_id', topicIds);
      if (qErr) {
        console.warn('[topicService] Delete questions warning:', qErr);
      }
      // 3. Delete topic rows
      const { error } = await supabase.from('topics').delete().in('id', topicIds);
      if (error) throw error;
      clientCache.invalidate('topics');
    });
  },

  async createQuestion(questionData: Partial<Question>): Promise<void> {
    return withServiceHandling('topicService', 'createQuestion', async () => {
      const { error } = await supabase.from('questions').insert(questionData);
      if (error) throw error;
      clientCache.invalidate('topics');
    });
  },

  async updateQuestion(questionId: string, questionData: Partial<Question>): Promise<void> {
    return withServiceHandling('topicService', 'updateQuestion', async () => {
      const { error } = await supabase.from('questions').update(questionData).eq('id', questionId);
      if (error) throw error;
      clientCache.invalidate('topics');
    });
  },

  async deleteQuestion(questionId: string): Promise<void> {
    return withServiceHandling('topicService', 'deleteQuestion', async () => {
      try {
        await supabase
          .from('recordings')
          .update({ question_id: null })
          .eq('question_id', questionId);
      } catch (err) {
        console.warn('[topicService] Unlink recordings warning (ignored):', err);
      }
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;
      clientCache.invalidate('topics');
    });
  },

  async insertParsedQuestions(
    topicId: string,
    questions: { text: string; sample_answer?: string }[],
    startingOrder: number
  ): Promise<void> {
    return withServiceHandling('topicService', 'insertParsedQuestions', async () => {
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
    });
  },
};

import { supabase } from '../lib/supabase';
import { withServiceHandling } from './serviceHandler';
import { VocabSet, VocabCard } from '../types';
import {
  parseApiResponse,
  vocabCardsResponseArraySchema,
  vocabSetListItemsResponseArraySchema,
} from '../schemas';

const WORKER_URL = 'https://free-image-generation-api.levanthanh29111999.workers.dev/';

export const vocabularyService = {
  async fetchSets(teacherId?: string): Promise<VocabSet[]> {
    return withServiceHandling('vocabularyService', 'fetchSets', async () => {
      let query = supabase
        .from('vocabulary_sets')
        .select('id, title, emoji, grades, created_at, teacher_id, vocabulary_cards(id)')
        .order('created_at', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((set: any) => ({
        ...set,
        card_count: set.vocabulary_cards?.length ?? 0,
        vocabulary_cards: undefined,
      }));

      return parseApiResponse(
        vocabSetListItemsResponseArraySchema,
        mapped,
        mapped as VocabSet[]
      ) as VocabSet[];
    });
  },

  async fetchCards(setId: string): Promise<VocabCard[]> {
    return withServiceHandling('vocabularyService', 'fetchCards', async () => {
      const { data, error } = await supabase
        .from('vocabulary_cards')
        .select('id, set_id, front, back, ipa, image_url, order_index, created_at')
        .eq('set_id', setId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return parseApiResponse(
        vocabCardsResponseArraySchema,
        data || [],
        (data || []) as VocabCard[]
      ) as VocabCard[];
    });
  },

  async createSet(
    title: string,
    emoji: string,
    grades: number[] = [],
    teacherId?: string
  ): Promise<VocabSet> {
    return withServiceHandling('vocabularyService', 'createSet', async () => {
      const insertPayload: any = {
        title,
        emoji,
        grades,
      };
      if (teacherId) {
        insertPayload.teacher_id = teacherId;
      }

      const { data, error } = await supabase
        .from('vocabulary_sets')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return { ...data, card_count: 0 } as VocabSet;
    });
  },

  async updateSet(
    setId: string,
    updates: { title?: string; emoji?: string; grades?: number[] }
  ): Promise<VocabSet> {
    return withServiceHandling('vocabularyService', 'updateSet', async () => {
      const { data, error } = await supabase
        .from('vocabulary_sets')
        .update(updates)
        .eq('id', setId)
        .select()
        .single();

      if (error) throw error;
      return data as VocabSet;
    });
  },

  async deleteSet(setId: string): Promise<void> {
    return withServiceHandling('vocabularyService', 'deleteSet', async () => {
      await supabase.from('vocabulary_cards').delete().eq('set_id', setId);
      const { error } = await supabase.from('vocabulary_sets').delete().eq('id', setId);
      if (error) throw error;
    });
  },

  async createCard(cardData: Partial<VocabCard>): Promise<VocabCard> {
    return withServiceHandling('vocabularyService', 'createCard', async () => {
      const { data, error } = await supabase
        .from('vocabulary_cards')
        .insert(cardData)
        .select()
        .single();

      if (error) throw error;
      return data as VocabCard;
    });
  },

  async deleteCard(cardId: string): Promise<void> {
    return withServiceHandling('vocabularyService', 'deleteCard', async () => {
      const { error } = await supabase.from('vocabulary_cards').delete().eq('id', cardId);
      if (error) throw error;
    });
  },

  async generateIpa(word: string): Promise<string | null> {
    const apiKey = import.meta.env.VITE_AI_API_KEY;
    if (!apiKey) return null;
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ type: 'ipa', prompt: word }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ipa || null;
    } catch {
      return null;
    }
  },
};

export const vocabService = vocabularyService;

import { supabase } from "../lib/supabase";
import { VocabSet, VocabCard } from "../types";

const WORKER_URL =
  "https://free-image-generation-api.levanthanh29111999.workers.dev/";

export const vocabService = {
  async fetchSets(): Promise<VocabSet[]> {
    const { data, error } = await supabase
      .from("vocabulary_sets")
      .select("id, title, emoji, age_group, created_at, vocabulary_cards(id)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((set: any) => ({
      ...set,
      card_count: set.vocabulary_cards?.length ?? 0,
      vocabulary_cards: undefined,
    }));
  },

  async fetchCards(setId: string): Promise<VocabCard[]> {
    const { data, error } = await supabase
      .from("vocabulary_cards")
      .select(
        "id, set_id, front, back, ipa, image_url, order_index, created_at",
      )
      .eq("set_id", setId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return (data || []) as VocabCard[];
  },

  async createSet(
    title: string,
    emoji: string,
    ageGroup: "kindergarten" | "primary" | "all",
  ): Promise<VocabSet> {
    const { data, error } = await supabase
      .from("vocabulary_sets")
      .insert({
        title,
        emoji,
        age_group: ageGroup,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, card_count: 0 } as VocabSet;
  },

  async deleteSet(setId: string): Promise<void> {
    const { error } = await supabase
      .from("vocabulary_sets")
      .delete()
      .eq("id", setId);
    if (error) throw error;
  },

  async createCard(cardData: Partial<VocabCard>): Promise<VocabCard> {
    const { data, error } = await supabase
      .from("vocabulary_cards")
      .insert(cardData)
      .select()
      .single();

    if (error) throw error;
    return data as VocabCard;
  },

  async deleteCard(cardId: string): Promise<void> {
    const { error } = await supabase
      .from("vocabulary_cards")
      .delete()
      .eq("id", cardId);
    if (error) throw error;
  },

  async generateIpa(word: string): Promise<string | null> {
    const apiKey = import.meta.env.VITE_AI_API_KEY;
    if (!apiKey) return null;
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ type: "ipa", prompt: word }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ipa || null;
    } catch {
      return null;
    }
  },
};

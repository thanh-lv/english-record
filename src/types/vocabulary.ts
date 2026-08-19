export interface VocabSet {
  id: string;
  title: string;
  emoji: string;
  grades?: number[];
  created_at?: string;
  card_count?: number;
}

export interface VocabCard {
  id: string;
  set_id: string;
  front: string;
  back: string;
  ipa?: string | null;
  image_url?: string | null;
  order_index: number;
  created_at?: string;
}

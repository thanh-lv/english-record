export interface VocabSet {
  id: string;
  title: string;
  emoji: string;
  age_group: "kindergarten" | "primary" | "all";
  created_at: string;
  card_count?: number;
}

export interface VocabCard {
  id: string;
  set_id: string;
  front: string;
  back: string;
  ipa: string | null;
  image_url: string | null;
  order_index: number;
  created_at: string;
}

export interface Question {
  id: string;
  topic_id: string;
  text: string;
  translation?: string;
  sample_answer?: string;
  target?: string;
  image_url?: string;
  audio_url?: string;
  sort_order?: number;
  order_index?: number;
  created_at?: string;
}

export interface Topic {
  id: string;
  title: string;
  type: "standard" | "bongbe";
  is_active: boolean;
  order_index?: number;
  created_at?: string;
  grades?: number[];
  questions: Question[];
}

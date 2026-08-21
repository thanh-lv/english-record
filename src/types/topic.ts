export type TopicType = 'standard' | 'bongbe';

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

export interface ParsedQuestion {
  text: string;
  sample_answer?: string;
}

export interface Topic {
  id: string;
  title: string;
  type: TopicType;
  is_active: boolean;
  order_index?: number;
  created_at?: string;
  grades?: number[];
  teacher_id?: string;
  questions: Question[];
}

export interface CreateTopicPayload {
  title: string;
  type: TopicType;
  order_index: number;
  grades?: number[];
  teacher_id?: string;
}

export interface UpdateTopicPayload {
  title?: string;
  grades?: number[];
}

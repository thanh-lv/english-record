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
  created_at?: string;
}

export interface Topic {
  id: string;
  title: string;
  type: "standard" | "bongbe";
  is_active: boolean;
  created_at?: string;
  questions: Question[];
}

export interface Story {
  id: string;
  title: string;
  type: string;
  emoji: string;
  image_url?: string;
  content: string;
  age_group?: string;
  is_active: boolean;
  created_at?: string;
}

export interface VocabularyWord {
  id: string;
  word: string;
  ipa?: string;
  meaning?: string;
  example?: string;
  image_url?: string;
  audio_url?: string;
  topic_id?: string;
  created_at?: string;
}

export interface Student {
  id: string;
  name: string;
  class_name?: string;
  unit_price?: number;
  phone?: string;
  zalo_phone?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  checkin_time: string;
}

export interface AttendancePayment {
  id: string;
  student_id: string;
  month: number;
  year: number;
  is_paid: boolean;
  paid_at?: string;
}

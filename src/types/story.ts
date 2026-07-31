export interface Story {
  id: string;
  title: string;
  type: string;
  emoji: string;
  image_url?: string | null;
  content: string;
  age_group?: string;
  is_active: boolean;
  created_at?: string;
}

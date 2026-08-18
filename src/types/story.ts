export interface Story {
  id: string;
  title: string;
  type: string;
  emoji: string;
  image_url?: string | null;
  content: string;
  grades?: number[];
  is_active: boolean;
  created_at?: string;
}

export type StoryType = 'standard' | 'bongbe' | 'comic' | string;

export interface Story {
  id: string;
  title: string;
  type: StoryType;
  emoji: string;
  image_url?: string | null;
  content: string;
  grades?: number[];
  is_active: boolean;
  created_at?: string;
}

export interface CreateStoryPayload {
  title: string;
  type: StoryType;
  emoji: string;
  image_url?: string | null;
  content: string;
  grades?: number[];
  is_active?: boolean;
}

export interface UpdateStoryPayload {
  title?: string;
  type?: StoryType;
  emoji?: string;
  image_url?: string | null;
  content?: string;
  grades?: number[];
  is_active?: boolean;
}

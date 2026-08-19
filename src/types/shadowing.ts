export interface ShadowingVideo {
  id: string;
  title: string;
  youtube_url: string;
  preview_start?: number | null;
  preview_end?: number | null;
  record_start?: number | null;
  record_end?: number | null;
  grades?: number[];
  is_active?: boolean;
  created_at?: string;
}

export interface ShadowingVideoPayload {
  title: string;
  youtube_url: string;
  preview_start?: number | null;
  preview_end?: number | null;
  record_start?: number | null;
  record_end?: number | null;
  grades?: number[];
  is_active?: boolean;
}

export type ShadowingFilterMode = 'all' | 'myGrade' | string;

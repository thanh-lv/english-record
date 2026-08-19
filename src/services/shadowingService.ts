import { supabase } from '../lib/supabase';

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

export const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const formatSecondsToTime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || isNaN(Number(seconds))) return '';
  const m = Math.floor(Number(seconds) / 60);
  const s = Math.floor(Number(seconds) % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const parseTimeToSeconds = (timeStr: string): number | null => {
  if (!timeStr || !timeStr.trim()) return null;
  if (!timeStr.includes(':')) {
    const val = Number(timeStr);
    return isNaN(val) ? null : val;
  }
  const parts = timeStr.split(':');
  const m = parseInt(parts[0], 10) || 0;
  const s = parseInt(parts[1], 10) || 0;
  return m * 60 + s;
};

export const shadowingService = {
  extractYoutubeId,
  formatSecondsToTime,
  parseTimeToSeconds,

  async fetchShadowingVideos(activeOnly = false): Promise<ShadowingVideo[]> {
    let query = supabase
      .from('shadowing_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ShadowingVideo[];
  },

  async fetchShadowingVideoById(id: string): Promise<ShadowingVideo | null> {
    const { data, error } = await supabase
      .from('shadowing_videos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data || null) as ShadowingVideo | null;
  },

  async createShadowingVideo(payload: ShadowingVideoPayload): Promise<ShadowingVideo> {
    const insertPayload: any = {
      title: payload.title.trim(),
      youtube_url: payload.youtube_url.trim(),
      preview_start: payload.preview_start ?? null,
      preview_end: payload.preview_end ?? null,
      record_start: payload.record_start ?? null,
      record_end: payload.record_end ?? null,
      grades: payload.grades || [],
      is_active: payload.is_active ?? true,
    };

    let { data, error } = await supabase
      .from('shadowing_videos')
      .insert(insertPayload)
      .select()
      .single();

    if (error && error.message?.includes('grades')) {
      delete insertPayload.grades;
      const fallback = await supabase
        .from('shadowing_videos')
        .insert(insertPayload)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return data as ShadowingVideo;
  },

  async updateShadowingVideo(
    id: string,
    payload: Partial<ShadowingVideoPayload>
  ): Promise<ShadowingVideo> {
    const updatePayload: any = { ...payload };

    let { data, error } = await supabase
      .from('shadowing_videos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message?.includes('grades')) {
      delete updatePayload.grades;
      const fallback = await supabase
        .from('shadowing_videos')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return data as ShadowingVideo;
  },

  async toggleShadowingVideoActive(id: string, currentValue: boolean): Promise<void> {
    const { error } = await supabase
      .from('shadowing_videos')
      .update({ is_active: !currentValue })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteShadowingVideo(id: string): Promise<void> {
    const { error } = await supabase.from('shadowing_videos').delete().eq('id', id);
    if (error) throw error;
  },
};

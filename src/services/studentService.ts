import { supabase } from '../lib/supabase';
import { UserProfile } from './authService';

export interface CreateStudentPayload {
  name: string;
  password?: string;
  year_born?: number | null;
  grade?: number | null;
  role?: 'student';
}

export interface UpdateStudentPayload {
  name?: string;
  year_born?: number | null;
  grade?: number | null;
  avatar?: string | null;
  language?: string;
}

export const studentService = {
  async fetchStudents(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, updated_at, role, password, avatar, year_born, grade')
      .eq('role', 'student')
      .order('name');

    if (error) throw error;
    return (data || []) as UserProfile[];
  },

  async checkStudentNameExists(name: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  },

  async createStudent(payload: CreateStudentPayload): Promise<UserProfile> {
    const insertPayload: any = {
      name: payload.name.trim(),
      role: 'student',
      password: payload.password?.trim() || '',
      year_born: payload.year_born || 2015,
      grade: payload.grade ?? null,
    };

    let { data, error } = await supabase.from('profiles').insert(insertPayload).select().single();

    if (error && error.message?.includes('grade')) {
      delete insertPayload.grade;
      const fallback = await supabase.from('profiles').insert(insertPayload).select().single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return data as UserProfile;
  },

  async updateStudent(id: string, payload: UpdateStudentPayload): Promise<UserProfile> {
    const updatePayload: any = { ...payload };

    let { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message?.includes('grade')) {
      delete updatePayload.grade;
      const fallback = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return data as UserProfile;
  },

  async resetStudentPassword(id: string, password: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ password: password.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteStudent(id: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },

  async fetchStudentRecordings(
    studentName: string,
    page = 1,
    pageSize = 10,
    filterType: 'all' | 'topic' | 'shadowing' = 'all'
  ): Promise<{ records: any[]; total: number }> {
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = supabase
      .from('recordings')
      .select('*, shadowing_videos(youtube_url)', { count: 'exact' })
      .ilike('student_name', studentName.trim())
      .order('created_at', { ascending: false })
      .range(fromIndex, toIndex);

    if (filterType === 'topic') {
      query = query.is('shadowing_video_id', null);
    } else if (filterType === 'shadowing') {
      query = query.not('shadowing_video_id', 'is', null);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const mapped = (data || []).map((r: any) => ({
      ...r,
      youtube_url: r.shadowing_videos?.youtube_url || null,
    }));

    return { records: mapped, total: count || 0 };
  },
};

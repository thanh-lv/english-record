import { supabase } from '../lib/supabase';
import { withServiceHandling } from './serviceHandler';
import { UserProfile } from '../types';

export interface AdminTeacherItem extends UserProfile {
  student_count: number;
  recording_count: number;
  topic_count: number;
}

export interface SystemStats {
  totalTeachers: number;
  totalStudents: number;
  totalRecordings: number;
  totalTopics: number;
  totalStories: number;
  totalVocabSets: number;
  totalShadowingVideos: number;
  totalErrors24h: number;
}

export const adminService = {
  async fetchSystemStats(): Promise<SystemStats> {
    return withServiceHandling('adminService', 'fetchSystemStats', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [
        teachersRes,
        studentsRes,
        recordingsRes,
        topicsRes,
        storiesRes,
        vocabRes,
        shadowingRes,
        errorsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('recordings').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('stories').select('*', { count: 'exact', head: true }),
        supabase.from('vocabulary_sets').select('*', { count: 'exact', head: true }),
        supabase.from('shadowing_videos').select('*', { count: 'exact', head: true }),
        supabase
          .from('client_error_logs')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', oneDayAgo),
      ]);

      return {
        totalTeachers: teachersRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalRecordings: recordingsRes.count || 0,
        totalTopics: topicsRes.count || 0,
        totalStories: storiesRes.count || 0,
        totalVocabSets: vocabRes.count || 0,
        totalShadowingVideos: shadowingRes.count || 0,
        totalErrors24h: errorsRes.count || 0,
      };
    });
  },

  async fetchTeachers(): Promise<AdminTeacherItem[]> {
    return withServiceHandling('adminService', 'fetchTeachers', async () => {
      const [teachersRes, studentsRes, recordingsRes, topicsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'teacher').order('name'),
        supabase.from('profiles').select('id, teacher_id').eq('role', 'student'),
        supabase.from('recordings').select('id, teacher_id'),
        supabase.from('topics').select('id, teacher_id'),
      ]);

      if (teachersRes.error) throw teachersRes.error;

      const teachers = teachersRes.data || [];
      const students = studentsRes.data || [];
      const recordings = recordingsRes.data || [];
      const topics = topicsRes.data || [];

      return teachers.map((t: any) => {
        const studentCount = students.filter(s => s.teacher_id === t.id).length;
        const recordingCount = recordings.filter(r => r.teacher_id === t.id).length;
        const topicCount = topics.filter(top => top.teacher_id === t.id).length;

        return {
          ...t,
          student_count: studentCount,
          recording_count: recordingCount,
          topic_count: topicCount,
        };
      });
    });
  },

  async createTeacher(payload: {
    name: string;
    email?: string;
    auth_uid?: string;
  }): Promise<UserProfile> {
    return withServiceHandling('adminService', 'createTeacher', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          name: payload.name.trim(),
          role: 'teacher',
          auth_uid: payload.auth_uid?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    });
  },

  async updateTeacher(id: string, payload: Partial<UserProfile>): Promise<UserProfile> {
    return withServiceHandling('adminService', 'updateTeacher', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    });
  },

  async deleteTeacher(id: string): Promise<void> {
    return withServiceHandling('adminService', 'deleteTeacher', async () => {
      // 1. Delete questions for teacher's topics
      const { data: teacherTopics } = await supabase
        .from('topics')
        .select('id')
        .eq('teacher_id', id);
      if (teacherTopics && teacherTopics.length > 0) {
        const topicIds = teacherTopics.map(t => t.id);
        await supabase.from('questions').delete().in('topic_id', topicIds);
      }

      // 2. Delete vocabulary cards for teacher's vocab sets
      const { data: teacherSets } = await supabase
        .from('vocabulary_sets')
        .select('id')
        .eq('teacher_id', id);
      if (teacherSets && teacherSets.length > 0) {
        const setIds = teacherSets.map(s => s.id);
        await supabase.from('vocabulary_cards').delete().in('set_id', setIds);
      }

      // 3. Delete attendance records for teacher's attendance students
      const { data: teacherAttStudents } = await supabase
        .from('attendance_students')
        .select('id')
        .eq('teacher_id', id);
      if (teacherAttStudents && teacherAttStudents.length > 0) {
        const attIds = teacherAttStudents.map(a => a.id);
        await supabase.from('attendance_records').delete().in('student_id', attIds);
      }

      // 4. Delete teacher's records across all child tables
      await Promise.allSettled([
        supabase.from('topics').delete().eq('teacher_id', id),
        supabase.from('stories').delete().eq('teacher_id', id),
        supabase.from('vocabulary_sets').delete().eq('teacher_id', id),
        supabase.from('shadowing_videos').delete().eq('teacher_id', id),
        supabase.from('attendance_students').delete().eq('teacher_id', id),
        supabase.from('recordings').delete().eq('teacher_id', id),
        supabase.from('vocab_audios').delete().eq('teacher_id', id),
        supabase.from('profiles').delete().eq('teacher_id', id),
      ]);

      // 5. Delete teacher profile
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    });
  },
};

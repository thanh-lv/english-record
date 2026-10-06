import { supabase } from '../lib/supabase';
import { withServiceHandling } from './serviceHandler';
import { loggerService } from './loggerService';
import { UserProfile } from '../types';
import { fetchAllRows } from '../utils/postgrest';

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
      // Counts are aggregated client-side, so page through every row: a single select is
      // capped at 1000 rows and would silently undercount on larger systems.
      const fetchTeacherIds = (table: string, filter?: { column: string; value: string }) =>
        fetchAllRows<{ teacher_id: string | null }>((from, to) => {
          let query = supabase.from(table).select('id, teacher_id');
          if (filter) query = query.eq(filter.column, filter.value);
          return query.order('id').range(from, to);
        }).catch(err => {
          loggerService.error('adminService', `Error counting ${table} per teacher`, err);
          return [];
        });

      const [teachersRes, students, recordings, topics] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'teacher').order('name'),
        fetchTeacherIds('profiles', { column: 'role', value: 'student' }),
        fetchTeacherIds('recordings'),
        fetchTeacherIds('topics'),
      ]);

      if (teachersRes.error) throw teachersRes.error;

      const teachers = teachersRes.data || [];

      const countByTeacher = (rows: { teacher_id: string | null }[]) => {
        const counts = new Map<string, number>();
        for (const row of rows) {
          if (row.teacher_id) counts.set(row.teacher_id, (counts.get(row.teacher_id) || 0) + 1);
        }
        return counts;
      };
      const studentCounts = countByTeacher(students);
      const recordingCounts = countByTeacher(recordings);
      const topicCounts = countByTeacher(topics);

      return teachers.map((t: any) => ({
        ...t,
        student_count: studentCounts.get(t.id) || 0,
        recording_count: recordingCounts.get(t.id) || 0,
        topic_count: topicCounts.get(t.id) || 0,
      }));
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

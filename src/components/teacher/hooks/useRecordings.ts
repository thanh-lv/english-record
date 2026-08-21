import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../i18n/LanguageContext';

interface UseRecordingsOptions {
  onNewRecording?: (record: any) => void;
  teacherId?: string;
}

const RECORDING_COLUMNS =
  'id, student_name, topic_number, topic, question_text, audio_url, created_at, teacher_rating, teacher_feedback, student_reaction, user_id, shadowing_video_id, teacher_id';

import { StudentSummary, Recording } from '../../../types';

export type { StudentSummary, Recording };

export function useRecordings(user: any, options?: UseRecordingsOptions) {
  const { t } = useLanguage();
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const isInitialLoad = useRef(true);
  const onNewRecordingRef = useRef(options?.onNewRecording);
  onNewRecordingRef.current = options?.onNewRecording;
  const teacherId = options?.teacherId;

  const fetchSummaries = useCallback(async () => {
    try {
      // Try querying Database View first for pre-aggregated stats
      let viewQuery = supabase.from('student_recording_stats_view').select('*');
      if (teacherId) {
        viewQuery = viewQuery.eq('teacher_id', teacherId);
      }
      const viewRes = await viewQuery;

      if (!viewRes.error && viewRes.data && viewRes.data.length > 0) {
        const viewSummaries: StudentSummary[] = viewRes.data
          .map((item: any) => ({
            key: (item.name || '').trim().toLowerCase(),
            studentName: item.name,
            count: Number(item.total_recordings || 0),
            latestCreatedAt: item.last_submission_at || new Date().toISOString(),
            hasUngraded: false,
          }))
          .sort(
            (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
          );
        setSummaries(viewSummaries);
        return;
      }

      // Fallback: query directly from recordings table
      let query = supabase
        .from('recordings')
        .select('student_name, created_at, teacher_rating, teacher_feedback, teacher_id')
        .order('created_at', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const map = new Map<string, StudentSummary>();
      for (const rec of data || []) {
        const key = (rec.student_name || '').trim().toLowerCase();
        const hasFeedback =
          (rec.teacher_rating || 0) > 0 ||
          (rec.teacher_feedback && rec.teacher_feedback.trim().length > 0);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            key,
            studentName: rec.student_name,
            count: 1,
            latestCreatedAt: rec.created_at,
            hasUngraded: !hasFeedback,
          });
        } else {
          existing.count += 1;
          if (!hasFeedback) existing.hasUngraded = true;
        }
      }
      setSummaries(
        Array.from(map.values()).sort(
          (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
        )
      );
    } catch (error) {
      console.error('Error fetching recordings: ', error);
      setAppError(t.common.loadRecordingsError);
    } finally {
      setLoading(false);
    }
  }, [t.common.loadRecordingsError, teacherId]);

  useEffect(() => {
    if (!user) return;

    fetchSummaries().then(() => {
      isInitialLoad.current = false;
    });

    const channel = supabase
      .channel(`teacher-recordings-${teacherId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recordings' }, payload => {
        const record = payload.new as any;
        // Only process if this recording belongs to the current teacher
        if (teacherId && record && record.teacher_id && record.teacher_id !== teacherId) {
          return;
        }
        fetchSummaries();
        if (payload.eventType === 'INSERT' && !isInitialLoad.current && onNewRecordingRef.current) {
          if (!teacherId || !record?.teacher_id || record.teacher_id === teacherId) {
            onNewRecordingRef.current(record);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSummaries, teacherId]);

  const confirmDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!deleteTargetId) return;
    setDeleteSaving(true);
    setDeleteError('');
    try {
      const { error } = await supabase.from('recordings').delete().eq('id', deleteTargetId);
      if (error) throw error;
      setDeleteTargetId(null);
      await fetchSummaries();
    } catch (err: any) {
      console.error('Lỗi khi xóa: ', err);
      const errMsg = err?.message || t.common.deleteRecordingError;
      setDeleteError(errMsg);
      setAppError(errMsg);
    } finally {
      setDeleteSaving(false);
    }
  };

  return {
    summaries,
    loading,
    appError,
    deleteTargetId,
    setDeleteTargetId,
    deleteSaving,
    deleteError,
    setDeleteError,
    confirmDelete,
  };
}

export async function fetchStudentRecordings(
  studentName: string,
  page: number,
  pageSize: number,
  type: 'topic' | 'shadowing' = 'topic',
  teacherId?: string
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let selectStr = RECORDING_COLUMNS;
  if (type === 'shadowing') {
    selectStr = `${RECORDING_COLUMNS}, shadowing_videos(youtube_url)`;
  }

  let query = supabase
    .from('recordings')
    .select(selectStr, { count: 'exact' })
    .ilike('student_name', studentName)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }

  if (type === 'shadowing') {
    query = query.not('shadowing_video_id', 'is', null);
  } else {
    query = query.is('shadowing_video_id', null);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const records = (data || []).map((rec: any) => {
    if (type === 'shadowing') {
      const url = rec.shadowing_videos?.youtube_url ?? null;
      return { ...rec, youtube_url: url };
    }
    return rec;
  });

  return { records, total: count || 0 };
}

export async function fetchRecordingPage(
  studentName: string,
  recordId: string,
  pageSize: number,
  teacherId?: string
) {
  let query = supabase
    .from('recordings')
    .select('id, created_at')
    .ilike('student_name', studentName)
    .order('created_at', { ascending: false });

  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const idx = (data || []).findIndex(r => r.id === recordId);
  if (idx === -1) return 1;
  return Math.floor(idx / pageSize) + 1;
}

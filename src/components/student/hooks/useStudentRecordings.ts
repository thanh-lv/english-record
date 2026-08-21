import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { loggerService } from '../../../services/loggerService';
import { Recording } from '../../../types';

export function useStudentRecordings(user: any, profile: any) {
  const [myRecordings, setMyRecordings] = useState<Recording[]>([]);
  const [completedNumbers, setCompletedNumbers] = useState<number[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!profile?.name) {
      setRecordingsLoading(false);
      return;
    }

    const studentName = profile.name.trim();
    let isMounted = true;

    const fetchRecordings = async () => {
      setRecordingsLoading(true);
      try {
        let query = supabase
          .from('recordings')
          .select(
            'id, topic_number, audio_url, created_at, teacher_rating, teacher_feedback, student_reaction, question_id, question_text, topic, topic_id, shadowing_video_id, teacher_id'
          )
          .ilike('student_name', studentName);

        if (profile?.teacher_id) {
          query = query.eq('teacher_id', profile.teacher_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (data && isMounted) {
          setMyRecordings(data as Recording[]);
          setCompletedNumbers(
            data
              .filter((rec: any) => rec.topic_number != null)
              .map((rec: any) => Number(rec.topic_number))
          );
        }
      } catch (err) {
        loggerService.error('useStudentRecordings', 'Error downloading student recordings', err);
      } finally {
        if (isMounted) {
          setRecordingsLoading(false);
        }
      }
    };

    fetchRecordings();

    const teacherPrefix = profile?.teacher_id || 'global';
    const channel = supabase
      .channel(`student-recordings-${teacherPrefix}-${studentName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
          filter: `student_name=eq.${studentName}`,
        },
        payload => {
          const record = (payload.new || payload.old) as any;
          if (
            profile?.teacher_id &&
            record?.teacher_id &&
            record.teacher_id !== profile.teacher_id
          ) {
            return;
          }

          if (payload.eventType === 'INSERT') {
            setMyRecordings(prev => {
              if (prev.some(r => r.id === payload.new.id)) return prev;
              return [...prev, payload.new as Recording];
            });
            if (payload.new.topic_number != null) {
              setCompletedNumbers(prev => [...prev, Number(payload.new.topic_number)]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMyRecordings(prev =>
              prev.map(r => (r.id === payload.new.id ? (payload.new as Recording) : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setMyRecordings(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, profile?.name, profile?.teacher_id]);

  return {
    myRecordings,
    setMyRecordings,
    completedNumbers,
    setCompletedNumbers,
    recordingsLoading,
  };
}

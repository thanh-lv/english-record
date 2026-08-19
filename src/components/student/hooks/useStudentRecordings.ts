import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { loggerService } from '../../../services/loggerService';
import { Recording } from '../../../types';

export function useStudentRecordings(user: any, profile: any) {
  const [myRecordings, setMyRecordings] = useState<Recording[]>([]);
  const [completedNumbers, setCompletedNumbers] = useState<number[]>([]);

  useEffect(() => {
    if (!user || !profile?.name) return;

    const studentName = profile.name.trim();

    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from('recordings')
          .select(
            'id, topic_number, audio_url, created_at, teacher_rating, teacher_feedback, student_reaction, question_id, question_text, topic, topic_id, shadowing_video_id'
          )
          .eq('student_name', studentName);

        if (error) throw error;
        if (data) {
          setMyRecordings(data as Recording[]);
          setCompletedNumbers(
            data
              .filter((rec: any) => rec.topic_number != null)
              .map((rec: any) => Number(rec.topic_number))
          );
        }
      } catch (err) {
        loggerService.error('useStudentRecordings', 'Error downloading student recordings', err);
      }
    };

    fetchRecordings();

    const channel = supabase
      .channel(`student-recordings-${studentName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
          filter: `student_name=eq.${studentName}`,
        },
        payload => {
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
      supabase.removeChannel(channel);
    };
  }, [user, profile?.name]);

  return {
    myRecordings,
    setMyRecordings,
    completedNumbers,
    setCompletedNumbers,
  };
}

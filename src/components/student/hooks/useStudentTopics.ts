import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { loggerService } from '../../../services/loggerService';
import { Topic } from '../../../types';

export function useStudentTopics(profile: any, isBongBe: boolean) {
  const [activeTopics, setActiveTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true);
      try {
        const topicType = isBongBe ? 'bongbe' : 'standard';
        const studentGrade = profile?.grade ? Number(profile.grade) : null;
        const { data, error } = await supabase
          .from('topics')
          .select('*, questions(*)')
          .eq('type', topicType)
          .eq('is_active', true)
          .order('order_index');

        if (error) throw error;

        const normalized = (data || [])
          .filter((t: any) => {
            if (!studentGrade) return true;
            if (!t.grades || !Array.isArray(t.grades) || t.grades.length === 0) {
              return true;
            }
            return t.grades.includes(studentGrade);
          })
          .map((t: any) => ({
            ...t,
            questions: (t.questions || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
          }));

        setActiveTopics(normalized);
      } catch (err) {
        loggerService.error('useStudentTopics', 'Error fetching student topics', err);
      } finally {
        setTopicsLoading(false);
      }
    };

    fetchTopics();
  }, [isBongBe, profile?.grade]);

  return { activeTopics, topicsLoading };
}

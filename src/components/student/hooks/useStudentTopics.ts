import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { clientCache } from '../../../lib/cache';
import { loggerService } from '../../../services/loggerService';
import { Topic } from '../../../types';

export function useStudentTopics(profile: any, isBongBe: boolean) {
  const topicType = isBongBe ? 'bongbe' : 'standard';
  const studentGrade = profile?.grade ? Number(profile.grade) : null;
  const teacherId = profile?.teacher_id || null;
  const cacheKey = `topics:student:${topicType}:${studentGrade ?? 'all'}:${teacherId ?? 'global'}`;

  const [activeTopics, setActiveTopics] = useState<Topic[]>(
    () => clientCache.get<Topic[]>(cacheKey) || []
  );
  const [topicsLoading, setTopicsLoading] = useState<boolean>(
    () => !clientCache.get<Topic[]>(cacheKey)
  );

  useEffect(() => {
    let cancelled = false;

    const fetchTopics = async () => {
      try {
        const result = await clientCache.fetchWithCache(
          cacheKey,
          async () => {
            let query = supabase
              .from('topics')
              .select('*, questions(*)')
              .eq('type', topicType)
              .eq('is_active', true)
              .order('order_index');

            if (teacherId) {
              query = query.eq('teacher_id', teacherId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || [])
              .filter((t: any) => {
                if (!studentGrade) return true;
                if (!t.grades || !Array.isArray(t.grades) || t.grades.length === 0) {
                  return true;
                }
                return t.grades.includes(studentGrade);
              })
              .map((t: any) => ({
                ...t,
                questions: (t.questions || []).sort(
                  (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
                ),
              }));
          },
          { ttlMs: 60 * 1000, persist: true }
        );

        if (!cancelled) {
          setActiveTopics(result);
        }
      } catch (err) {
        loggerService.error('useStudentTopics', 'Error fetching student topics', err);
      } finally {
        if (!cancelled) {
          setTopicsLoading(false);
        }
      }
    };

    fetchTopics();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, topicType, studentGrade, teacherId]);

  return { activeTopics, topicsLoading };
}

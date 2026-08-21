import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { clientCache } from '../../../lib/cache';
import { loggerService } from '../../../services/loggerService';
import { Story } from '../../../types';

export function useStudentStories(profile: any) {
  const studentGrade = profile?.grade ? Number(profile.grade) : null;
  const teacherId = profile?.teacher_id || null;
  const cacheKey = `stories:student:${studentGrade ?? 'all'}:${teacherId ?? 'global'}`;

  const [dbStories, setDbStories] = useState<Story[]>(
    () => clientCache.get<Story[]>(cacheKey) || []
  );

  useEffect(() => {
    let cancelled = false;

    const fetchStories = async () => {
      try {
        const result = await clientCache.fetchWithCache(
          cacheKey,
          async () => {
            let query = supabase
              .from('stories')
              .select('id, title, type, emoji, image_url, content, grades, is_active, teacher_id')
              .eq('is_active', true)
              .order('created_at', { ascending: false });

            if (teacherId) {
              query = query.eq('teacher_id', teacherId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).filter((s: any) => {
              if (!studentGrade) return true;
              if (!s.grades || !Array.isArray(s.grades) || s.grades.length === 0) {
                return true;
              }
              return s.grades.includes(studentGrade);
            });
          },
          { ttlMs: 60 * 1000, persist: true }
        );

        if (!cancelled) {
          setDbStories(result as Story[]);
        }
      } catch (err) {
        loggerService.error('useStudentStories', 'Error fetching student stories', err);
      }
    };

    fetchStories();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, studentGrade, teacherId]);

  return { dbStories, setDbStories };
}

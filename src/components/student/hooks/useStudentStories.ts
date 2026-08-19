import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { clientCache } from '../../../lib/cache';
import { loggerService } from '../../../services/loggerService';
import { Story } from '../../../types';

export function useStudentStories(profile: any) {
  const studentGrade = profile?.grade ? Number(profile.grade) : null;
  const cacheKey = `stories:student:${studentGrade ?? 'all'}`;

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
            const { data, error } = await supabase
              .from('stories')
              .select('id, title, type, emoji, image_url, content, grades, is_active')
              .eq('is_active', true)
              .order('created_at', { ascending: false });

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
  }, [cacheKey, studentGrade]);

  return { dbStories, setDbStories };
}

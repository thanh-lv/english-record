import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { loggerService } from '../../../services/loggerService';
import { Story } from '../../../types';

export function useStudentStories(profile: any) {
  const [dbStories, setDbStories] = useState<Story[]>([]);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const studentGrade = profile?.grade ? Number(profile.grade) : null;
        const { data, error } = await supabase
          .from('stories')
          .select('id, title, type, emoji, image_url, content, grades, is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const filtered = (data || []).filter((s: any) => {
          if (!studentGrade) return true;
          if (!s.grades || !Array.isArray(s.grades) || s.grades.length === 0) {
            return true;
          }
          return s.grades.includes(studentGrade);
        });

        setDbStories(filtered as Story[]);
      } catch (err) {
        loggerService.error('useStudentStories', 'Error fetching student stories', err);
      }
    };

    fetchStories();
  }, [profile?.grade]);

  return { dbStories, setDbStories };
}

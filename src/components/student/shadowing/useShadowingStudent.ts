import { useState, useEffect, useMemo, useCallback } from 'react';
import { shadowingService } from '../../../services/shadowingService';
import { ShadowingVideo } from '../../../types';

interface UseShadowingStudentOptions {
  studentGrade?: number | string | null;
  teacherId?: string | null;
}

export function useShadowingStudent({ studentGrade, teacherId }: UseShadowingStudentOptions = {}) {
  const [videos, setVideos] = useState<ShadowingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  const parsedStudentGrade = studentGrade ? Number(studentGrade) : null;
  const [filterMode, setFilterMode] = useState<string>('all');

  const isVideoForGrade = (video: ShadowingVideo, grade: number) => {
    if (!video.grades || !Array.isArray(video.grades) || video.grades.length === 0) {
      return true;
    }
    return video.grades.some(g => Number(g) === Number(grade));
  };

  const fetchVideos = useCallback(async () => {
    try {
      const data = teacherId
        ? await shadowingService.fetchShadowingVideos(true, teacherId)
        : await shadowingService.fetchShadowingVideos(true);
      setVideos(data);
      if (parsedStudentGrade && data.some(v => isVideoForGrade(v, parsedStudentGrade))) {
        setFilterMode('myGrade');
      } else {
        setFilterMode('all');
      }
    } catch (err) {
      console.error('Fetch student shadowing videos error:', err);
    } finally {
      setLoading(false);
    }
  }, [teacherId, parsedStudentGrade]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      // Grade filter mode
      if (filterMode === 'myGrade' && parsedStudentGrade) {
        if (!isVideoForGrade(video, parsedStudentGrade)) return false;
      } else if (filterMode !== 'all') {
        const specificGrade = Number(filterMode);
        if (!isNaN(specificGrade) && !isVideoForGrade(video, specificGrade)) {
          return false;
        }
      }

      // Search text filter
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase().trim();
      return video.title?.toLowerCase().includes(q);
    });
  }, [videos, filterMode, parsedStudentGrade, filterText]);

  return {
    videos,
    filteredVideos,
    loading,
    filterText,
    setFilterText,
    filterMode,
    setFilterMode,
    parsedStudentGrade,
    fetchVideos,
  };
}

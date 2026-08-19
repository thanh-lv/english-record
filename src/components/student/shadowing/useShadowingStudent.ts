import { useState, useEffect, useMemo, useCallback } from 'react';
import { shadowingService, ShadowingVideo } from '../../../services/shadowingService';

interface UseShadowingStudentOptions {
  studentGrade?: number | string | null;
}

export function useShadowingStudent({ studentGrade }: UseShadowingStudentOptions = {}) {
  const [videos, setVideos] = useState<ShadowingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  const parsedStudentGrade = studentGrade ? Number(studentGrade) : null;
  const [filterMode, setFilterMode] = useState<string>(parsedStudentGrade ? 'myGrade' : 'all');

  const fetchVideos = useCallback(async () => {
    try {
      const data = await shadowingService.fetchShadowingVideos(true);
      setVideos(data);
    } catch (err) {
      console.error('Fetch student shadowing videos error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const isVideoForGrade = (video: ShadowingVideo, grade: number) => {
    if (!video.grades || !Array.isArray(video.grades) || video.grades.length === 0) {
      return true;
    }
    return video.grades.includes(grade);
  };

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

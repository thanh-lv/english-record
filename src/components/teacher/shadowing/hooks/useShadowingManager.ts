import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  shadowingService,
  formatSecondsToTime,
  parseTimeToSeconds,
} from '../../../../services/shadowingService';
import { loggerService } from '../../../../services/loggerService';
import { ShadowingVideo } from '../../../../types';
import { validateShadowingVideo, validateGrades, sanitizeText } from '../../../../utils/validators';
import { useTeacher } from '../../../../contexts/TeacherContext';

export function useShadowingManager(t: any) {
  const { teacherId } = useTeacher();
  const [videos, setVideos] = useState<ShadowingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ShadowingVideo | null>(null);

  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [previewStart, setPreviewStart] = useState('');
  const [previewEnd, setPreviewEnd] = useState('');
  const [recordStart, setRecordStart] = useState('');
  const [recordEnd, setRecordEnd] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ShadowingVideo | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVideos = useCallback(async () => {
    try {
      const data = await shadowingService.fetchShadowingVideos(false, teacherId);
      setVideos(data);
    } catch (err: any) {
      loggerService.error('useShadowingManager', 'Fetch videos error', err);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchSearch =
        !searchQuery.trim() || v.title.toLowerCase().includes(searchQuery.toLowerCase().trim());

      let matchGrade = true;
      if (filterGrade !== 'all') {
        if (filterGrade === 'unassigned') {
          matchGrade = !v.grades || v.grades.length === 0;
        } else {
          const gNum = Number(filterGrade);
          matchGrade = Array.isArray(v.grades) && v.grades.includes(gNum);
        }
      }

      return matchSearch && matchGrade;
    });
  }, [videos, searchQuery, filterGrade]);

  const handleCopyLink = async (videoId: string) => {
    const url = `${window.location.origin}/student/shadowing/${videoId}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedId(videoId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      loggerService.error('useShadowingManager', 'Copy link error', err);
    }
  };

  const openCreateModal = useCallback(() => {
    setEditingVideo(null);
    setTitle('');
    setYoutubeUrl('');
    setPreviewStart('');
    setPreviewEnd('');
    setRecordStart('');
    setRecordEnd('');
    setSelectedGrades([]);
    setError('');
    setShowCreate(true);
  }, []);

  const openEditModal = useCallback((video: ShadowingVideo) => {
    setEditingVideo(video);
    setTitle(video.title);
    setYoutubeUrl(video.youtube_url);
    setPreviewStart(formatSecondsToTime(video.preview_start));
    setPreviewEnd(formatSecondsToTime(video.preview_end));
    setRecordStart(formatSecondsToTime(video.record_start));
    setRecordEnd(formatSecondsToTime(video.record_end));
    setSelectedGrades(video.grades || []);
    setError('');
    setShowCreate(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowCreate(false);
    setEditingVideo(null);
    setError('');
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeText(title);

    const videoVal = validateShadowingVideo(
      {
        title: cleanTitle,
        youtube_url: youtubeUrl,
        preview_start: parseTimeToSeconds(previewStart),
        preview_end: parseTimeToSeconds(previewEnd),
        record_start: parseTimeToSeconds(recordStart),
        record_end: parseTimeToSeconds(recordEnd),
      },
      {
        titleRequired: t?.shadowing?.titleRequired || 'Tiêu đề video phải có ít nhất 2 ký tự',
        titleMax: t?.shadowing?.titleMax || 'Tiêu đề video không được vượt quá 150 ký tự',
        urlInvalid:
          t?.shadowing?.urlInvalid || 'Đường dẫn YouTube không hợp lệ (cần video ID 11 ký tự)',
        previewRangeInvalid:
          t?.shadowing?.previewTimeInvalid ||
          'Thời gian xem trước không hợp lệ (Bắt đầu phải nhỏ hơn Kết thúc)',
        recordRangeInvalid:
          t?.shadowing?.recordTimeInvalid ||
          'Thời gian ghi âm không hợp lệ (Bắt đầu phải nhỏ hơn Kết thúc)',
      }
    );

    if (!videoVal.isValid) {
      setError(videoVal.error || 'Dữ liệu không hợp lệ');
      return;
    }

    const gradesVal = validateGrades(selectedGrades);
    if (!gradesVal.isValid) {
      setError(gradesVal.error || 'Khối lớp không hợp lệ');
      return;
    }

    setIsSaving(true);
    setError('');

    const payload = {
      title: cleanTitle,
      youtube_url: youtubeUrl.trim(),
      preview_start: parseTimeToSeconds(previewStart),
      preview_end: parseTimeToSeconds(previewEnd),
      record_start: parseTimeToSeconds(recordStart),
      record_end: parseTimeToSeconds(recordEnd),
      grades: selectedGrades,
      teacher_id: teacherId,
    };

    try {
      if (editingVideo) {
        const updated = await shadowingService.updateShadowingVideo(editingVideo.id, payload);
        setVideos(prev => prev.map(v => (v.id === updated.id ? updated : v)));
        setEditingVideo(null);
        setShowCreate(false);
      } else {
        const created = await shadowingService.createShadowingVideo(payload);
        setVideos(prev => [created, ...prev]);
        setShowCreate(false);
      }
    } catch (err: any) {
      loggerService.error('useShadowingManager', 'Error saving shadowing video', err);
      setError(err.message || 'Lỗi lưu video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await shadowingService.toggleShadowingVideoActive(id, current);
      setVideos(prev => prev.map(v => (v.id === id ? { ...v, is_active: !current } : v)));
    } catch (err: any) {
      loggerService.error('useShadowingManager', 'Error toggling video active', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    setDeleteError('');
    try {
      await shadowingService.deleteShadowingVideo(deleteTarget.id);
      setVideos(prev => prev.filter(v => v.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      loggerService.error('useShadowingManager', 'Error deleting video', err);
      setDeleteError(err.message || 'Lỗi xóa video');
    } finally {
      setDeleteSaving(false);
    }
  };

  return {
    videos,
    filteredVideos,
    loading,
    searchQuery,
    setSearchQuery,
    filterGrade,
    setFilterGrade,
    showCreate,
    setShowCreate,
    editingVideo,
    setEditingVideo,
    title,
    setTitle,
    youtubeUrl,
    setYoutubeUrl,
    previewStart,
    setPreviewStart,
    previewEnd,
    setPreviewEnd,
    recordStart,
    setRecordStart,
    recordEnd,
    setRecordEnd,
    selectedGrades,
    setSelectedGrades,
    isSaving,
    error,
    setError,
    deleteTarget,
    setDeleteTarget,
    deleteSaving,
    deleteError,
    copiedId,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    handleToggleActive,
    handleDelete,
    handleCopyLink,
  };
}

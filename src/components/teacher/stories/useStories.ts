import { useState, useEffect, useMemo, useCallback } from 'react';
import { storyService } from '../../../services/storyService';
import { uploadService } from '../../../services/uploadService';
import { Story } from '../../../types';
import { validateStory, validateGrades, sanitizeText } from '../../../utils/validators';

export function useStories(t: any) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hidden'>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [deleteStoryTarget, setDeleteStoryTarget] = useState<Story | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Edit story state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editGrades, setEditGrades] = useState<number[]>([]);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Manual story state
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualEmoji, setManualEmoji] = useState('📚');
  const [manualType, setManualType] = useState('Truyện tranh');
  const [manualGrades, setManualGrades] = useState<number[]>([]);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  // AI Generator state
  const [title, setTitle] = useState('');
  const [aiGrades, setAiGrades] = useState<number[]>([]);
  const [type, setType] = useState('Truyện tranh');
  const [emoji, setEmoji] = useState('📚');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStory, setGeneratedStory] = useState('');
  const [generatedImageBlob, setGeneratedImageBlob] = useState<Blob | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchStories = useCallback(async () => {
    try {
      const data = await storyService.fetchAllStories();
      setStories(data);
    } catch (err) {
      console.error('Fetch stories error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const filteredStories = useMemo(() => {
    return stories.filter(s => {
      const matchText = !filterText || s.title.toLowerCase().includes(filterText.toLowerCase());
      const active = s.is_active ?? true;
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && active) ||
        (filterStatus === 'hidden' && !active);

      let matchGrade = true;
      if (filterGrade !== 'all') {
        if (filterGrade === 'unassigned') {
          matchGrade = !s.grades || s.grades.length === 0;
        } else {
          const gNum = Number(filterGrade);
          matchGrade = Array.isArray(s.grades) && s.grades.includes(gNum);
        }
      }

      return matchText && matchStatus && matchGrade;
    });
  }, [stories, filterText, filterStatus, filterGrade]);

  const toggleStoryActive = async (storyId: string, currentValue: boolean) => {
    await storyService.toggleStoryActive(storyId, currentValue);
    setStories(prev => prev.map(s => (s.id === storyId ? { ...s, is_active: !currentValue } : s)));
  };

  const openEditStory = (story: Story) => {
    setEditingStory(story);
    setEditTitle(story.title);
    setEditContent(story.content);
    setEditEmoji(story.emoji || '📚');
    setEditGrades(story.grades || []);
    setEditError('');
  };

  const saveEditStory = async () => {
    if (!editingStory) return;
    const cleanTitle = sanitizeText(editTitle);
    const cleanContent = sanitizeText(editContent);
    const cleanEmoji = sanitizeText(editEmoji) || '📚';

    const storyVal = validateStory(
      {
        title: cleanTitle,
        content: cleanContent,
        emoji: cleanEmoji,
      },
      {
        titleRequired: t.common?.storyTitleMin || 'Tiêu đề truyện phải có ít nhất 2 ký tự.',
        titleMax: t.common?.storyTitleMax || 'Tiêu đề truyện không được vượt quá 150 ký tự.',
        contentRequired: t.common?.storyContentMin || 'Nội dung truyện phải có ít nhất 10 ký tự.',
        contentMax:
          t.common?.storyContentMax || 'Nội dung truyện không được vượt quá 10,000 ký tự.',
      }
    );

    if (!storyVal.isValid) {
      setEditError(storyVal.error || 'Dữ liệu truyện không hợp lệ');
      return;
    }

    const gradesVal = validateGrades(editGrades);
    if (!gradesVal.isValid) {
      setEditError(gradesVal.error || 'Khối lớp không hợp lệ');
      return;
    }

    setEditSaving(true);
    setEditError('');
    try {
      await storyService.updateStory(editingStory.id, {
        title: cleanTitle,
        content: cleanContent,
        emoji: cleanEmoji,
        grades: editGrades,
      });
      setStories(prev =>
        prev.map(s =>
          s.id === editingStory.id
            ? {
                ...s,
                title: cleanTitle,
                content: cleanContent,
                emoji: cleanEmoji,
                grades: editGrades,
              }
            : s
        )
      );
      setEditingStory(null);
    } catch (err: any) {
      setEditError(err.message || 'Lỗi cập nhật truyện');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteStory = async () => {
    if (!deleteStoryTarget) return;
    setDeleteSaving(true);
    setDeleteError('');
    try {
      await storyService.deleteStory(deleteStoryTarget.id);
      setStories(prev => prev.filter(s => s.id !== deleteStoryTarget.id));
      setDeleteStoryTarget(null);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleManualSave = async () => {
    const cleanTitle = sanitizeText(manualTitle);
    const cleanContent = sanitizeText(manualContent);
    const cleanEmoji = sanitizeText(manualEmoji) || '📚';
    const cleanType = sanitizeText(manualType) || 'Truyện tranh';

    const storyVal = validateStory(
      {
        title: cleanTitle,
        content: cleanContent,
        emoji: cleanEmoji,
        type: cleanType,
      },
      {
        titleRequired: t.common?.storyTitleMin || 'Tiêu đề truyện phải có ít nhất 2 ký tự.',
        titleMax: t.common?.storyTitleMax || 'Tiêu đề truyện không được vượt quá 150 ký tự.',
        contentRequired: t.common?.storyContentMin || 'Nội dung truyện phải có ít nhất 10 ký tự.',
        contentMax:
          t.common?.storyContentMax || 'Nội dung truyện không được vượt quá 10,000 ký tự.',
      }
    );

    if (!storyVal.isValid) {
      setManualError(storyVal.error || 'Vui lòng điền đủ thông tin');
      return;
    }

    const gradesVal = validateGrades(manualGrades);
    if (!gradesVal.isValid) {
      setManualError(gradesVal.error || 'Khối lớp không hợp lệ');
      return;
    }

    setManualSaving(true);
    setManualError('');
    try {
      const data = await storyService.createStory({
        title: cleanTitle,
        grades: manualGrades,
        type: cleanType,
        emoji: cleanEmoji,
        content: cleanContent,
        image_url: null,
        is_active: true,
      });
      setStories([data, ...stories]);
      setShowManual(false);
      setManualTitle('');
      setManualContent('');
      setManualEmoji('📚');
      setManualGrades([]);
    } catch (err: any) {
      setManualError(err.message || 'Lỗi lưu câu chuyện');
    } finally {
      setManualSaving(false);
    }
  };

  const handleGenerateAiStory = async () => {
    const cleanPrompt = sanitizeText(prompt);
    if (!cleanPrompt || cleanPrompt.length < 3) {
      return setAiError(t.common?.promptMin || 'Gợi ý AI phải có ít nhất 3 ký tự.');
    }
    if (cleanPrompt.length > 500) {
      return setAiError(t.common?.promptMax || 'Gợi ý AI không được vượt quá 500 ký tự.');
    }

    const gradesVal = validateGrades(aiGrades);
    if (!gradesVal.isValid) {
      return setAiError(gradesVal.error || 'Khối lớp không hợp lệ');
    }

    setIsGenerating(true);
    setAiError('');
    setGeneratedStory('');
    setGeneratedImageBlob(null);
    setGeneratedImageUrl('');

    try {
      const storyText = await storyService.generateAiText(cleanPrompt, aiGrades);
      setGeneratedStory(storyText);

      const imgBlob = await storyService.generateAiImage(cleanPrompt);
      setGeneratedImageBlob(imgBlob);
      setGeneratedImageUrl(URL.createObjectURL(imgBlob));
    } catch (err: any) {
      setAiError(err.message || 'Lỗi tạo câu chuyện bằng AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAiStory = async () => {
    const cleanTitle = sanitizeText(title);
    const cleanStory = sanitizeText(generatedStory);
    const cleanEmoji = sanitizeText(emoji) || '📚';
    const cleanType = sanitizeText(type) || 'Truyện tranh';

    if (!cleanTitle || cleanTitle.length < 2) {
      return setAiError(t.common?.storyTitleMin || 'Tiêu đề truyện phải có ít nhất 2 ký tự.');
    }
    if (cleanTitle.length > 150) {
      return setAiError(t.common?.storyTitleMax || 'Tiêu đề truyện không được vượt quá 150 ký tự.');
    }
    if (!cleanStory || cleanStory.length < 10) {
      return setAiError(t.common?.storyContentMin || 'Nội dung truyện phải có ít nhất 10 ký tự.');
    }
    if (!generatedImageBlob) {
      return setAiError('Thiếu hình ảnh minh họa cho truyện.');
    }

    setIsSaving(true);
    setAiError('');
    try {
      const imageUrl = await uploadService.uploadFile(generatedImageBlob, `stories`);

      const data = await storyService.createStory({
        title: cleanTitle,
        grades: aiGrades,
        type: cleanType,
        emoji: cleanEmoji,
        content: cleanStory,
        image_url: imageUrl,
        is_active: true,
      });

      setStories([data, ...stories]);
      setShowCreate(false);
      setTitle('');
      setPrompt('');
      setGeneratedStory('');
      setGeneratedImageUrl('');
      setGeneratedImageBlob(null);
      setAiGrades([]);
    } catch (err: any) {
      setAiError(err.message || 'Lỗi lưu truyện');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    stories,
    loading,
    filterText,
    setFilterText,
    filterStatus,
    setFilterStatus,
    filterGrade,
    setFilterGrade,
    filteredStories,
    showCreate,
    setShowCreate,
    showManual,
    setShowManual,
    editingStory,
    setEditingStory,
    deleteStoryTarget,
    setDeleteStoryTarget,
    deleteSaving,
    deleteError,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    editEmoji,
    setEditEmoji,
    editGrades,
    setEditGrades,
    editError,
    editSaving,
    manualTitle,
    setManualTitle,
    manualContent,
    setManualContent,
    manualEmoji,
    setManualEmoji,
    manualType,
    setManualType,
    manualGrades,
    setManualGrades,
    manualSaving,
    manualError,
    title,
    setTitle,
    aiGrades,
    setAiGrades,
    type,
    setType,
    emoji,
    setEmoji,
    prompt,
    setPrompt,
    isGenerating,
    generatedStory,
    generatedImageUrl,
    isSaving,
    aiError,
    toggleStoryActive,
    openEditStory,
    saveEditStory,
    confirmDeleteStory,
    handleManualSave,
    handleGenerateAiStory,
    handleSaveAiStory,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { topicService } from '../../../../services/topicService';
import { loggerService } from '../../../../services/loggerService';
import { Topic, ParsedQuestion } from '../../../../types';
import { validateTopicTitle, validateGrades, sanitizeText } from '../../../../utils/validators';
import { useTeacher } from '../../../../contexts/TeacherContext';

export function useTopics() {
  const { teacherId } = useTeacher();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeType, setActiveType] = useState<'standard' | 'bongbe'>('standard');
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hidden'>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicGrades, setEditTopicGrades] = useState<number[]>([]);
  const [editTopicError, setEditTopicError] = useState('');
  const [addingTopic, setAddingTopic] = useState<'standard' | 'bongbe' | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicGrades, setNewTopicGrades] = useState<number[]>([]);
  const [addTopicError, setAddTopicError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'topic' | 'question' | 'bulk-topics';
    id?: string;
    ids?: string[];
    label: string;
    count?: number;
  } | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  const fetchTopics = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setLoadError(false);
      try {
        const data = await topicService.fetchAllTopics(teacherId);
        setTopics(data);
      } catch (err) {
        loggerService.error('useTopics', 'Fetch topics error', err);
        if (showLoading) setLoadError(true);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [teacherId]
  );

  useEffect(() => {
    fetchTopics(true);
  }, [fetchTopics]);

  useEffect(() => {
    setSelectedTopicIds([]);
  }, [activeType]);

  const filteredTopics = topics
    .filter(t => t.type === activeType)
    .filter(t => !filterText || t.title.toLowerCase().includes(filterText.toLowerCase()))
    .filter(t => {
      if (filterStatus === 'active') return t.is_active ?? true;
      if (filterStatus === 'hidden') return !(t.is_active ?? true);
      return true;
    })
    .filter(t => {
      if (filterGrade === 'all') return true;
      if (filterGrade === 'unassigned') return !t.grades || t.grades.length === 0;
      const gNum = Number(filterGrade);
      return Array.isArray(t.grades) && t.grades.includes(gNum);
    });

  const totalPages = Math.ceil(filteredTopics.length / PAGE_SIZE);
  const pagedTopics = filteredTopics.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const isAllSelected =
    filteredTopics.length > 0 && filteredTopics.every(t => selectedTopicIds.includes(t.id));
  const isSomeSelected = selectedTopicIds.length > 0 && !isAllSelected;

  const toggleSelectTopic = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopicIds(filteredTopics.map(t => t.id));
  };

  const deselectAllTopics = () => {
    setSelectedTopicIds([]);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      deselectAllTopics();
    } else {
      selectAllTopics();
    }
  };

  const openBulkDeleteModal = () => {
    if (selectedTopicIds.length === 0) return;
    setDeleteTarget({
      type: 'bulk-topics',
      ids: [...selectedTopicIds],
      label: `${selectedTopicIds.length} chủ đề`,
      count: selectedTopicIds.length,
    });
  };

  const toggleTopicActive = async (topicId: string, currentValue: boolean) => {
    setTopics(prev => prev.map(t => (t.id === topicId ? { ...t, is_active: !currentValue } : t)));
    await topicService.toggleTopicActive(topicId, currentValue);
  };

  const saveTopic = async (topicId: string) => {
    const cleanTitle = sanitizeText(editTopicTitle);
    const titleVal = validateTopicTitle(cleanTitle);
    if (!titleVal.isValid) {
      setEditTopicError(titleVal.error || 'Tên chủ đề không hợp lệ');
      return;
    }
    const gradesVal = validateGrades(editTopicGrades);
    if (!gradesVal.isValid) {
      setEditTopicError(gradesVal.error || 'Khối lớp không hợp lệ');
      return;
    }

    setSaving(true);
    setEditTopicError('');
    try {
      await topicService.updateTopic(topicId, {
        title: cleanTitle,
        grades: editTopicGrades,
      });
      setEditingTopic(null);
      await fetchTopics(false);
    } catch (err: any) {
      loggerService.error('useTopics', 'Error updating topic', err);
      setEditTopicError(err.message || 'Lỗi lưu chủ đề');
    } finally {
      setSaving(false);
    }
  };

  const addTopic = async () => {
    const cleanTitle = sanitizeText(newTopicTitle);
    if (!addingTopic) return;

    const titleVal = validateTopicTitle(cleanTitle);
    if (!titleVal.isValid) {
      setAddTopicError(titleVal.error || 'Tên chủ đề không hợp lệ');
      return;
    }
    const gradesVal = validateGrades(newTopicGrades);
    if (!gradesVal.isValid) {
      setAddTopicError(gradesVal.error || 'Khối lớp không hợp lệ');
      return;
    }

    setSaving(true);
    setAddTopicError('');
    try {
      const maxOrder = topics.filter(t => t.type === addingTopic).length + 1;
      await topicService.createTopic(cleanTitle, addingTopic, maxOrder, newTopicGrades, teacherId);
      setNewTopicTitle('');
      setNewTopicGrades([]);
      setAddTopicError('');
      setAddingTopic(null);
      await fetchTopics(false);
    } catch (err: any) {
      loggerService.error('useTopics', 'Error creating topic', err);
      setAddTopicError(err.message || 'Lỗi tạo chủ đề mới');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!deleteTarget) return;

    setDeleteSaving(true);
    setDeleteError('');
    try {
      if (deleteTarget.type === 'question' && deleteTarget.id) {
        const questionId = deleteTarget.id;
        await topicService.deleteQuestion(questionId);
        setTopics(prev =>
          prev.map(t => ({
            ...t,
            questions: (t.questions || []).filter(q => q.id !== questionId),
          }))
        );
      } else if (deleteTarget.type === 'bulk-topics' && deleteTarget.ids) {
        const idsToDelete = new Set(deleteTarget.ids);
        await topicService.deleteTopics(deleteTarget.ids);
        setTopics(prev => prev.filter(t => !idsToDelete.has(t.id)));
        setSelectedTopicIds([]);
      } else if (deleteTarget.id) {
        const topicId = deleteTarget.id;
        await topicService.deleteTopic(topicId);
        setTopics(prev => prev.filter(t => t.id !== topicId));
        setSelectedTopicIds(prev => prev.filter(id => id !== topicId));
      }
      setDeleteTarget(null);
      await fetchTopics(false);
    } catch (err: any) {
      loggerService.error('useTopics', 'Error confirming delete', err);
      setDeleteError(err.message || 'Lỗi khi xóa. Vui lòng thử lại.');
    } finally {
      setDeleteSaving(false);
    }
  };

  const createQuestion = async (topicId: string, values: any) => {
    const topic = topics.find(t => t.id === topicId);
    const maxOrder = topic?.questions?.length || 0;
    await topicService.createQuestion({
      topic_id: topicId,
      text: values.text,
      translation: values.translation || null,
      sample_answer: values.sample_answer || null,
      target: values.target || null,
      image_url: values.image_url || null,
      order_index: maxOrder,
    });
    await fetchTopics(false);
  };

  const updateQuestion = async (questionId: string, values: any) => {
    await topicService.updateQuestion(questionId, {
      text: values.text,
      translation: values.translation || null,
      sample_answer: values.sample_answer || null,
      target: values.target || null,
      image_url: values.image_url || null,
    });
    await fetchTopics(false);
  };

  const addParsedQuestions = async (topicId: string, parsed: ParsedQuestion[]) => {
    const topic = topics.find(t => t.id === topicId);
    const startingOrder = topic?.questions?.length || 0;
    await topicService.insertParsedQuestions(topicId, parsed, startingOrder);
    await fetchTopics(false);
  };

  return {
    topics,
    loading,
    loadError,
    activeType,
    setActiveType,
    filterText,
    setFilterText,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    totalPages,
    filteredTopics,
    pagedTopics,
    selectedTopicIds,
    isAllSelected,
    isSomeSelected,
    toggleSelectTopic,
    selectAllTopics,
    deselectAllTopics,
    toggleSelectAll,
    openBulkDeleteModal,
    expandedTopic,
    setExpandedTopic,
    editingTopic,
    setEditingTopic,
    editTopicTitle,
    setEditTopicTitle,
    editTopicGrades,
    setEditTopicGrades,
    addingTopic,
    setAddingTopic,
    newTopicTitle,
    setNewTopicTitle,
    newTopicGrades,
    setNewTopicGrades,
    addTopicError,
    setAddTopicError,
    editTopicError,
    setEditTopicError,
    filterGrade,
    setFilterGrade,
    saving,
    deleteTarget,
    setDeleteTarget,
    deleteSaving,
    deleteError,
    setDeleteError,
    fetchTopics,
    toggleTopicActive,
    saveTopic,
    addTopic,
    confirmDelete,
    createQuestion,
    updateQuestion,
    addParsedQuestions,
  };
}

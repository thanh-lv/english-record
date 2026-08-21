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
    type: 'topic' | 'question';
    id: string;
    label: string;
  } | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await topicService.fetchAllTopics(teacherId);
      setTopics(data);
    } catch (err) {
      loggerService.error('useTopics', 'Fetch topics error', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

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

  const toggleTopicActive = async (topicId: string, currentValue: boolean) => {
    await topicService.toggleTopicActive(topicId, currentValue);
    setTopics(prev => prev.map(t => (t.id === topicId ? { ...t, is_active: !currentValue } : t)));
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
      fetchTopics();
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
      fetchTopics();
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
      if (deleteTarget.type === 'question') {
        await topicService.deleteQuestion(deleteTarget.id);
      } else {
        await topicService.deleteTopic(deleteTarget.id);
      }
      setDeleteTarget(null);
      await fetchTopics();
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
    fetchTopics();
  };

  const updateQuestion = async (questionId: string, values: any) => {
    await topicService.updateQuestion(questionId, {
      text: values.text,
      translation: values.translation || null,
      sample_answer: values.sample_answer || null,
      target: values.target || null,
      image_url: values.image_url || null,
    });
    fetchTopics();
  };

  const addParsedQuestions = async (topicId: string, parsed: ParsedQuestion[]) => {
    const topic = topics.find(t => t.id === topicId);
    const startingOrder = topic?.questions?.length || 0;
    await topicService.insertParsedQuestions(topicId, parsed, startingOrder);
    fetchTopics();
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
    pagedTopics,
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

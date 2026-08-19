import { useState, useEffect, useCallback, useMemo } from 'react';
import { studentService } from '../../../services/studentService';
import { supabase } from '../../../lib/supabase';
import { calculateStreak } from '../../../utils';
import { UserProfile, StudentStats } from '../../../types';

export function useStudentsManager() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [resetPassStudent, setResetPassStudent] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stData, { data: recData }, { data: topData }] = await Promise.all([
        studentService.fetchStudents(),
        supabase.from('recordings').select('*'),
        supabase.from('topics').select('id, questions(id)').eq('is_active', true),
      ]);

      setStudents(stData || []);
      setRecordings(recData || []);
      setActiveTopics(topData || []);
    } catch (err) {
      console.error('Error fetching students data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateStudentStats = useCallback(
    (studentName: string) => {
      const studentRecs = recordings.filter(
        r => r.student_name.toLowerCase() === studentName.toLowerCase()
      );

      const dates = studentRecs
        .map(r => r.created_at)
        .filter(Boolean)
        .sort();
      const streak = calculateStreak(dates);

      const completedTopicCount = activeTopics.filter(topic => {
        const topicQuestions = topic.questions || [];
        if (topicQuestions.length === 0) {
          return studentRecs.some(r => r.topic_id === topic.id);
        }
        return topicQuestions.every((q: any) =>
          studentRecs.some(r => r.topic_id === topic.id && r.question_id === q.id)
        );
      }).length;

      const totalRecordings = studentRecs.length;

      return {
        streak,
        completedTopics: completedTopicCount,
        totalTopics: activeTopics.length,
        totalRecordings,
      };
    },
    [recordings, activeTopics]
  );

  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesGrade =
        gradeFilter === 'all' ||
        (gradeFilter === 'none' && !st.grade) ||
        st.grade?.toString() === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [students, searchQuery, gradeFilter]);

  const availableGrades = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort(
      (a: any, b: any) => a - b
    );
  }, [students]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await studentService.deleteStudent(deleteTarget.id);
      setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting student:', err);
    } finally {
      setDeleteSaving(false);
    }
  };

  const onStudentCreated = (newStudent: UserProfile) => {
    setStudents(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
  };

  const onStudentUpdated = (updatedStudent: UserProfile) => {
    setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  return {
    students,
    filteredStudents,
    availableGrades,
    loading,
    searchQuery,
    setSearchQuery,
    gradeFilter,
    setGradeFilter,
    calculateStudentStats,
    fetchData,
    // Modals
    showAddModal,
    setShowAddModal,
    editingStudent,
    setEditingStudent,
    resetPassStudent,
    setResetPassStudent,
    deleteTarget,
    setDeleteTarget,
    deleteSaving,
    handleDelete,
    onStudentCreated,
    onStudentUpdated,
  };
}

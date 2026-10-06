import { useState, useEffect, useCallback, useMemo } from 'react';
import { studentService } from '../../../../services/studentService';
import { supabase } from '../../../../lib/supabase';
import { loggerService } from '../../../../services/loggerService';
import { calculateStreak, fetchAllRows } from '../../../../utils';
import { UserProfile, StudentStats } from '../../../../types';
import { useTeacher } from '../../../../contexts/TeacherContext';

const normalizeName = (name?: string | null) => (name || '').trim().toLowerCase();

export function useStudentsManager() {
  const { teacherId } = useTeacher();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [resetPassStudent, setResetPassStudent] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let topQuery = supabase.from('topics').select('id, questions(id)').eq('is_active', true);

      if (teacherId) {
        topQuery = topQuery.eq('teacher_id', teacherId);
      }

      // Page through all recordings: a single select is capped at 1000 rows, which made
      // the per-student statistics silently wrong for larger classes.
      const recQuery = fetchAllRows((from, to) => {
        let query = supabase.from('recordings').select('*');
        if (teacherId) {
          query = query.eq('teacher_id', teacherId);
        }
        return query.order('id').range(from, to);
      }).catch(err => {
        loggerService.error('useStudentsManager', 'Error fetching recordings for stats', err);
        return [];
      });

      const [stData, recData, { data: topData }] = await Promise.all([
        studentService.fetchStudents(teacherId),
        recQuery,
        topQuery,
      ]);

      setStudents(stData || []);
      setRecordings(recData || []);
      setActiveTopics(topData || []);
    } catch (err) {
      loggerService.error('useStudentsManager', 'Error fetching students data', err);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recordingsByStudent = useMemo(() => {
    // Once the student_id migration is applied every row carries the column (null for rows
    // that could not be attributed to a single student); before that, only the name links them.
    const linkedById = recordings.some(r => 'student_id' in r);
    const groups = new Map<string, any[]>();
    for (const rec of recordings) {
      const key = linkedById ? rec.student_id : normalizeName(rec.student_name);
      if (!key) continue;
      const list = groups.get(key);
      if (list) list.push(rec);
      else groups.set(key, [rec]);
    }
    return { linkedById, groups };
  }, [recordings]);

  const calculateStudentStats = useCallback(
    (student: Pick<UserProfile, 'id' | 'name'>): StudentStats => {
      const key = recordingsByStudent.linkedById ? student.id : normalizeName(student.name);
      const studentRecs = recordingsByStudent.groups.get(key) || [];

      const streak = calculateStreak(studentRecs);

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
    [recordingsByStudent, activeTopics]
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
    setDeleteError('');
    try {
      await studentService.deleteStudent(deleteTarget.id);
      setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      loggerService.error('useStudentsManager', 'Error deleting student', err);
      setDeleteError(err.message || 'Lỗi khi xóa học sinh');
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
    deleteError,
    setDeleteError,
    handleDelete,
    onStudentCreated,
    onStudentUpdated,
  };
}

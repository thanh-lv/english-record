import { useState, useEffect, useCallback, useMemo } from 'react';
import { attendanceService } from '../../../../services/attendanceService';
import { loggerService } from '../../../../services/loggerService';
import { AttendanceStudent, AttendanceRecord } from '../../../../types';
import { useTeacher } from '../../../../contexts/TeacherContext';

export function useTuitionSummary(t: any) {
  const { teacherId } = useTeacher();
  const tAtt = t?.attendance || {};

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [generalNote, setGeneralNote] = useState('');
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Class Hoc Lieu Map persisted in localStorage
  const [classHocLieuMap, setClassHocLieuMap] = useState<
    Record<string, { label: string; value: number }>
  >(() => {
    try {
      const saved = localStorage.getItem(
        `english_record_class_hoc_lieu_map_${teacherId || 'default'}`
      );
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleUpdateClassHocLieuMap = (className: string, newLabel?: string, newValue?: number) => {
    const current = classHocLieuMap[className] || {
      label: tAtt.hocLieuSlip || '📚 Học liệu',
      value: 0,
    };
    const updatedLabel = newLabel !== undefined ? newLabel : current.label;
    const updatedValue = newValue !== undefined ? newValue : current.value;

    setClassHocLieuMap(prev => {
      const next = {
        ...prev,
        [className]: { label: updatedLabel, value: updatedValue },
      };
      try {
        localStorage.setItem(
          `english_record_class_hoc_lieu_map_${teacherId || 'default'}`,
          JSON.stringify(next)
        );
      } catch {}
      return next;
    });

    setStudents(prev =>
      prev.map(s =>
        (s.class_name || tAtt.unassignedClass) === className
          ? {
              ...s,
              hoc_lieu_label: updatedLabel,
              hoc_lieu_value: updatedValue,
            }
          : s
      )
    );
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(calYear, calMonth, 1).toISOString();
    const endDate = new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString();

    try {
      const [stData, recData] = await Promise.all([
        attendanceService.fetchAttendanceStudents(teacherId),
        attendanceService.fetchAttendanceRecords(startDate, endDate, teacherId),
      ]);
      setStudents(stData);
      setRecords(recData);
    } catch (err) {
      loggerService.error('useTuitionSummary', 'Error loading tuition data', err);
    } finally {
      setLoading(false);
    }
  }, [calYear, calMonth, teacherId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Payment status map
  const [paymentsMap, setPaymentsMap] = useState<Record<string, boolean>>({});

  const loadPayments = useCallback(async () => {
    try {
      const payments = await attendanceService.fetchAttendancePayments(
        calYear,
        calMonth + 1,
        teacherId
      );
      const map: Record<string, boolean> = {};
      payments.forEach(p => {
        map[p.student_id] = p.is_paid;
      });
      setPaymentsMap(map);
    } catch (err) {
      loggerService.error('useTuitionSummary', 'Error loading payment statuses', err);
    }
  }, [calYear, calMonth, teacherId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const togglePayment = async (studentId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      setPaymentsMap(prev => ({ ...prev, [studentId]: nextStatus }));
      await attendanceService.setPaymentStatus(studentId, calYear, calMonth + 1, nextStatus);
    } catch (err) {
      loggerService.error('useTuitionSummary', 'Error updating payment status', err);
      setPaymentsMap(prev => ({ ...prev, [studentId]: currentStatus }));
    }
  };

  // Student summary calculation
  const studentSummaries = useMemo(() => {
    return students.map(student => {
      const studentRecs = records.filter(r => r.student_id === student.id);
      const sessionsCount = studentRecs.length;
      const unitPrice = Number(student.unit_price) || 0;
      const subtotal = sessionsCount * unitPrice;

      const clsName = student.class_name || tAtt.unassignedClass;
      const classHocLieu = classHocLieuMap[clsName];
      const hocLieuValue =
        classHocLieu && classHocLieu.value > 0
          ? classHocLieu.value
          : Number(student.hoc_lieu_value ?? 0);

      const total = subtotal + hocLieuValue;
      const isPaid = Boolean(paymentsMap[student.id]);

      return {
        ...student,
        sessionsCount,
        subtotal,
        hocLieuValue,
        hocLieuLabel: classHocLieu?.label || tAtt.hocLieuSlip || '📚 Học liệu',
        total,
        isPaid,
        records: studentRecs,
      };
    });
  }, [students, records, classHocLieuMap, paymentsMap, tAtt]);

  const filteredSummaries = useMemo(() => {
    if (filterClass === 'all') return studentSummaries;
    return studentSummaries.filter(s => (s.class_name || tAtt.unassignedClass) === filterClass);
  }, [studentSummaries, filterClass, tAtt.unassignedClass]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.class_name || tAtt.unassignedClass))).sort();
  }, [students, tAtt.unassignedClass]);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else setCalMonth(m => m + 1);
  };

  return {
    records,
    students,
    setStudents,
    loading,
    filterClass,
    setFilterClass,
    calYear,
    setCalYear,
    calMonth,
    setCalMonth,
    prevMonth,
    nextMonth,
    selectedStudent,
    setSelectedStudent,
    generalNote,
    setGeneralNote,
    studentNotes,
    setStudentNotes,
    classHocLieuMap,
    handleUpdateClassHocLieuMap,
    paymentsMap,
    togglePayment,
    studentSummaries,
    filteredSummaries,
    availableClasses,
    loadData,
  };
}

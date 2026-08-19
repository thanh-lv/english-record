import { useState, useEffect, useMemo, useCallback } from 'react';
import { attendanceService } from '../../../services/attendanceService';
import { Student as AttendanceStudent, AttendanceRecord } from '../../../types';

export function useAttendanceCheckin() {
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [filterClass, setFilterClass] = useState('all');

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Modal state
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [checkinHour, setCheckinHour] = useState(String(today.getHours()).padStart(2, '0'));
  const [checkinMinute, setCheckinMinute] = useState(String(today.getMinutes()).padStart(2, '0'));
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    attendanceService.fetchAttendanceStudents().then(data => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  const loadMonthRecords = useCallback(async (year: number, month: number) => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    try {
      const data = await attendanceService.fetchAttendanceRecords(start, end);
      setMonthRecords(data);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    }
  }, []);

  useEffect(() => {
    loadMonthRecords(calYear, calMonth);
  }, [calYear, calMonth, loadMonthRecords]);

  // Calendar cells
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = useMemo(() => {
    const cells: (number | null)[] = [
      ...Array(firstDayOfMonth).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDayOfMonth, daysInMonth]);

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

  const goToToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  };

  const openCheckinForDate = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    const now = new Date();
    const isToday =
      now.getFullYear() === calYear && now.getMonth() === calMonth && now.getDate() === day;

    setModalDate(d);
    setCheckinHour(String(isToday ? now.getHours() : 18).padStart(2, '0'));
    setCheckinMinute(String(isToday ? now.getMinutes() : 0).padStart(2, '0'));
    setSuccess(false);

    // Pre-check students who checked in on this day
    const dayRecords = monthRecords.filter(r => {
      const rd = new Date(r.checkin_time);
      return rd.getFullYear() === calYear && rd.getMonth() === calMonth && rd.getDate() === day;
    });
    setCheckedIds(new Set(dayRecords.map(r => r.student_id)));
  };

  const handleSaveCheckin = async () => {
    if (!modalDate) return;
    setSaving(true);
    try {
      const checkinDate = new Date(modalDate);
      checkinDate.setHours(parseInt(checkinHour, 10), parseInt(checkinMinute, 10), 0, 0);
      const checkinTimeIso = checkinDate.toISOString();

      // Find existing on that day to avoid duplicate
      const dayStart = new Date(
        modalDate.getFullYear(),
        modalDate.getMonth(),
        modalDate.getDate(),
        0,
        0,
        0
      ).toISOString();
      const dayEnd = new Date(
        modalDate.getFullYear(),
        modalDate.getMonth(),
        modalDate.getDate(),
        23,
        59,
        59
      ).toISOString();

      const existingDayRecords = monthRecords.filter(
        r => r.checkin_time >= dayStart && r.checkin_time <= dayEnd
      );
      const existingStudentIds = new Set(existingDayRecords.map(r => r.student_id));

      const toInsert = Array.from(checkedIds)
        .filter(id => !existingStudentIds.has(id))
        .map(student_id => ({ student_id, checkin_time: checkinTimeIso }));

      if (toInsert.length > 0) {
        await attendanceService.saveAttendanceCheckin(toInsert);
      }

      await loadMonthRecords(calYear, calMonth);
      setSuccess(true);
      setTimeout(() => {
        setModalDate(null);
        setSuccess(false);
      }, 1000);
    } catch (err) {
      console.error('Error saving checkin:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCheckin = async (recordId: string) => {
    setDeleting(true);
    try {
      await attendanceService.deleteAttendanceRecord(recordId);
      await loadMonthRecords(calYear, calMonth);
      setDeleteTargetStudent(null);
    } catch (err) {
      console.error('Error deleting checkin record:', err);
    } finally {
      setDeleting(false);
    }
  };

  return {
    students,
    loading,
    monthRecords,
    filterClass,
    setFilterClass,
    calYear,
    calMonth,
    calendarCells,
    prevMonth,
    nextMonth,
    goToToday,
    modalDate,
    setModalDate,
    checkinHour,
    setCheckinHour,
    checkinMinute,
    setCheckinMinute,
    checkedIds,
    setCheckedIds,
    saving,
    success,
    deleteTargetStudent,
    setDeleteTargetStudent,
    deleting,
    openCheckinForDate,
    handleSaveCheckin,
    handleDeleteCheckin,
    loadMonthRecords,
  };
}

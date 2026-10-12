import { useState, useMemo } from 'react';
import { attendanceService } from '../../../services/attendanceService';
import { loggerService } from '../../../services/loggerService';
import { AlertTriangle, Trash2, Clock, CheckCircle2, Loader2, Save, Users } from 'lucide-react';
import { formatClassName, sumSessions } from '../../../utils';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';

interface CheckinDayModalProps {
  /** Ngày đang điểm danh */
  date: Date;
  students: any[];
  monthRecords: any[];
  filterClass: string;
  setFilterClass: (cls: string) => void;
  /** Tải lại các buổi điểm danh của tháng sau khi lưu hoặc hủy */
  onReload: () => Promise<void>;
  onClose: () => void;
}

export function CheckinDayModal({
  date,
  students,
  monthRecords,
  filterClass,
  setFilterClass,
  onReload,
  onClose,
}: CheckinDayModalProps) {
  const { t, lang } = useLanguage();
  const tAtt = t.attendance;
  const tc = t.common;

  // Điểm danh hôm nay thì lấy giờ hiện tại, ngày khác mặc định 08:00
  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();
  const [checkinHour, setCheckinHour] = useState(
    isToday ? String(now.getHours()).padStart(2, '0') : '08'
  );
  const [checkinMinute, setCheckinMinute] = useState(
    isToday ? String(now.getMinutes()).padStart(2, '0') : '00'
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  // Selected students who only attended half a session
  const [halfIds, setHalfIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pre-indexed map for O(1) modal student lookup
  const dayRecordsByStudentId = useMemo(() => {
    const map = new Map<string, any[]>();
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();

    monthRecords.forEach(r => {
      const rd = new Date(r.checkin_time);
      if (rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d) {
        const existing = map.get(r.student_id) || [];
        existing.push(r);
        map.set(r.student_id, existing);
      }
    });

    return map;
  }, [monthRecords, date]);

  // Get existing records on date for a student (O(1) lookup)
  const getStudentDayRecords = (studentId: string) => dayRecordsByStudentId.get(studentId) || [];

  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.class_name || tAtt.unassignedClass))).sort();
  }, [students, tAtt.unassignedClass]);

  const filteredStudents = useMemo(() => {
    if (filterClass === 'all') return students;
    return students.filter(s => (s.class_name || tAtt.unassignedClass) === filterClass);
  }, [students, filterClass, tAtt.unassignedClass]);

  const handleToggle = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) {
      next.delete(id);
      setStudentHalf(id, false);
    } else next.add(id);
    setCheckedIds(next);
  };
  const setStudentHalf = (id: string, isHalf: boolean) => {
    setHalfIds(prev => {
      const next = new Set(prev);
      if (isHalf) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const handleSelectAll = () => {
    if (filteredStudents.every(s => checkedIds.has(s.id))) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const confirmDeleteCheckin = async () => {
    if (!deleteTargetStudent) return;
    setDeleting(true);
    const d = date;
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
    try {
      await attendanceService.deleteStudentDayAttendance(
        deleteTargetStudent.id,
        startOfDay,
        endOfDay
      );
      await onReload();
      setDeleteTargetStudent(null);
    } catch (err) {
      loggerService.error('CheckinTab', 'Error deleting checkin', err);
      alert(tAtt.cancelCheckinError || 'Lỗi khi hủy điểm danh.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCheckin = async () => {
    if (checkedIds.size === 0) return;
    setSaving(true);
    setSuccess(false);
    try {
      const d = date;
      const timestamp = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        parseInt(checkinHour),
        parseInt(checkinMinute)
      ).toISOString();
      const recs = Array.from(checkedIds).map(student_id => ({
        student_id,
        checkin_time: timestamp,
        session_value: halfIds.has(student_id) ? 0.5 : 1,
      }));
      await attendanceService.saveAttendanceCheckin(recs);
      setSuccess(true);
      setCheckedIds(new Set());
      setHalfIds(new Set());
      await onReload();
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      loggerService.error('CheckinTab', 'Error saving checkin', err);
      alert(tAtt.saveCheckinError || 'Lỗi khi lưu. Có thể đã tồn tại record cho thời điểm này.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(-2)
      .join('')
      .toUpperCase();
  const checkedCount = checkedIds.size;
  const selectedSessionTotal = Array.from(checkedIds).reduce(
    (sum, id) => sum + (halfIds.has(id) ? 0.5 : 1),
    0
  );
  const studentsWithCheckinCount = filteredStudents.filter(
    s => getStudentDayRecords(s.id).length > 0
  ).length;

  // Group students by class for modal display
  const studentsByClass = useMemo(() => {
    const grouped: Record<string, typeof filteredStudents> = {};
    filteredStudents.forEach(s => {
      const cls = formatClassName(
        s.class_name,
        tAtt.unassignedClass || 'Chưa phân lớp',
        tAtt.className ? tAtt.className + ' ' : 'Lớp '
      );
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(s);
    });
    return grouped;
  }, [filteredStudents, tAtt.unassignedClass, tAtt.className]);

  const modalDateLabel = date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <>
      <div className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overscroll-contain">
        <div className="bg-white w-full max-w-2xl rounded-lg shadow-md flex flex-col max-h-[90vh]">
          {/* Modal header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-lg flex items-start justify-between shrink-0">
            <div>
              <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">
                {tAtt.attendance || 'Điểm danh'}
              </p>
              <h2 className="font-black text-white text-lg capitalize mt-0.5">{modalDateLabel}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-200 hover:text-white text-2xl font-black leading-none ml-4 mt-0.5"
            >
              ✕
            </button>
          </div>

          {/* Time + class filter */}
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-4 shrink-0 bg-slate-50">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-emerald-700 shrink-0" />
              <label className="text-xs font-black text-slate-600 uppercase">
                {tAtt.timeCheckin}:
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={checkinHour}
                  onChange={e => setCheckinHour(e.target.value.padStart(2, '0').slice(-2))}
                  className="w-12 px-1.5 py-1 border border-slate-300 rounded-lg text-center font-black text-slate-700 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                />
                <span className="font-black text-emerald-700">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={checkinMinute}
                  onChange={e => setCheckinMinute(e.target.value.padStart(2, '0').slice(-2))}
                  className="w-12 px-1.5 py-1 border border-slate-300 rounded-lg text-center font-black text-slate-700 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-500" />
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg bg-white font-bold text-slate-700 text-sm focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">{tAtt.allClasses}</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>
                    {formatClassName(
                      c,
                      tAtt.unassignedClass,
                      tAtt.className ? tAtt.className + ' ' : 'Lớp '
                    )}
                  </option>
                ))}
              </select>
            </div>

            {filteredStudents.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="ml-auto text-sm font-black text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-lg border border-transparent hover:border-emerald-200 transition-colors"
              >
                {filteredStudents.length > 0 && filteredStudents.every(s => checkedIds.has(s.id))
                  ? tAtt.deselectAll
                  : tAtt.selectAll}
              </button>
            )}
          </div>

          {/* Progress bar */}
          {filteredStudents.length > 0 && (
            <div className="px-5 py-2.5 shrink-0 border-b border-slate-100">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>
                  {interpolate(
                    tAtt.checkinStatus || '{checked} / {total} học sinh đã có điểm danh ngày này',
                    {
                      checked: studentsWithCheckinCount,
                      total: filteredStudents.length,
                    }
                  )}
                </span>
                {checkedCount > 0 && (
                  <span className="text-emerald-600 font-black">
                    {interpolate(tAtt.selectingSessions || '+ Đang chọn thêm {count} buổi', {
                      count: selectedSessionTotal,
                    })}
                  </span>
                )}
              </div>
              <div className="flex gap-3 mt-1.5 text-xs font-bold">
                {studentsWithCheckinCount > 0 && (
                  <span className="text-emerald-600">
                    {interpolate(tAtt.checkedInCount || '✓ {count} đã điểm danh', {
                      count: studentsWithCheckinCount,
                    })}
                  </span>
                )}
                {checkedCount > 0 && (
                  <span className="text-blue-600">
                    {interpolate(tAtt.selectingCount || '● {count} đang chọn', {
                      count: checkedCount,
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Student grid grouped by class */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {students.length === 0 ? (
              <p className="text-center text-slate-400 font-bold py-8">{tAtt.noStudents}</p>
            ) : (
              Object.entries(studentsByClass).map(([clsName, classStudents]) => {
                const classDoneCount = classStudents.filter(
                  s => getStudentDayRecords(s.id).length > 0
                ).length;

                return (
                  <div key={clsName} className="space-y-2">
                    {/* Class Section Header */}
                    <div className="bg-slate-100/90 px-3 py-1.5 rounded-xl flex justify-between items-center border border-slate-200/80 sticky top-0 backdrop-blur-md z-10 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-purple-600" />
                        <span className="font-black text-slate-800 text-xs sm:text-sm">
                          {formatClassName(
                            clsName,
                            tAtt.unassignedClass,
                            tAtt.className ? tAtt.className + ' ' : 'Lớp '
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {classStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const allSelected = classStudents.every(s => checkedIds.has(s.id));
                              const next = new Set(checkedIds);
                              if (allSelected) {
                                classStudents.forEach(s => next.delete(s.id));
                              } else {
                                classStudents.forEach(s => next.add(s.id));
                              }
                              setCheckedIds(next);
                            }}
                            className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 active:scale-95 ${
                              classStudents.every(s => checkedIds.has(s.id))
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={classStudents.every(s => checkedIds.has(s.id))}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer pointer-events-none"
                            />
                            <span>
                              {classStudents.every(s => checkedIds.has(s.id))
                                ? tAtt.classSelectedAll || 'Đã chọn cả lớp'
                                : tAtt.classSelectAll || 'Chọn cả lớp'}
                            </span>
                          </button>
                        )}
                        <span className="text-xs font-bold text-slate-500">
                          {interpolate(tAtt.classCheckedInRatio || '{checked}/{total} đã DD', {
                            checked: classDoneCount,
                            total: classStudents.length,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Student Cards Grid for this class */}
                    <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                      {classStudents.map(student => {
                        const isChecked = checkedIds.has(student.id);
                        const existingRecs = getStudentDayRecords(student.id);
                        const existingCount = existingRecs.length;
                        const isHalf = halfIds.has(student.id);
                        const ini = initials(student.name);

                        return (
                          <div
                            key={student.id}
                            className={`flex flex-col items-center p-2.5 rounded-lg border-2 transition-all text-center gap-1.5 relative shadow-sm ${
                              isChecked
                                ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-300'
                                : existingCount > 0
                                  ? 'border-emerald-300 bg-emerald-50/70'
                                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                            }`}
                          >
                            {existingCount > 0 && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setDeleteTargetStudent(student);
                                }}
                                className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-all z-10 active:scale-95"
                                title={tAtt.cancelCheckinTooltip || 'Hủy điểm danh ngày này'}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggle(student.id)}
                              className="w-full flex flex-col items-center gap-1.5"
                            >
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm transition-colors ${
                                  isChecked
                                    ? 'bg-emerald-500 text-white'
                                    : existingCount > 0
                                      ? 'bg-emerald-200 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {ini}
                              </div>
                              <p
                                className={`font-black text-xs leading-tight line-clamp-2 ${
                                  isChecked
                                    ? 'text-emerald-700'
                                    : existingCount > 0
                                      ? 'text-emerald-900'
                                      : 'text-slate-700'
                                }`}
                              >
                                {student.name}
                              </p>

                              {/* Badges */}
                              {existingCount > 0 && !isChecked && (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-200/80 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                  <CheckCircle2 size={10} />{' '}
                                  {interpolate(
                                    tAtt.alreadyCheckedInCount || 'Đã DD ({count} buổi)',
                                    { count: sumSessions(existingRecs) }
                                  )}
                                </span>
                              )}
                              {isChecked && (
                                <span className="text-[10px] font-black text-white bg-emerald-600 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                                  <CheckCircle2 size={10} />{' '}
                                  {isHalf
                                    ? tAtt.addHalfSession || '+ Thêm ½ buổi'
                                    : tAtt.addOneSession || '+ Thêm 1 buổi'}
                                </span>
                              )}
                            </button>

                            {/* Full / half session switch */}
                            {isChecked && (
                              <div className="flex w-full rounded-lg border border-emerald-300 overflow-hidden text-[10px] font-black">
                                {[false, true].map(half => (
                                  <button
                                    key={String(half)}
                                    type="button"
                                    onClick={() => setStudentHalf(student.id, half)}
                                    className={`flex-1 py-1 transition-colors ${
                                      isHalf === half
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {half
                                      ? tAtt.halfSessionOption || '½ buổi'
                                      : tAtt.fullSessionOption || '1 buổi'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal footer */}
          <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-3 bg-white shrink-0 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {tAtt.close || 'Đóng'}
            </button>
            <div className="flex-1" />
            {success && (
              <div className="flex items-center gap-1.5 text-emerald-700 font-black text-sm bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                <CheckCircle2 size={15} /> {tAtt.checkinSaved}
              </div>
            )}
            <button
              onClick={handleSaveCheckin}
              disabled={saving || checkedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-lg transition-all shadow-md active:scale-95"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              {tAtt.saveCheckin} {checkedIds.size > 0 && `(${checkedIds.size})`}
            </button>
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteTargetStudent && (
        <div className="!m-0 fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overscroll-contain">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base sm:text-lg">
                {tAtt.cancelCheckinConfirmTitle || 'Xác nhận hủy điểm danh'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {interpolate(
                  tAtt.cancelCheckinConfirmDesc ||
                    'Bạn có chắc chắn muốn hủy điểm danh của học sinh {name} vào {date} không?',
                  {
                    name: deleteTargetStudent.name,
                    date: modalDateLabel,
                  }
                )}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                {tc.cancel || 'Hủy bỏ'}
              </button>
              <button
                onClick={confirmDeleteCheckin}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {tAtt.cancelCheckinBtn || 'Hủy điểm danh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

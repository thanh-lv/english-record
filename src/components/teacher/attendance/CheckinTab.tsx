import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import {
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  CheckCircle2,
  Loader2,
  Save,
  Users,
} from "lucide-react";

export function CheckinTab({ tAtt }: { tAtt: any }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthRecords, setMonthRecords] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState("all");

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Modal state
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [checkinHour, setCheckinHour] = useState(
    String(today.getHours()).padStart(2, "0"),
  );
  const [checkinMinute, setCheckinMinute] = useState(
    String(today.getMinutes()).padStart(2, "0"),
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<any | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase
      .from("attendance_students")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setStudents(data);
        setLoading(false);
      });
  }, []);

  const loadMonthRecords = async (year: number, month: number) => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const { data } = await supabase
      .from("attendance_records")
      .select("student_id, checkin_time")
      .gte("checkin_time", start)
      .lte("checkin_time", end);
    if (data) setMonthRecords(data);
  };

  useEffect(() => {
    loadMonthRecords(calYear, calMonth);
  }, [calYear, calMonth]);

  // Calendar math
  const DAYS_OF_WEEK = tAtt.daysOfWeek;
  const MONTH_NAMES = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  // Records grouped by day number
  const recordsByDay: Record<number, string[]> = {};
  monthRecords.forEach((r) => {
    const d = new Date(r.checkin_time).getDate();
    if (!recordsByDay[d]) recordsByDay[d] = [];
    if (!recordsByDay[d].includes(r.student_id))
      recordsByDay[d].push(r.student_id);
  });

  const isToday = (day: number) =>
    today.getFullYear() === calYear &&
    today.getMonth() === calMonth &&
    today.getDate() === day;

  const openModal = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    setModalDate(d);
    setCheckedIds(new Set());
    setSuccess(false);
    if (isToday(day)) {
      setCheckinHour(String(today.getHours()).padStart(2, "0"));
      setCheckinMinute(String(today.getMinutes()).padStart(2, "0"));
    } else {
      setCheckinHour("08");
      setCheckinMinute("00");
    }
  };
  const closeModal = () => {
    setModalDate(null);
    setCheckedIds(new Set());
    setSuccess(false);
  };

  // Modal: students already checked in on modalDate
  const alreadyCheckedInIds: Set<string> = modalDate
    ? new Set(
        monthRecords
          .filter((r) => {
            const d = new Date(r.checkin_time);
            return (
              modalDate &&
              d.getFullYear() === modalDate.getFullYear() &&
              d.getMonth() === modalDate.getMonth() &&
              d.getDate() === modalDate.getDate()
            );
          })
          .map((r) => r.student_id),
      )
    : new Set<string>();

  const availableClasses = Array.from(
    new Set(students.map((s) => s.class_name || tAtt.unassignedClass)),
  ).sort();
  const filteredStudents =
    filterClass === "all"
      ? students
      : students.filter(
          (s) => (s.class_name || tAtt.unassignedClass) === filterClass,
        );
  const pendingStudents = filteredStudents.filter(
    (s) => !alreadyCheckedInIds.has(s.id),
  );
  const doneStudents = filteredStudents.filter((s) =>
    alreadyCheckedInIds.has(s.id),
  );

  const handleToggle = (id: string) => {
    if (alreadyCheckedInIds.has(id)) return;
    const next = new Set(checkedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIds(next);
  };
  const handleSelectAll = () => {
    if (pendingStudents.every((s) => checkedIds.has(s.id))) {
      const next = new Set(checkedIds);
      pendingStudents.forEach((s) => next.delete(s.id));
      setCheckedIds(next);
    } else {
      const next = new Set(checkedIds);
      pendingStudents.forEach((s) => next.add(s.id));
      setCheckedIds(next);
    }
  };

  const confirmDeleteCheckin = async () => {
    if (!deleteTargetStudent || !modalDate) return;
    setDeleting(true);
    const d = modalDate;
    const startOfDay = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
    ).toISOString();
    const endOfDay = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
    ).toISOString();
    try {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("student_id", deleteTargetStudent.id)
        .gte("checkin_time", startOfDay)
        .lte("checkin_time", endOfDay);
      if (error) throw error;
      await loadMonthRecords(calYear, calMonth);
      setDeleteTargetStudent(null);
    } catch (err) {
      console.error("Error deleting checkin:", err);
      alert("Lỗi khi hủy điểm danh.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCheckin = async () => {
    if (checkedIds.size === 0 || !modalDate) return;
    setSaving(true);
    setSuccess(false);
    try {
      const d = modalDate;
      const timestamp = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        parseInt(checkinHour),
        parseInt(checkinMinute),
      ).toISOString();
      const recs = Array.from(checkedIds).map((student_id) => ({
        student_id,
        checkin_time: timestamp,
        status: "present",
      }));
      const { error } = await supabase.from("attendance_records").insert(recs);
      if (error) throw error;
      setSuccess(true);
      setCheckedIds(new Set());
      await loadMonthRecords(calYear, calMonth);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu. Có thể đã tồn tại record cho thời điểm này.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(-2)
      .join("")
      .toUpperCase();
  const checkedCount = checkedIds.size;
  const allDoneForDay =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => alreadyCheckedInIds.has(s.id));
  const progressPct =
    filteredStudents.length > 0
      ? Math.round(
          ((doneStudents.length + checkedCount) / filteredStudents.length) *
            100,
        )
      : 0;
  const allPendingSelected =
    pendingStudents.length > 0 &&
    pendingStudents.every((s) => checkedIds.has(s.id));

  // Group students by class for modal display
  const studentsByClass: Record<string, typeof filteredStudents> = {};
  filteredStudents.forEach((s) => {
    const cls = s.class_name || tAtt.unassignedClass || "Chưa phân lớp";
    if (!studentsByClass[cls]) studentsByClass[cls] = [];
    studentsByClass[cls].push(s);
  });

  const modalDateLabel =
    modalDate?.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) ?? "";

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* ── Calendar header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-slate-800 min-w-[160px] text-center">
            {MONTH_NAMES[calMonth]} {calYear}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button
          onClick={() => {
            setCalYear(today.getFullYear());
            setCalMonth(today.getMonth());
            openModal(today.getDate());
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-lg transition-colors shadow"
        >
          <CalendarDays size={15} />
          {tAtt.today}
        </button>
      </div>

      {/* ── Full calendar grid ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={`text-center text-sm font-black py-3 uppercase tracking-wide ${i === 0 ? "text-rose-500" : "text-slate-500"}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarCells.map((day, idx) => {
            if (!day)
              return (
                <div
                  key={`blank-${idx}`}
                  className="min-h-[72px] sm:min-h-[90px] bg-slate-50/60"
                />
              );
            const tod = isToday(day);
            const attendedIds = recordsByDay[day] || [];
            const count = attendedIds.length;
            const isSunday = idx % 7 === 0;
            const isFuture = new Date(calYear, calMonth, day) > today;
            return (
              <button
                key={day}
                onClick={() => !isFuture && openModal(day)}
                disabled={isFuture}
                className={`min-h-[72px] sm:min-h-[90px] p-1.5 sm:p-2 flex flex-col items-start gap-1 text-left transition-all
                  ${isFuture ? "opacity-30 cursor-not-allowed bg-white" : tod ? "bg-emerald-50 hover:bg-emerald-100 cursor-pointer" : "hover:bg-slate-50 cursor-pointer"}
                `}
              >
                {/* Day number */}
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-xs sm:text-sm font-black flex-shrink-0
                  ${tod ? "bg-emerald-500 text-white" : isSunday ? "text-rose-500" : "text-slate-700"}
                `}
                >
                  {day}
                </span>

                {/* Attendance badge */}
                {count > 0 && (
                  <span
                    className={`text-xs font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 leading-tight
                    ${tod ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700"}
                  `}
                  >
                    <CheckCircle2 size={9} />
                    <span className="hidden sm:inline">{count} hs</span>
                    <span className="sm:hidden">{count}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-lg bg-emerald-500 inline-flex items-center justify-center text-white text-xs">
            •
          </span>{" "}
          {tAtt.today}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black">
            ✓ N
          </span>{" "}
          {tAtt.hasCheckin}
        </span>
        <span className="text-rose-400 flex items-center gap-1">
          {tAtt.sunSunday}
        </span>
        <span className="text-slate-300">{tAtt.fadedFutureDate}</span>
      </div>

      {/* ── Day Detail Modal ── */}
      {modalDate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-md flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-lg flex items-start justify-between shrink-0">
              <div>
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">
                  Điểm danh
                </p>
                <h2 className="font-black text-white text-lg capitalize mt-0.5">
                  {modalDateLabel}
                </h2>
              </div>
              <button
                onClick={closeModal}
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
                    onChange={(e) =>
                      setCheckinHour(e.target.value.padStart(2, "0").slice(-2))
                    }
                    className="w-12 px-1.5 py-1 border border-slate-300 rounded-lg text-center font-black text-slate-700 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="font-black text-emerald-700">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={checkinMinute}
                    onChange={(e) =>
                      setCheckinMinute(
                        e.target.value.padStart(2, "0").slice(-2),
                      )
                    }
                    className="w-12 px-1.5 py-1 border border-slate-300 rounded-lg text-center font-black text-slate-700 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-500" />
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded-lg bg-white font-bold text-slate-700 text-sm focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="all">{tAtt.allClasses}</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {pendingStudents.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="ml-auto text-sm font-black text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-lg border border-transparent hover:border-emerald-200 transition-colors"
                >
                  {allPendingSelected ? tAtt.deselectAll : tAtt.selectAll}
                </button>
              )}
            </div>

            {/* Progress bar */}
            {filteredStudents.length > 0 && (
              <div className="px-5 py-2.5 shrink-0 border-b border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                  <span>
                    {doneStudents.length + checkedCount} /{" "}
                    {tAtt.studentCount.replace(
                      "{count}",
                      filteredStudents.length.toString(),
                    )}
                  </span>
                  <span className="text-emerald-600 font-black">
                    {progressPct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-lg transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex gap-3 mt-1.5 text-xs font-bold">
                  {doneStudents.length > 0 && (
                    <span className="text-emerald-600">
                      {tAtt.checkedInCount.replace(
                        "{count}",
                        doneStudents.length.toString(),
                      )}
                    </span>
                  )}
                  {checkedCount > 0 && (
                    <span className="text-blue-600">
                      {tAtt.selectingCount.replace(
                        "{count}",
                        checkedCount.toString(),
                      )}
                    </span>
                  )}
                  {pendingStudents.length - checkedCount > 0 && (
                    <span className="text-slate-400">
                      {tAtt.unselectedCount.replace(
                        "{count}",
                        (pendingStudents.length - checkedCount).toString(),
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Student grid grouped by class */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {students.length === 0 ? (
                <p className="text-center text-slate-400 font-bold py-8">
                  {tAtt.noStudents}
                </p>
              ) : (
                Object.entries(studentsByClass).map(
                  ([clsName, classStudents]) => {
                    const classPending = classStudents.filter(
                      (s) => !alreadyCheckedInIds.has(s.id),
                    );
                    const classDone = classStudents.filter((s) =>
                      alreadyCheckedInIds.has(s.id),
                    );

                    return (
                      <div key={clsName} className="space-y-2">
                        {/* Class Section Header */}
                        <div className="bg-slate-100/90 px-3 py-1.5 rounded-xl flex justify-between items-center border border-slate-200/80 sticky top-0 backdrop-blur-md z-10 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-purple-600" />
                            <span className="font-black text-slate-800 text-xs sm:text-sm">
                              {clsName}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            {classDone.length}/{classStudents.length} đã DD
                          </span>
                        </div>

                        {/* Student Cards Grid for this class */}
                        <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {/* Pending Students */}
                          {classPending.map((student) => {
                            const isChecked = checkedIds.has(student.id);
                            const ini = initials(student.name);
                            return (
                              <button
                                key={student.id}
                                onClick={() => handleToggle(student.id)}
                                className={`flex flex-col items-center p-2.5 rounded-lg border-2 transition-all text-center gap-1.5 active:scale-95 ${
                                  isChecked
                                    ? "border-emerald-500 bg-emerald-50 shadow-md"
                                    : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"
                                }`}
                              >
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm transition-colors ${
                                    isChecked
                                      ? "bg-emerald-500 text-white"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {ini}
                                </div>
                                <p
                                  className={`font-black text-xs leading-tight line-clamp-2 ${
                                    isChecked
                                      ? "text-emerald-700"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {student.name}
                                </p>
                                {isChecked && (
                                  <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                    <CheckCircle2 size={10} /> Chọn
                                  </span>
                                )}
                              </button>
                            );
                          })}

                          {/* Done Students */}
                          {classDone.map((student) => {
                            const ini = initials(student.name);
                            return (
                              <div
                                key={student.id}
                                className="flex flex-col items-center p-2.5 rounded-lg border-2 border-emerald-300 bg-emerald-50 text-center gap-1.5 relative group shadow-sm"
                              >
                                <button
                                  onClick={() =>
                                    setDeleteTargetStudent(student)
                                  }
                                  className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-all z-10 active:scale-95"
                                  title="Hủy điểm danh"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm bg-emerald-200 text-emerald-800">
                                  {ini}
                                </div>
                                <p className="font-black text-xs leading-tight text-emerald-900 line-clamp-2">
                                  {student.name}
                                </p>
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-200/80 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                  <CheckCircle2 size={10} /> Đã DD
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>

            {/* Modal footer */}
            <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-3 bg-white shrink-0 rounded-b-lg">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Đóng
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
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                {tAtt.saveCheckin}{" "}
                {checkedIds.size > 0 && `(${checkedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetStudent && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base sm:text-lg">
                Xác nhận hủy điểm danh
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Bạn có chắc chắn muốn hủy điểm danh của học sinh{" "}
                <strong className="text-slate-800">
                  {deleteTargetStudent.name}
                </strong>{" "}
                vào{" "}
                <strong className="text-emerald-700">{modalDateLabel}</strong>{" "}
                không?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDeleteCheckin}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                {deleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Hủy điểm danh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
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
import { formatClassName, useBodyScrollLock } from "../../../utils";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";

export function CheckinTab() {
  const { t, lang } = useLanguage();
  const tAtt = t.attendance;
  const tc = t.common;
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

  // Lock body scroll when any modal is open
  useBodyScrollLock(Boolean(modalDate || deleteTargetStudent));

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
      .select("id, student_id, checkin_time")
      .gte("checkin_time", start)
      .lte("checkin_time", end);
    if (data) setMonthRecords(data);
  };

  useEffect(() => {
    loadMonthRecords(calYear, calMonth);
  }, [calYear, calMonth]);

  // Calendar math
  const DAYS_OF_WEEK = tAtt.daysOfWeek;
  const MONTH_NAMES = tAtt.monthNames || [
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
    ...Array.from({ length: daysInMonth }, (_: any, i: number) => i + 1),
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

  const studentMap = useMemo(() => {
    const map: Record<string, any> = {};
    students.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  // Records count and revenue per day number
  const recordsCountByDay: Record<number, number> = {};
  const revenueByDay: Record<number, number> = {};
  let totalMonthRevenue = 0;

  monthRecords.forEach((r) => {
    const d = new Date(r.checkin_time).getDate();
    recordsCountByDay[d] = (recordsCountByDay[d] || 0) + 1;
    const price = Number(studentMap[r.student_id]?.unit_price || 0);
    revenueByDay[d] = (revenueByDay[d] || 0) + price;
    totalMonthRevenue += price;
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

  // Get existing records on modalDate for a student
  const getStudentDayRecords = (studentId: string) => {
    if (!modalDate) return [];
    return monthRecords.filter((r) => {
      const d = new Date(r.checkin_time);
      return (
        d.getFullYear() === modalDate.getFullYear() &&
        d.getMonth() === modalDate.getMonth() &&
        d.getDate() === modalDate.getDate() &&
        r.student_id === studentId
      );
    });
  };

  const availableClasses = Array.from(
    new Set(students.map((s) => s.class_name || tAtt.unassignedClass)),
  ).sort();
  const filteredStudents =
    filterClass === "all"
      ? students
      : students.filter(
          (s) => (s.class_name || tAtt.unassignedClass) === filterClass,
        );

  const handleToggle = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIds(next);
  };
  const handleSelectAll = () => {
    if (filteredStudents.every((s) => checkedIds.has(s.id))) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredStudents.map((s) => s.id)));
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
      alert(tAtt.cancelCheckinError || "Lỗi khi hủy điểm danh.");
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
      alert(
        tAtt.saveCheckinError ||
          "Lỗi khi lưu. Có thể đã tồn tại record cho thời điểm này.",
      );
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
  const studentsWithCheckinCount = modalDate
    ? filteredStudents.filter((s) => getStudentDayRecords(s.id).length > 0)
        .length
    : 0;

  // Group students by class for modal display
  const studentsByClass: Record<string, typeof filteredStudents> = {};
  filteredStudents.forEach((s) => {
    const cls = formatClassName(
      s.class_name,
      tAtt.unassignedClass || "Chưa phân lớp",
      tAtt.className ? tAtt.className + " " : "Lớp ",
    );
    if (!studentsByClass[cls]) studentsByClass[cls] = [];
    studentsByClass[cls].push(s);
  });

  const modalDateLabel =
    modalDate?.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
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
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-800 min-w-[160px]">
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            {totalMonthRevenue > 0 && (
              <p className="text-xs font-black text-emerald-600 mt-0.5">
                {interpolate(
                  tAtt.monthSummaryExpected ||
                    "Tổng ngày: {sessions} buổi · Dự kiến: {amount}",
                  {
                    sessions: monthRecords.length,
                    amount: interpolate(tAtt.currencyVnd || "{amount} đ", {
                      amount: totalMonthRevenue.toLocaleString(),
                    }),
                  },
                )}
              </p>
            )}
          </div>
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
          {DAYS_OF_WEEK.map((d: string, i: number) => (
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
                  className="min-h-[80px] sm:min-h-[100px] bg-slate-50/60"
                />
              );
            const tod = isToday(day);
            const count = recordsCountByDay[day] || 0;
            const revenue = revenueByDay[day] || 0;
            const isSunday = idx % 7 === 0;
            return (
              <button
                key={day}
                onClick={() => openModal(day)}
                className={`min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 flex flex-col justify-between items-start text-left transition-all
                  ${tod ? "bg-emerald-50/80 hover:bg-emerald-100/80 cursor-pointer" : "hover:bg-slate-50 cursor-pointer"}
                `}
              >
                {/* Day number */}
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-xs sm:text-sm font-black flex-shrink-0
                  ${tod ? "bg-emerald-500 text-white shadow-sm" : isSunday ? "text-rose-500" : "text-slate-700"}
                `}
                >
                  {day}
                </span>

                {/* Attendance & Revenue Badges */}
                {count > 0 && (
                  <div className="flex flex-col gap-1 w-full mt-1">
                    {/* Số buổi */}
                    <span
                      className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 leading-tight w-fit
                      ${tod ? "bg-emerald-200 text-emerald-900" : "bg-emerald-100 text-emerald-800"}
                    `}
                    >
                      <CheckCircle2 size={9} />
                      <span className="hidden sm:inline">
                        {interpolate(tAtt.sessionCount || "{count} buổi", {
                          count,
                        })}
                      </span>
                      <span className="sm:hidden">{count}b</span>
                    </span>

                    {/* Doanh thu ngày */}
                    {revenue > 0 && (
                      <span className="text-[9px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200/80 leading-tight w-fit flex items-center gap-0.5">
                        <span className="hidden sm:inline">
                          {interpolate(tAtt.currencyVnd || "{amount} đ", {
                            amount: `+${revenue.toLocaleString()}`,
                          })}
                        </span>
                        <span className="sm:hidden">
                          +
                          {revenue >= 1000000
                            ? `${(revenue / 1000000).toFixed(1)}tr`
                            : `${Math.round(revenue / 1000)}k`}
                        </span>
                      </span>
                    )}
                  </div>
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
        <div className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overscroll-contain">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-md flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-lg flex items-start justify-between shrink-0">
              <div>
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">
                  {tAtt.attendance || "Điểm danh"}
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
                      {formatClassName(
                        c,
                        tAtt.unassignedClass,
                        tAtt.className ? tAtt.className + " " : "Lớp ",
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
                  {filteredStudents.length > 0 &&
                  filteredStudents.every((s) => checkedIds.has(s.id))
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
                      tAtt.checkinStatus ||
                        "{checked} / {total} học sinh đã có điểm danh ngày này",
                      {
                        checked: studentsWithCheckinCount,
                        total: filteredStudents.length,
                      },
                    )}
                  </span>
                  {checkedCount > 0 && (
                    <span className="text-emerald-600 font-black">
                      {interpolate(
                        tAtt.selectingSessions ||
                          "+ Đang chọn thêm {count} buổi",
                        { count: checkedCount },
                      )}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-1.5 text-xs font-bold">
                  {studentsWithCheckinCount > 0 && (
                    <span className="text-emerald-600">
                      {interpolate(
                        tAtt.checkedInCount || "✓ {count} đã điểm danh",
                        { count: studentsWithCheckinCount },
                      )}
                    </span>
                  )}
                  {checkedCount > 0 && (
                    <span className="text-blue-600">
                      {interpolate(
                        tAtt.selectingCount || "● {count} đang chọn",
                        { count: checkedCount },
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
                    const classDoneCount = classStudents.filter(
                      (s) => getStudentDayRecords(s.id).length > 0,
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
                                tAtt.className ? tAtt.className + " " : "Lớp ",
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {classStudents.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const allSelected = classStudents.every((s) =>
                                    checkedIds.has(s.id),
                                  );
                                  const next = new Set(checkedIds);
                                  if (allSelected) {
                                    classStudents.forEach((s) =>
                                      next.delete(s.id),
                                    );
                                  } else {
                                    classStudents.forEach((s) =>
                                      next.add(s.id),
                                    );
                                  }
                                  setCheckedIds(next);
                                }}
                                className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 active:scale-95 ${
                                  classStudents.every((s) =>
                                    checkedIds.has(s.id),
                                  )
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                    : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={classStudents.every((s) =>
                                    checkedIds.has(s.id),
                                  )}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer pointer-events-none"
                                />
                                <span>
                                  {classStudents.every((s) =>
                                    checkedIds.has(s.id),
                                  )
                                    ? tAtt.classSelectedAll || "Đã chọn cả lớp"
                                    : tAtt.classSelectAll || "Chọn cả lớp"}
                                </span>
                              </button>
                            )}
                            <span className="text-xs font-bold text-slate-500">
                              {interpolate(
                                tAtt.classCheckedInRatio ||
                                  "{checked}/{total} đã DD",
                                {
                                  checked: classDoneCount,
                                  total: classStudents.length,
                                },
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Student Cards Grid for this class */}
                        <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {classStudents.map((student) => {
                            const isChecked = checkedIds.has(student.id);
                            const existingRecs = getStudentDayRecords(
                              student.id,
                            );
                            const existingCount = existingRecs.length;
                            const ini = initials(student.name);

                            return (
                              <div
                                key={student.id}
                                className={`flex flex-col items-center p-2.5 rounded-lg border-2 transition-all text-center gap-1.5 relative shadow-sm ${
                                  isChecked
                                    ? "border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-300"
                                    : existingCount > 0
                                      ? "border-emerald-300 bg-emerald-50/70"
                                      : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"
                                }`}
                              >
                                {existingCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTargetStudent(student);
                                    }}
                                    className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-all z-10 active:scale-95"
                                    title={
                                      tAtt.cancelCheckinTooltip ||
                                      "Hủy điểm danh ngày này"
                                    }
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
                                        ? "bg-emerald-500 text-white"
                                        : existingCount > 0
                                          ? "bg-emerald-200 text-emerald-800"
                                          : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {ini}
                                  </div>
                                  <p
                                    className={`font-black text-xs leading-tight line-clamp-2 ${
                                      isChecked
                                        ? "text-emerald-700"
                                        : existingCount > 0
                                          ? "text-emerald-900"
                                          : "text-slate-700"
                                    }`}
                                  >
                                    {student.name}
                                  </p>

                                  {/* Badges */}
                                  {existingCount > 0 && !isChecked && (
                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-200/80 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                      <CheckCircle2 size={10} />{" "}
                                      {interpolate(
                                        tAtt.alreadyCheckedInCount ||
                                          "Đã DD ({count} buổi)",
                                        { count: existingCount },
                                      )}
                                    </span>
                                  )}
                                  {isChecked && (
                                    <span className="text-[10px] font-black text-white bg-emerald-600 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                                      <CheckCircle2 size={10} />{" "}
                                      {tAtt.addOneSession || "+ Thêm 1 buổi"}
                                    </span>
                                  )}
                                </button>
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
                {tAtt.close || "Đóng"}
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
        <div className="!m-0 fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overscroll-contain">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base sm:text-lg">
                {tAtt.cancelCheckinConfirmTitle || "Xác nhận hủy điểm danh"}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {interpolate(
                  tAtt.cancelCheckinConfirmDesc ||
                    "Bạn có chắc chắn muốn hủy điểm danh của học sinh {name} vào {date} không?",
                  {
                    name: deleteTargetStudent.name,
                    date: modalDateLabel,
                  },
                )}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                {tc.cancel || "Hủy bỏ"}
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
                {tAtt.cancelCheckinBtn || "Hủy điểm danh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

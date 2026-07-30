import { useState, useEffect } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import {
  Users,
  Calendar,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  CheckCircle2,
  CalendarDays,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

export function AttendanceManager() {
  const { t } = useLanguage();
  const tAtt = (t as any).attendance;
  const [activeTab, setActiveTab] = useState<
    "students" | "checkin" | "summary"
  >("students");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap bg-white rounded-lg p-1.5 border border-slate-100 shadow-sm gap-1.5 w-full">
        <button
          onClick={() => setActiveTab("students")}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 min-w-[120px] ${
            activeTab === "students"
              ? "bg-blue-50 text-blue-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Users size={16} />
          <span>{tAtt.studentsTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("checkin")}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 min-w-[120px] ${
            activeTab === "checkin"
              ? "bg-emerald-50 text-emerald-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar size={16} />
          <span>{tAtt.checkinTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 min-w-[120px] ${
            activeTab === "summary"
              ? "bg-purple-50 text-purple-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <FileText size={16} />
          <span>{tAtt.summaryTab}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-3 sm:p-6 min-h-[500px]">
        {activeTab === "students" && <StudentsTab tAtt={tAtt} />}
        {activeTab === "checkin" && <CheckinTab tAtt={tAtt} />}
        {activeTab === "summary" && <SummaryTab tAtt={tAtt} />}
      </div>
    </div>
  );
}

function StudentsTab({ tAtt }: { tAtt: any }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("attendance_students")
      .select("*")
      .order("name");
    if (data) setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setUnitPrice("");
      return;
    }
    setUnitPrice(parseInt(rawValue, 10).toLocaleString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    const price = parseInt(unitPrice.replace(/\D/g, "")) || 0;
    const cName = className.trim() || tAtt.unassignedClass;

    try {
      if (editId) {
        const { error: err } = await supabase
          .from("attendance_students")
          .update({ name: name.trim(), class_name: cName, unit_price: price })
          .eq("id", editId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("attendance_students")
          .insert({ name: name.trim(), class_name: cName, unit_price: price });
        if (err) throw err;
      }

      await loadStudents();
      setShowForm(false);
      setName("");
      setClassName("");
      setUnitPrice("");
      setEditId(null);
    } catch (err: any) {
      setError(
        err.message || "Error saving student. Name might already exist.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student: any) => {
    setEditId(student.id);
    setName(student.name);
    setClassName(student.class_name || "");
    setUnitPrice(student.unit_price.toLocaleString());
    setShowForm(true);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteId) return;
    setDeleteSaving(true);
    try {
      await supabase.from("attendance_students").delete().eq("id", deleteId);
      await loadStudents();
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  // Group students by class for display
  const [search, setSearch] = useState("");
  const [filterCls, setFilterCls] = useState("all");

  const availableClasses = Array.from(
    new Set(students.map((s) => s.class_name || tAtt.unassignedClass)),
  ).sort();
  const filtered = students.filter((s) => {
    const matchCls =
      filterCls === "all" ||
      (s.class_name || tAtt.unassignedClass) === filterCls;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCls && matchSearch;
  });

  // Group filtered by class
  const byClass: Record<string, typeof students> = {};
  filtered.forEach((s) => {
    const key = s.class_name || tAtt.unassignedClass;
    if (!byClass[key]) byClass[key] = [];
    byClass[key].push(s);
  });

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">
            {tAtt.studentsTab}
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {tAtt.studentClassCount.replace("{students}", students.length.toString()).replace("{classes}", availableClasses.length.toString())}
          </p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setName("");
            setClassName("");
            setUnitPrice("");
            setError("");
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-md transition-colors"
        >
          <Plus size={16} />
          {tAtt.addStudent}
        </button>
      </div>

      {/* Search + Filter row */}
      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tAtt.searchStudentPlaceholder}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50"
            />
            <Users
              size={15}
              className="absolute left-3 top-2.5 text-slate-400"
            />
          </div>
          <select
            value={filterCls}
            onChange={(e) => setFilterCls(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700 text-sm"
          >
            <option value="all">{tAtt.allClasses}</option>
            {availableClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div
              className={`px-6 py-4 ${editId ? "bg-blue-600" : "bg-blue-600"} text-white`}
            >
              <h3 className="font-black text-lg">
                {editId ? tAtt.editStudent : tAtt.addStudent}
              </h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">
                  {tAtt.studentName} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tAtt.studentNamePlaceholder}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1.5">
                    {tAtt.className}
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder={tAtt.classNamePlaceholder}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1.5">
                    {tAtt.unitPrice} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unitPrice}
                    onChange={handlePriceChange}
                    placeholder={tAtt.unitPricePlaceholder}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-2.5 text-sm font-bold">
                  <span>⚠️</span> {error}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {(useLanguage as any)().t.common?.cancel || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2 shadow-md disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {tAtt.saveStudent}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <DeleteConfirmModal
          title={tAtt.deleteStudent}
          description={tAtt.confirmDeleteStudent}
          confirmLabel={tAtt.deleteStudent}
          saving={deleteSaving}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Empty state */}
      {students.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Users size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-bold">{tAtt.noStudents}</p>
          <p className="text-slate-400 text-sm mt-1">
            Nhấn "Thêm học sinh" để bắt đầu
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400 font-bold">
          Không tìm thấy học sinh nào
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byClass).map(([cls, rows]) => (
            <div
              key={cls}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              {/* Class header */}
              <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-blue-200" />
                  <span className="font-black text-white text-sm">{cls}</span>
                </div>
                <span className="text-blue-200 text-xs font-bold">
                  {rows.length} học sinh
                </span>
              </div>

              {/* Students table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {tAtt.studentName}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {tAtt.unitPrice}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((student, i) => (
                      <tr
                        key={student.id}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-400 font-bold whitespace-nowrap">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-800 whitespace-nowrap">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-xs">
                            {tAtt.pricePerSession.replace("{price}", student.unit_price.toLocaleString())}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(student)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            >
                              <Pencil size={12} />
                              Sửa
                            </button>
                            <button
                              onClick={() => setDeleteId(student.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                            >
                              <Trash2 size={12} />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckinTab({ tAtt }: { tAtt: any }) {
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
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-slate-800 min-w-[160px] text-center">
            {MONTH_NAMES[calMonth]} {calYear}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
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
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl transition-colors shadow"
        >
          <CalendarDays size={15} />
          {tAtt.today}
        </button>
      </div>

      {/* ── Full calendar grid ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-black py-3 uppercase tracking-wide ${i === 0 ? "text-rose-500" : "text-slate-500"}`}
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
                  className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-black flex-shrink-0
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
          <span className="w-4 h-4 rounded-full bg-emerald-500 inline-flex items-center justify-center text-white text-xs">
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
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-2xl flex items-start justify-between shrink-0">
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
                    {tAtt.studentCount.replace("{count}", filteredStudents.length.toString())}
                  </span>
                  <span className="text-emerald-600 font-black">
                    {progressPct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex gap-3 mt-1.5 text-xs font-bold">
                  {doneStudents.length > 0 && (
                    <span className="text-emerald-600">
                      {tAtt.checkedInCount.replace("{count}", doneStudents.length.toString())}
                    </span>
                  )}
                  {checkedCount > 0 && (
                    <span className="text-blue-600">
                      {tAtt.selectingCount.replace("{count}", checkedCount.toString())}
                    </span>
                  )}
                  {pendingStudents.length - checkedCount > 0 && (
                    <span className="text-slate-400">
                      {tAtt.unselectedCount.replace("{count}", (pendingStudents.length - checkedCount).toString())}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Student grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {students.length === 0 ? (
                <p className="text-center text-slate-400 font-bold py-8">
                  {tAtt.noStudents}
                </p>
              ) : allDoneForDay ? (
                <div className="text-center py-10">
                  <CheckCircle2
                    size={40}
                    className="mx-auto text-emerald-400 mb-3"
                  />
                  <p className="font-black text-emerald-700 text-lg">
                    Tất cả đã điểm danh!
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Thay đổi bộ lọc lớp để xem thêm
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {pendingStudents.map((student) => {
                    const isChecked = checkedIds.has(student.id);
                    const ini = initials(student.name);
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleToggle(student.id)}
                        className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all text-center gap-1.5 active:scale-95 ${
                          isChecked
                            ? "border-emerald-500 bg-emerald-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${
                            isChecked
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ini}
                        </div>
                        <p
                          className={`font-black text-xs leading-tight line-clamp-2 ${isChecked ? "text-emerald-700" : "text-slate-700"}`}
                        >
                          {student.name}
                        </p>
                        {filterClass === "all" && (
                          <p className="text-xs text-slate-400 font-bold truncate w-full">
                            {student.class_name || tAtt.unassignedClass}
                          </p>
                        )}
                        {isChecked && (
                          <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Chọn
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {doneStudents.map((student) => {
                    const ini = initials(student.name);
                    return (
                      <div
                        key={student.id}
                        className="flex flex-col items-center p-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-center gap-1.5 opacity-50 cursor-not-allowed"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm bg-slate-200 text-slate-500">
                          {ini}
                        </div>
                        <p className="font-black text-xs leading-tight text-slate-500 line-clamp-2">
                          {student.name}
                        </p>
                        <span className="text-xs font-black text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Xong
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-3 bg-white shrink-0 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <div className="flex-1" />
              {success && (
                <div className="flex items-center gap-1.5 text-emerald-700 font-black text-sm bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 size={15} /> {tAtt.checkinSaved}
                </div>
              )}
              <button
                onClick={handleSaveCheckin}
                disabled={saving || checkedIds.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-md active:scale-95"
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
    </div>
  );
}

function SummaryTab({ tAtt }: { tAtt: any }) {
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const [studRes, recRes] = await Promise.all([
        supabase.from("attendance_students").select("*"),
        supabase
          .from("attendance_records")
          .select("*, attendance_students(name, unit_price)")
          .gte("checkin_time", startDate)
          .lte("checkin_time", endDate),
      ]);

      if (studRes.data) setStudents(studRes.data);
      if (recRes.data) setRecords(recRes.data);
      setLoading(false);
    };

    loadData();
  }, [month, year]);

  const allSummary = students
    .map((student) => {
      const studentRecords = records.filter((r) => r.student_id === student.id);
      return {
        ...student,
        total_sessions: studentRecords.length,
        total_fee: studentRecords.length * student.unit_price,
      };
    })
    .filter((s) => s.total_sessions > 0)
    .sort((a, b) => {
      const classCompare = (a.class_name || "").localeCompare(
        b.class_name || "",
      );
      return classCompare !== 0
        ? classCompare
        : b.total_sessions - a.total_sessions;
    });

  const availableClasses = Array.from(
    new Set(allSummary.map((s) => s.class_name || tAtt.unassignedClass)),
  ).sort();

  const summary =
    filterClass === "all"
      ? allSummary
      : allSummary.filter(
          (s) => (s.class_name || tAtt.unassignedClass) === filterClass,
        );

  // Group by class for display
  const byClass: Record<string, typeof allSummary> = {};
  summary.forEach((s) => {
    const key = s.class_name || tAtt.unassignedClass;
    if (!byClass[key]) byClass[key] = [];
    byClass[key].push(s);
  });

  const grandTotal = summary.reduce((sum, s) => sum + s.total_fee, 0);
  const grandSessions = summary.reduce((sum, s) => sum + s.total_sessions, 0);
  const MONTH_LABEL = tAtt.monthYear.replace("{month}", month.toString()).replace("{year}", year.toString());

  // ---- Export all to Excel ----
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Sheet 1: All students
    const allRows = [
      [tAtt.attendanceReport + " — " + MONTH_LABEL],
      [],
      [tAtt.studentNameLabel, tAtt.classLabel, tAtt.sessionsLabel, tAtt.unitPriceLabel, tAtt.tuitionFeeLabel],
      ...allSummary.map((s) => [
        s.name,
        s.class_name || tAtt.unassignedClass,
        s.total_sessions,
        s.unit_price,
        s.total_fee,
      ]),
      [],
      ["", "", grandSessions, "", grandTotal],
    ];
    const wsAll = XLSX.utils.aoa_to_sheet(allRows);
    wsAll["!cols"] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAll, tAtt.summary);

    // One sheet per class
    Object.entries(byClass).forEach(([cls, rows]) => {
      const clsTotal = rows.reduce((s, r) => s + r.total_fee, 0);
      const clsRows = [
        [`${tAtt.classReport}: ${cls} — ` + MONTH_LABEL],
        [],
        [tAtt.studentNameLabel, tAtt.sessionsLabel, tAtt.unitPriceLabel, tAtt.tuitionFeeLabel],
        ...rows.map((s) => [
          s.name,
          s.total_sessions,
          s.unit_price,
          s.total_fee,
        ]),
        [],
        [tAtt.total, rows.reduce((s, r) => s + r.total_sessions, 0), "", clsTotal],
      ];
      const ws = XLSX.utils.aoa_to_sheet(clsRows);
      ws["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, cls.slice(0, 31));
    });

    XLSX.writeFile(wb, `diem-danh-${month}-${year}.xlsx`);
  };

  // ---- Export single student to Excel ----
  const exportStudentExcel = async (s: any) => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const studentRecs = records
      .filter((r) => r.student_id === s.id)
      .sort(
        (a, b) =>
          new Date(a.checkin_time).getTime() -
          new Date(b.checkin_time).getTime(),
      );

    const rows = [
      [`${tAtt.tuitionSlip} — ${s.name}`],
      [
        `Lớp: ${s.class_name || tAtt.unassignedClass}`,
        "",
        `Tháng ${month}/${year}`,
      ],
      [],
      [tAtt.no, tAtt.date, tAtt.time, tAtt.note],
      ...studentRecs.map((r, i) => {
        const dt = new Date(r.checkin_time);
        return [
          i + 1,
          dt.toLocaleDateString("vi-VN"),
          dt.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          tAtt.present,
        ];
      }),
      [],
      [tAtt.totalSessionsLabel, s.total_sessions, "", ""],
      [tAtt.unitPricePerSession, s.unit_price, "", ""],
      [tAtt.monthlyTuition, s.total_fee, "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    XLSX.writeFile(
      wb,
      `hoc-phi-${s.name.replace(/\s+/g, "-")}-${month}-${year}.xlsx`,
    );
  };

  // ---- Export to Image (print) ----
  const exportImage = () => window.print();

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-purple-500" />
      </div>
    );

  return (
    <div className="space-y-5" id="printable-summary">
      {/* ---- Controls bar ---- */}
      <div className="flex flex-wrap items-end gap-3 bg-purple-50 border border-purple-100 rounded-2xl p-4 print:hidden">
        <div>
          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
            {tAtt.month}
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
            {tAtt.year}
          </label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {availableClasses.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
              {tAtt.filterClass}
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
            >
              <option value="all">{tAtt.allClasses}</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={exportImage}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Download size={15} />
            In / Ảnh
          </button>
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Download size={15} />
            Excel
          </button>
        </div>
      </div>

      {/* Print header (visible only when printing) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-black text-slate-800">
          Báo Cáo Điểm Danh
        </h1>
        <p className="text-slate-500 font-bold mt-1">
          {MONTH_LABEL}
          {filterClass !== "all" ? ` — ${filterClass}` : ""}
        </p>
      </div>

      {summary.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{tAtt.summaryEmpty}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ---- Stat cards ---- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl p-4 shadow-lg">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Học sinh
              </p>
              <p className="text-3xl font-black mt-1">{summary.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-4 shadow-lg">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Tổng buổi
              </p>
              <p className="text-3xl font-black mt-1">{grandSessions}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-4 shadow-lg">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Số lớp
              </p>
              <p className="text-3xl font-black mt-1">
                {Object.keys(byClass).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Tổng học phí
              </p>
              <p className="text-xl font-black mt-1">
                {tAtt.currencyVnd.replace("{amount}", grandTotal.toLocaleString())}
              </p>
            </div>
          </div>

          {/* ---- Tables grouped by class ---- */}
          {Object.entries(byClass).map(([cls, rows]) => {
            const classTotal = rows.reduce((s, r) => s + r.total_fee, 0);
            const classSessions = rows.reduce(
              (s, r) => s + r.total_sessions,
              0,
            );
            return (
              <div
                key={cls}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:break-inside-avoid"
              >
                {/* Class header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-purple-200" />
                    <span className="font-black text-white">{cls}</span>
                    <span className="text-purple-200 text-sm font-bold">
                      ({tAtt.studentCount.replace("{count}", rows.length.toString())})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-200 font-bold">
                      {tAtt.sessionCount.replace("{count}", classSessions.toString())}
                    </p>
                    <p className="text-sm text-white font-black">
                      {tAtt.currencyVnd.replace("{amount}", classTotal.toLocaleString())}
                    </p>
                  </div>
                </div>

                {/* Student rows */}
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          #
                        </th>
                        <th className="px-4 py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {tAtt.studentName}
                        </th>
                        <th className="px-4 py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">
                          {tAtt.totalSessions}
                        </th>
                        <th className="px-4 py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                          {tAtt.unitPrice}
                        </th>
                        <th className="px-4 py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                          {tAtt.totalFee}
                        </th>
                        <th className="px-4 py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider text-center print:hidden whitespace-nowrap">
                          Chi tiết
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((s, i) => (
                        <tr
                          key={s.id}
                          className="hover:bg-purple-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-slate-400 font-bold whitespace-nowrap">
                            {i + 1}
                          </td>
                          <td className="px-4 py-3 font-black text-slate-800 whitespace-nowrap">
                            {s.name}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm">
                              {s.total_sessions}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-500 font-bold whitespace-nowrap">
                            {s.unit_price.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-purple-700 whitespace-nowrap">
                            {tAtt.currencyVnd.replace("{amount}", s.total_fee.toLocaleString())}
                          </td>
                          <td className="px-4 py-3 text-center print:hidden whitespace-nowrap">
                            <button
                              onClick={() => setSelectedStudent(s)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-purple-600 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors mx-auto whitespace-nowrap"
                            >
                              <CalendarDays size={12} />
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-purple-50 border-t-2 border-purple-200">
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-3 font-black text-purple-800 text-sm whitespace-nowrap"
                        >
                          Cộng
                        </td>
                        <td className="px-4 py-3 text-center font-black text-purple-800 whitespace-nowrap">
                          {classSessions}
                        </td>
                        <td />
                        <td className="px-4 py-3 text-right font-black text-purple-700 text-base">
                          {tAtt.currencyVnd.replace("{amount}", classTotal.toLocaleString())}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}

          {/* ---- Grand total footer ---- */}
          {filterClass === "all" && (
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-2xl px-6 py-4 shadow-lg text-right">
                <p className="text-xs font-bold opacity-70 uppercase tracking-wider">
                  Tổng cộng tất cả
                </p>
                <p className="text-3xl font-black mt-0.5">
                  {tAtt.currencyVnd.replace("{amount}", grandTotal.toLocaleString())}
                </p>
                <p className="text-xs opacity-70 mt-0.5">
                  {grandSessions} buổi · {summary.length} học sinh ·{" "}
                  {MONTH_LABEL}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Student Detail Modal ---- */}
      {selectedStudent &&
        (() => {
          const s = selectedStudent;
          const studentRecs = records
            .filter((r) => r.student_id === s.id)
            .sort(
              (a, b) =>
                new Date(a.checkin_time).getTime() -
                new Date(b.checkin_time).getTime(),
            );
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 flex items-start justify-between">
                  <div>
                    <h2 className="font-black text-white text-xl">{s.name}</h2>
                    <p className="text-purple-200 text-sm font-bold mt-0.5">
                      {s.class_name || tAtt.unassignedClass} · {MONTH_LABEL}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-purple-300 hover:text-white text-2xl font-black leading-none ml-4"
                  >
                    ✕
                  </button>
                </div>

                {/* Summary strip */}
                <div className="grid grid-cols-3 border-b border-slate-100">
                  <div className="px-5 py-3 text-center border-r border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                      Số buổi
                    </p>
                    <p className="text-2xl font-black text-emerald-600 mt-0.5">
                      {s.total_sessions}
                    </p>
                  </div>
                  <div className="px-5 py-3 text-center border-r border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                      Đơn giá
                    </p>
                    <p className="text-sm font-black text-slate-700 mt-0.5">
                      {tAtt.currencyVnd.replace("{amount}", s.unit_price.toLocaleString())}
                    </p>
                  </div>
                  <div className="px-5 py-3 text-center">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                      Học phí
                    </p>
                    <p className="text-sm font-black text-purple-700 mt-0.5">
                      {tAtt.currencyVnd.replace("{amount}", s.total_fee.toLocaleString())}
                    </p>
                  </div>
                </div>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto">
                  {studentRecs.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 font-bold">
                      Không có buổi nào
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                            STT
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                            Ngày
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                            Giờ
                          </th>
                          <th className="px-4 py-2.5 text-center text-xs font-black text-slate-500 uppercase">
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentRecs.map((r, i) => {
                          const dt = new Date(r.checkin_time);
                          return (
                            <tr
                              key={r.id}
                              className="hover:bg-purple-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-slate-400 font-bold">
                                {i + 1}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-black text-slate-800">
                                  {dt.toLocaleDateString("vi-VN", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                </p>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-500">
                                {dt.toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full">
                                  <CheckCircle2 size={11} /> Có mặt
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Modal footer: export actions */}
                <div className="border-t border-slate-100 px-5 py-3 flex justify-end gap-2 bg-slate-50">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => exportStudentExcel(s)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition-colors"
                  >
                    <Download size={14} /> Excel
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow transition-colors"
                  >
                    <Download size={14} /> In / Ảnh
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

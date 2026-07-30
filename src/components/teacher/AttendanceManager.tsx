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
      <div className="flex bg-white rounded-lg p-1 border border-slate-100 shadow-sm w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "students"
              ? "bg-blue-50 text-blue-600"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Users size={16} />
          <span>{tAtt.studentsTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("checkin")}
          className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "checkin"
              ? "bg-emerald-50 text-emerald-600"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar size={16} />
          <span>{tAtt.checkinTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "summary"
              ? "bg-purple-50 text-purple-600"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <FileText size={16} />
          <span>{tAtt.summaryTab}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-4 sm:p-6 min-h-[500px]">
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

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-slate-800">
          {tAtt.studentsTab}
        </h2>
        <button
          onClick={() => {
            setEditId(null);
            setName("");
            setUnitPrice("");
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">{tAtt.addStudent}</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-slate-800 text-lg mb-4">
              {editId ? tAtt.editStudent : tAtt.addStudent}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {tAtt.studentName}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tAtt.studentNamePlaceholder}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {tAtt.className}
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder={tAtt.classNamePlaceholder}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {tAtt.unitPrice}
                  </label>
                  <input
                    type="text"
                    required
                    value={unitPrice}
                    onChange={handlePriceChange}
                    placeholder={tAtt.unitPricePlaceholder}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-rose-500 font-bold">{error}</p>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {(useLanguage as any)().t.common?.cancel || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
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

      {students.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Users size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{tAtt.noStudents}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <h3 className="font-black text-slate-800 text-lg mb-1">
                {student.name}
              </h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {student.class_name || tAtt.unassignedClass}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {student.unit_price.toLocaleString()} VNĐ/buổi
                </span>
              </div>

              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(student)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={tAtt.editStudent}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteId(student.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title={tAtt.deleteStudent}
                >
                  <Trash2 size={16} />
                </button>
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
  const [filterClass, setFilterClass] = useState("all");

  // Create a default datetime string (YYYY-MM-DDTHH:mm)
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDateTime = now.toISOString().slice(0, 16);

  const [checkinTime, setCheckinTime] = useState(defaultDateTime);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      const { data } = await supabase
        .from("attendance_students")
        .select("*")
        .order("name");
      if (data) setStudents(data);
      setLoading(false);
    };
    loadStudents();
  }, []);

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
      const next = new Set(checkedIds);
      filteredStudents.forEach((s) => next.delete(s.id));
      setCheckedIds(next);
    } else {
      const next = new Set(checkedIds);
      filteredStudents.forEach((s) => next.add(s.id));
      setCheckedIds(next);
    }
  };

  const handleSaveCheckin = async () => {
    if (checkedIds.size === 0) return;
    setSaving(true);
    setSuccess(false);

    try {
      const timestamp = new Date(checkinTime).toISOString();
      const records = Array.from(checkedIds).map((student_id) => ({
        student_id,
        checkin_time: timestamp,
        status: "present",
      }));

      const { error } = await supabase
        .from("attendance_records")
        .insert(records);
      if (error) throw error;

      setSuccess(true);
      setCheckedIds(new Set());
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving checkin:", err);
      alert(
        "Error saving check-in. Maybe records already exist for this exact time.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );

  const allSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => checkedIds.has(s.id));

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-bold text-emerald-800 mb-1">
            {tAtt.timeCheckin}
          </label>
          <input
            type="datetime-local"
            value={checkinTime}
            onChange={(e) => setCheckinTime(e.target.value)}
            className="px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm w-full sm:w-auto"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-emerald-800 mb-1">
            {tAtt.filterClass}
          </label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm w-full sm:w-auto font-bold text-slate-700"
          >
            <option value="all">{tAtt.allClasses}</option>
            {availableClasses.map((c) => (
              <option key={c as string} value={c as string}>
                {c as string}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto self-end pt-1 sm:pt-0">
          <button
            onClick={handleSaveCheckin}
            disabled={saving || checkedIds.size === 0}
            className="w-full px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-lg transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {tAtt.saveCheckin} ({checkedIds.size})
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg border border-green-200 flex items-center gap-2 font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={20} />
          {tAtt.checkinSaved}
        </div>
      )}

      {students.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-500 font-medium">{tAtt.noStudents}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-slate-700">
              {filterClass === "all" ? tAtt.allClasses : filterClass} (
              {filteredStudents.length})
            </h3>
            {filteredStudents.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
              >
                {allSelected ? tAtt.deselectAll : tAtt.selectAll}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredStudents.map((student) => {
              const isChecked = checkedIds.has(student.id);
              return (
                <button
                  key={student.id}
                  onClick={() => handleToggle(student.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <div className="text-left">
                    <p
                      className={`font-black ${isChecked ? "text-emerald-700" : "text-slate-700"}`}
                    >
                      {student.name}
                    </p>
                    {filterClass === "all" && (
                      <p className="text-xs font-bold text-slate-400 mt-0.5">
                        {student.class_name || tAtt.unassignedClass}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-transparent"
                    }`}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                </button>
              );
            })}
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

  const summary = students
    .map((student) => {
      const studentRecords = records.filter((r) => r.student_id === student.id);
      return {
        ...student,
        total_sessions: studentRecords.length,
        total_fee: studentRecords.length * student.unit_price,
      };
    })
    .filter((s) => s.total_sessions > 0)
    .sort((a, b) => b.total_sessions - a.total_sessions);

  const grandTotal = summary.reduce((sum, s) => sum + s.total_fee, 0);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-purple-500" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
              {tAtt.month}
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700"
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
              className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
        >
          <Download size={16} />
          {tAtt.exportReport}
        </button>
      </div>

      {summary.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{tAtt.summaryEmpty}</p>
        </div>
      ) : (
        <div
          className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
          id="printable-summary"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-black text-slate-700">
                    {tAtt.studentName}
                  </th>
                  <th className="px-4 py-3 font-black text-slate-700">
                    {tAtt.className}
                  </th>
                  <th className="px-4 py-3 font-black text-slate-700 text-right">
                    {tAtt.totalSessions}
                  </th>
                  <th className="px-4 py-3 font-black text-slate-700 text-right">
                    {tAtt.unitPrice}
                  </th>
                  <th className="px-4 py-3 font-black text-slate-700 text-right">
                    {tAtt.totalFee}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-500 text-sm">
                      {s.class_name || tAtt.unassignedClass}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600 text-right">
                      {s.total_sessions}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-right text-sm">
                      {s.unit_price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-black text-purple-700 text-right">
                      {s.total_fee.toLocaleString()} đ
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-purple-50 border-t border-purple-100">
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 font-black text-purple-900 text-right uppercase tracking-wider"
                  >
                    Tổng cộng:
                  </td>
                  <td className="px-4 py-3 font-black text-purple-700 text-right text-lg">
                    {grandTotal.toLocaleString()} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

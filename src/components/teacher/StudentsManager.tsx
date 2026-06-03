import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  Award,
  BarChart2,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Eye,
  EyeOff,
  Flame,
  Key,
  Loader2,
  Pencil,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { calculateStreak } from "../../utils";

// We'll declare supabaseForStudents just in case
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabaseForStudents = createClient(supabaseUrl, supabaseAnonKey);

export function StudentsManager() {
  const [students, setStudents] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create student form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createYearBorn, setCreateYearBorn] = useState("2015");
  const [createPassword, setCreatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  // Delete student state
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<{
    student: any;
    recCount: number;
  } | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reset password state
  const [resetPasswordTarget, setResetPasswordTarget] = useState<any | null>(
    null,
  );
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Edit student state
  const [editStudentTarget, setEditStudentTarget] = useState<any | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentYearBorn, setEditStudentYearBorn] = useState("");
  const [editStudentSaving, setEditStudentSaving] = useState(false);
  const [editStudentError, setEditStudentError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studRes, recRes, topRes] = await Promise.all([
          supabaseForStudents
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .order("name"),
          supabaseForStudents
            .from("recordings")
            .select("id,studentName,topicNumber,topic,createdAt")
            .order("createdAt", { ascending: false }),
          supabaseForStudents
            .from("topics")
            .select("id,title,order_index,type")
            .eq("type", "standard")
            .order("order_index"),
        ]);
        if (studRes.data) setStudents(studRes.data);
        if (recRes.data) setRecordings(recRes.data);
        if (topRes.data) setTopics(topRes.data);
      } catch (err) {
        console.error("StudentsManager load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const createStudent = async () => {
    const trimName = createName.trim();
    const trimPass = createPassword.trim();
    if (trimName.length < 2) {
      setCreateError("Tên phải có ít nhất 2 ký tự.");
      return;
    }
    if (trimPass.length < 3) {
      setCreateError("Mật khẩu phải có ít nhất 3 ký tự.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    try {
      const { data: existing } = await supabaseForStudents
        .from("profiles")
        .select("id")
        .ilike("name", trimName)
        .maybeSingle();
      if (existing) {
        setCreateError("Tên này đã tồn tại. Vui lòng chọn tên khác.");
        return;
      }
      const { data: inserted, error } = await supabaseForStudents
        .from("profiles")
        .insert({
          name: trimName,
          role: "student",
          password: trimPass,
          year_born: parseInt(createYearBorn) || 2015,
        })
        .select()
        .single();
      if (error) throw error;
      setStudents((prev) =>
        [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCreateName("");
      setCreateYearBorn("2015");
      setCreatePassword("");
      setShowCreateForm(false);
    } catch (err: any) {
      setCreateError(
        err.message || "Không thể tạo học sinh. Vui lòng thử lại.",
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const deleteStudent = async () => {
    if (!deleteStudentTarget) return;
    setDeleteSaving(true);
    setDeleteError("");
    try {
      const { error } = await supabaseForStudents
        .from("profiles")
        .delete()
        .eq("id", deleteStudentTarget.student.id);
      if (error) throw error;
      setStudents((prev) =>
        prev.filter((s) => s.id !== deleteStudentTarget.student.id),
      );
      setDeleteStudentTarget(null);
    } catch (err: any) {
      setDeleteError(
        err.message || "Không thể xóa học sinh. Vui lòng thử lại.",
      );
    } finally {
      setDeleteSaving(false);
    }
  };

  const resetStudentPassword = async () => {
    if (!resetPasswordTarget) return;
    const trimPass = resetPasswordValue.trim();
    if (trimPass.length < 3) {
      setResetError("Mật khẩu phải có ít nhất 3 ký tự.");
      return;
    }
    setResetSaving(true);
    setResetError("");
    setResetSuccess(false);
    try {
      const { error } = await supabaseForStudents
        .from("profiles")
        .update({ password: trimPass })
        .eq("id", resetPasswordTarget.id);
      if (error) throw error;
      setResetSuccess(true);
      setTimeout(() => {
        setResetPasswordTarget(null);
        setResetSuccess(false);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setResetSaving(false);
    }
  };

  const saveEditedStudent = async () => {
    if (!editStudentTarget) return;

    setEditStudentSaving(true);
    setEditStudentError("");
    try {
      const { data, error } = await supabaseForStudents
        .from("profiles")
        .update({
          year_born: parseInt(editStudentYearBorn) || 2015,
        })
        .eq("id", editStudentTarget.id)
        .select()
        .single();
      if (error) throw error;
      setStudents((prev) =>
        prev
          .map((s) => (s.id === data.id ? data : s))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditStudentTarget(null);
    } catch (err: any) {
      setEditStudentError(
        err.message || "Không thể cập nhật. Vui lòng thử lại.",
      );
    } finally {
      setEditStudentSaving(false);
    }
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const avatarColors = [
    "bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]",
    "bg-[#F3E5F5] text-[#8E24AA] border-[#CE93D8]",
    "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]",
    "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
    "bg-[#FCE4EC] text-[#C62828] border-[#F48FB1]",
    "bg-[#E0F7FA] text-[#00838F] border-[#80DEEA]",
  ];

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E88E5]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#E3F2FD] text-[#1E88E5] flex items-center justify-center">
            <Users size={20} />
          </span>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {students.length}
            </p>
            <p className="text-xs font-bold text-slate-400">Học sinh</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
            <BarChart2 size={20} />
          </span>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {recordings.length}
            </p>
            <p className="text-xs font-bold text-slate-400">Tổng bài nộp</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#FFF3E0] text-[#E65100] flex items-center justify-center">
            <BookOpen size={20} />
          </span>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {topics.length}
            </p>
            <p className="text-xs font-bold text-slate-400">Topics</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm học sinh..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] shadow-sm"
        />
      </div>

      {/* Student list */}
      <div className="bg-white rounded-[2rem] shadow-md border border-slate-100 overflow-hidden">
        <div className="p-4 border-b-2 border-slate-100 flex items-center gap-2 bg-slate-50">
          <Users size={16} className="text-slate-500" />
          <h3 className="font-extrabold text-slate-700 text-sm">
            Danh sách học sinh
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setCreateName("");
              setCreatePassword("");
              setCreateError("");
            }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-extrabold transition-all"
          >
            <UserPlus size={14} /> Thêm học sinh
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-bold">
            Không tìm thấy học sinh.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((student, idx) => {
              const studentRecs = recordings.filter(
                (r) => r.studentName === student.name,
              );
              const doneTopicNums = new Set(
                studentRecs.map((r: any) => r.topicNumber),
              );
              const doneCount = doneTopicNums.size;
              const totalTopics = topics.length;
              const pct =
                totalTopics > 0
                  ? Math.round((doneCount / totalTopics) * 100)
                  : 0;
              const isExpanded = expandedStudent === student.id;
              const colorClass = avatarColors[idx % avatarColors.length];
              const initials = student.name
                .split(" ")
                .map((w: string) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const lastRec = studentRecs[0];

              return (
                <div key={student.id} className="group">
                  {/* Student row — flex row with separate action buttons */}
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                    {/* Clickable area: avatar + info + progress */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStudent(isExpanded ? null : student.id)
                      }
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      {/* Avatar */}
                      <span
                        className={`w-10 h-10 rounded-2xl border-2 font-black flex items-center justify-center shrink-0 ${
                          student.avatar
                            ? "bg-amber-50 text-2xl shadow-sm border-amber-200"
                            : `text-sm ${colorClass}`
                        }`}
                      >
                        {student.avatar || initials}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm truncate flex items-center gap-2">
                          {student.name}
                          {student.year_born && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                              {student.year_born}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          {lastRec
                            ? `Nộp gần nhất: ${formatDate(lastRec.createdAt)}`
                            : "Chưa nộp bài nào"}
                        </p>
                      </div>

                      {/* Progress bar + count */}
                      <div className="shrink-0 flex flex-col items-end gap-1 min-w-[72px]">
                        <span className="text-xs font-black text-slate-600">
                          {doneCount}/{totalTopics}
                        </span>
                        <div className="flex items-center gap-1">
                          {doneCount > 0 && (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-200">
                              <Award size={10} /> {doneCount}
                            </span>
                          )}
                          {calculateStreak(studentRecs) > 0 && (
                            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-orange-200">
                              <Flame size={10} className="fill-orange-500" />{" "}
                              {calculateStreak(studentRecs)}
                            </span>
                          )}
                        </div>
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct === 100
                                  ? "#4CAF50"
                                  : pct >= 50
                                    ? "#1E88E5"
                                    : "#FFB74D",
                            }}
                          />
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 group-hover:opacity-100 transition-opacity pr-2 md:pr-4">
                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditStudentTarget(student);
                          setEditStudentName(student.name);
                          setEditStudentYearBorn(
                            student.year_born?.toString() || "2015",
                          );
                          setEditStudentError("");
                        }}
                        className="shrink-0 p-2 text-slate-300 hover:text-[#4CAF50] hover:bg-[#E8F5E9] rounded-xl transition-all"
                        title="Sửa thông tin"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Reset Password button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResetPasswordTarget(student);
                          setResetPasswordValue("");
                          setResetError("");
                          setResetSuccess(false);
                          setShowPassword(false);
                        }}
                        className="shrink-0 p-2 text-slate-300 hover:text-[#1E88E5] hover:bg-[#E3F2FD] rounded-xl transition-all"
                        title="Đổi mật khẩu"
                      >
                        <Key size={15} />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const recCount = recordings.filter(
                            (r) =>
                              r.studentName.trim().toLowerCase() ===
                              student.name.trim().toLowerCase(),
                          ).length;
                          setDeleteStudentTarget({ student, recCount });
                          setDeleteError("");
                        }}
                        className="shrink-0 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Xóa học sinh"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Chevron */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStudent(isExpanded ? null : student.id)
                      }
                      className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <span
                        className="block transition-transform duration-200"
                        style={{
                          transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <ChevronDown size={16} />
                      </span>
                    </button>
                  </div>

                  {/* Expanded: topic progress grid */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 bg-slate-50/60 border-t border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                        Tiến độ từng topic
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {topics.map((topic) => {
                          const topicRecs = studentRecs.filter(
                            (r: any) => r.topicNumber === topic.order_index,
                          );
                          const done = topicRecs.length > 0;
                          const recDate = done
                            ? formatDate(topicRecs[0].createdAt)
                            : null;
                          return (
                            <div
                              key={topic.id}
                              className={`rounded-xl p-2.5 border-2 flex flex-col gap-1 ${
                                done
                                  ? "bg-[#E8F5E9] border-[#A5D6A7]"
                                  : "bg-white border-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {done ? (
                                  <CheckCircle2
                                    size={14}
                                    className="text-[#2E7D32] shrink-0"
                                  />
                                ) : (
                                  <Circle
                                    size={14}
                                    className="text-slate-300 shrink-0"
                                  />
                                )}
                                <span
                                  className={`text-xs font-black truncate ${
                                    done ? "text-[#2E7D32]" : "text-slate-400"
                                  }`}
                                >
                                  {topic.order_index}. {topic.title}
                                </span>
                              </div>
                              {recDate && (
                                <p className="text-[10px] text-slate-400 font-bold pl-5">
                                  {recDate}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {topics.length === 0 && (
                        <p className="text-xs text-slate-400 font-bold">
                          Không có topic nào.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete Student Modal ── */}
      {deleteStudentTarget !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-rose-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Xóa học sinh
                </h4>
                <p className="text-sm text-slate-600 font-bold mt-0.5">
                  {deleteStudentTarget.student.name}
                </p>
              </div>
            </div>

            {/* Warning if has recordings */}
            {deleteStudentTarget.recCount > 0 ? (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  Cảnh báo: học sinh này có dữ liệu bài nộp!
                </div>
                <p className="text-xs text-amber-600 font-bold">
                  Học sinh này đã nộp{" "}
                  <span className="font-black text-amber-800">
                    {deleteStudentTarget.recCount} bài ghi âm
                  </span>
                  . Nếu xóa tài khoản, các bài nộp vẫn được giữ lại trong hệ
                  thống nhưng học sinh sẽ không thể đăng nhập nữa.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">
                Học sinh này chưa có bài nộp nào. Bạn có chắc chắn muốn xóa?
              </p>
            )}

            {/* Error */}
            {deleteError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />
                {deleteError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteStudentTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={deleteStudent}
                disabled={deleteSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900 flex items-center justify-center gap-2"
              >
                {deleteSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {deleteStudentTarget.recCount > 0
                  ? "Đồng ý xóa"
                  : "Xóa học sinh"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetPasswordTarget !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-blue-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center">
                <Key size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Đổi mật khẩu
                </h4>
                <p className="text-sm font-bold text-slate-500">
                  {resetPasswordTarget.name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={resetPasswordValue}
                    onChange={(e) => {
                      setResetPasswordValue(e.target.value);
                      setResetError("");
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && resetStudentPassword()
                    }
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {resetError && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {resetError}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={resetStudentPassword}
                disabled={resetSaving}
                className={`flex-1 py-2.5 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md flex items-center justify-center gap-2 border-b-4 ${
                  resetSuccess
                    ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-700"
                    : "bg-[#1E88E5] hover:bg-blue-600 border-blue-800"
                }`}
              >
                {resetSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : resetSuccess ? (
                  <Check size={15} />
                ) : (
                  <Key size={15} />
                )}
                {resetSuccess ? "Thành công" : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudentTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-emerald-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 flex items-center justify-center">
                <Pencil size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Sửa thông tin
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Cập nhật thông tin học sinh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditStudentTarget(null)}
                className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Năm sinh
                </label>
                <input
                  type="number"
                  value={editStudentYearBorn}
                  onChange={(e) => {
                    setEditStudentYearBorn(e.target.value);
                    setEditStudentError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && saveEditedStudent()}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                />
              </div>

              {editStudentError && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {editStudentError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditStudentTarget(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={editStudentSaving}
                onClick={saveEditedStudent}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {editStudentSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {editStudentSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Student Modal ── */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-emerald-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Thêm học sinh mới
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Tạo tài khoản cho học sinh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Tên học sinh
                </label>
                <input
                  autoFocus
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    setCreateError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && createStudent()}
                  placeholder="Ví dụ: Tuệ Minh, Bông bé..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                />
              </div>

              {/* Year Born */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Năm sinh
                </label>
                <input
                  type="number"
                  value={createYearBorn}
                  onChange={(e) => {
                    setCreateYearBorn(e.target.value);
                    setCreateError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && createStudent()}
                  placeholder="Ví dụ: 2015"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={createPassword}
                    onChange={(e) => {
                      setCreatePassword(e.target.value);
                      setCreateError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && createStudent()}
                    placeholder="Nhập mật khẩu..."
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {createError && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {createError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={createStudent}
                disabled={createSaving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-emerald-900 flex items-center justify-center gap-2"
              >
                {createSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                Tạo học sinh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

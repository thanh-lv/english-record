import {
  BarChart2,
  CheckCircle2,
  Flame,
  Key,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { calculateStreak } from "../../../utils";
import { CreateStudentModal } from "./CreateStudentModal";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { EditStudentModal } from "./EditStudentModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

const avatarColors = [
  "bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]",
  "bg-[#F3E5F5] text-[#8E24AA] border-[#CE93D8]",
  "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]",
  "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
  "bg-[#FCE4EC] text-[#C2185B] border-[#F8BBD0]",
  "bg-[#E0F7FA] text-[#00838F] border-[#80DEEA]",
];

export function StudentsManager({
  onSelectStudent,
}: {
  onSelectStudent: (name: string, avatar?: string) => void;
}) {
  const { t } = useLanguage();
  const tm = (t as any).teacherModal || {};
  const tc = (t as any).common || {};
  const [students, setStudents] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [resetPassStudent, setResetPassStudent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [deleteSaving, setDeleteSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: stData }, { data: recData }, { data: topData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, name, updated_at, role, password, avatar, year_born, grade",
            )
            .eq("role", "student")
            .order("name"),
          supabase.from("recordings").select("*"),
          supabase
            .from("topics")
            .select("id, questions(id)")
            .eq("is_active", true),
        ]);

      setStudents(stData || []);
      setRecordings(recData || []);
      setActiveTopics(topData || []);
    } catch (err) {
      console.error("Error fetching students data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStudentStats = (studentName: string) => {
    const studentRecs = recordings.filter(
      (r) => r.student_name.toLowerCase() === studentName.toLowerCase(),
    );

    const dates = studentRecs
      .map((r) => r.created_at)
      .filter(Boolean)
      .sort();
    const streak = calculateStreak(dates);

    const completedTopicCount = activeTopics.filter((topic) => {
      const topicQuestions = topic.questions || [];
      if (topicQuestions.length === 0) {
        return studentRecs.some((r) => r.topic_id === topic.id);
      }
      return topicQuestions.every((q: any) =>
        studentRecs.some(
          (r) => r.topic_id === topic.id && r.question_id === q.id,
        ),
      );
    }).length;

    const totalRecordings = studentRecs.length;

    return {
      streak,
      completedTopics: completedTopicCount,
      totalTopics: activeTopics.length,
      totalRecordings,
    };
  };

  const filteredStudents = students.filter((st) => {
    const matchesSearch = st.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase().trim());
    const matchesGrade =
      gradeFilter === "all" ||
      (gradeFilter === "none" && !st.grade) ||
      st.grade?.toString() === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const availableGrades = Array.from(
    new Set(students.map((s) => s.grade).filter(Boolean)),
  ).sort((a: any, b: any) => a - b);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-emerald-600" size={24} />
            {tm.studentManagerTitle ||
              tm.addStudentTitle ||
              "Quản lý danh sách học sinh"}
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {interpolate(
              tm.studentManagerSubtitle || "Tổng số: {count} học sinh",
              {
                count: students.length,
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-md transition-all flex items-center justify-center gap-2 border-b-4 border-emerald-800 active:translate-y-0.5"
        >
          <UserPlus size={16} />
          {tm.addStudentBtn || tm.addStudentTitle || "Thêm học sinh mới"}
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              tm.searchStudentPlaceholder || "Tìm học sinh theo tên..."
            }
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border-2 border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#90CAF9] transition-colors shadow-sm"
          />
        </div>
        {availableGrades.length > 0 && (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-4 py-2.5 bg-white rounded-lg border-2 border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#90CAF9] transition-colors shadow-sm"
          >
            <option value="all">
              {tm.filterGradeAll || "Tất cả khối lớp"}
            </option>
            {availableGrades.map((g: any) => (
              <option key={g} value={g}>
                {interpolate(tc.gradeLabel || "Khối {grade}", { grade: g })}
              </option>
            ))}
            <option value="none">{tm.filterGradeNone || "Chưa có khối"}</option>
          </select>
        )}
      </div>

      {/* Student List */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-extrabold text-sm">
            {searchQuery
              ? tm.noStudentFound || "Không tìm thấy học sinh nào"
              : tm.noStudentsYet || "Chưa có học sinh nào"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredStudents.map((st, idx) => {
            const stats = calculateStudentStats(st.name);
            const colorClass = avatarColors[idx % avatarColors.length];

            return (
              <div
                key={st.id}
                onClick={() => onSelectStudent(st.name, st.avatar)}
                className="bg-white rounded-lg p-5 border-2 border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start gap-3 mb-4">
                    <span
                      className={`w-12 h-12 rounded-lg border-2 font-black flex items-center justify-center shrink-0 shadow-sm text-lg ${
                        st.avatar ? "bg-amber-50 border-amber-200" : colorClass
                      }`}
                    >
                      {st.avatar ||
                        st.name
                          .split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-slate-800 text-base truncate group-hover:text-emerald-600 transition-colors">
                        {st.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {st.year_born && (
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date().getFullYear() - st.year_born}{" "}
                            {tc.yearsOld || "tuổi"}
                          </span>
                        )}
                        {st.grade && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-extrabold">
                            {interpolate(tc.gradeLabel || "Lớp {grade}", {
                              grade: st.grade,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-sm">
                        <Flame size={14} />
                        {stats.streak}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {tc.streak || "Chuỗi"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-emerald-600 font-black text-sm">
                        <CheckCircle2 size={14} />
                        {stats.completedTopics}/{stats.totalTopics}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {tc.completed || "Đã xong"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-blue-600 font-black text-sm">
                        <BarChart2 size={14} />
                        {stats.totalRecordings}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {tc.recordings || "Bài thu"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  className="flex items-center justify-between pt-3 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setResetPassStudent(st)}
                    className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                  >
                    <Key size={13} />
                    {tc.resetPasswordBtn || tc.resetPasswordTitle || "Đổi MK"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingStudent(st)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title={tc.edit || "Sửa"}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(st)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={tc.delete || "Xóa"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <CreateStudentModal
          onCreated={(newSt) => {
            setStudents((prev) => [newSt, ...prev]);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onUpdated={(updated) => {
            setStudents((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            );
          }}
          onClose={() => setEditingStudent(null)}
        />
      )}

      {resetPassStudent && (
        <ResetPasswordModal
          student={resetPassStudent}
          onClose={() => setResetPassStudent(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={
            tm.deleteStudentTitle ||
            tm.deleteStudentNote ||
            "Xác nhận xóa học sinh"
          }
          description={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
export default StudentsManager;

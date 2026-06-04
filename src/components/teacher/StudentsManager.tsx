import {
  Award,
  BarChart2,
  BookOpen,
  ChevronDown,
  Circle,
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
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import { calculateStreak } from "../../utils";
import { CreateStudentModal } from "./CreateStudentModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { EditStudentModal } from "./EditStudentModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

const avatarColors = [
  "bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]",
  "bg-[#F3E5F5] text-[#8E24AA] border-[#CE93D8]",
  "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]",
  "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
  "bg-[#FCE4EC] text-[#C62828] border-[#F48FB1]",
  "bg-[#E0F7FA] text-[#00838F] border-[#80DEEA]",
];

const formatDate = (ts: string) => {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export function StudentsManager() {
  const { t } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<{
    student: any;
    recCount: number;
  } | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [resetPasswordTarget, setResetPasswordTarget] = useState<any | null>(
    null,
  );
  const [editStudentTarget, setEditStudentTarget] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studRes, recRes, topRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, name, role, avatar, year_born, password")
            .eq("role", "student")
            .order("name"),
          supabase
            .from("recordings")
            .select("id,studentName,topicNumber,topic,createdAt")
            .order("createdAt", { ascending: false }),
          supabase
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

  const deleteStudent = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteStudentTarget) return;
    setDeleteSaving(true);
    setDeleteError("");
    try {
      const { error } = await supabase
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
            <p className="text-xs font-bold text-slate-400">
              {t.teacherNav.students}
            </p>
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
            <p className="text-xs font-bold text-slate-400">
              {t.common.totalSubmissions}
            </p>
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
          placeholder={t.common.searchStudent}
          className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] shadow-sm"
        />
      </div>

      {/* Student list */}
      <div className="bg-white rounded-[2rem] shadow-md border border-slate-100 overflow-hidden">
        <div className="p-4 border-b-2 border-slate-100 flex items-center gap-2 bg-slate-50">
          <Users size={16} className="text-slate-500" />
          <h3 className="font-extrabold text-slate-700 text-sm">
            {t.common.studentList}
          </h3>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-extrabold transition-all"
          >
            <UserPlus size={14} /> {t.common.addStudent}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-bold">
            {t.recordings.empty}
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
                  <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    {/* Main row */}
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <span
                        className={`w-11 h-11 rounded-2xl border-2 font-black flex items-center justify-center shrink-0 ${student.avatar ? "bg-amber-50 text-2xl shadow-sm border-amber-200" : `text-sm ${colorClass}`}`}
                      >
                        {student.avatar || initials}
                      </span>

                      {/* Name + date */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-extrabold text-slate-800 text-sm">
                            {student.name}
                          </p>
                          {student.year_born && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium shrink-0">
                              {student.year_born}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          {lastRec
                            ? `${t.recordings.latest} ${formatDate(lastRec.createdAt)}`
                            : t.common.notSubmitted}
                        </p>
                      </div>

                      {/* Progress + actions + chevron */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Progress */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-black text-slate-600">
                            {doneCount}/{totalTopics}
                          </span>
                          <div className="flex items-center gap-1">
                            {doneCount > 0 && (
                              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-200">
                                <Award size={9} /> {doneCount}
                              </span>
                            )}
                            {calculateStreak(studentRecs) > 0 && (
                              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-orange-200">
                                <Flame size={9} className="fill-orange-500" />{" "}
                                {calculateStreak(studentRecs)}
                              </span>
                            )}
                          </div>
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
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

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 border-l border-slate-100 pl-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditStudentTarget(student);
                            }}
                            className="p-1.5 text-slate-300 hover:text-[#4CAF50] hover:bg-[#E8F5E9] rounded-lg transition-all"
                            title={t.common.edit}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResetPasswordTarget(student);
                            }}
                            className="p-1.5 text-slate-300 hover:text-[#1E88E5] hover:bg-[#E3F2FD] rounded-lg transition-all"
                            title={t.common.changePassword}
                          >
                            <Key size={13} />
                          </button>
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
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title={t.common.delete}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Chevron */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStudent(isExpanded ? null : student.id)
                          }
                          className="p-1 text-slate-400 hover:text-slate-600 transition-all"
                        >
                          <ChevronDown
                            size={15}
                            className="transition-transform duration-200"
                            style={{
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 bg-slate-50/60 border-t border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                        {t.common.topicProgress}
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
                              className={`rounded-xl p-2.5 border-2 flex flex-col gap-1 ${done ? "bg-[#E8F5E9] border-[#A5D6A7]" : "bg-white border-slate-100"}`}
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
                                  className={`text-xs font-black truncate ${done ? "text-[#2E7D32]" : "text-slate-400"}`}
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
                        {topics.length === 0 && (
                          <p className="text-xs text-slate-400 font-bold">
                            {t.common.noTopics}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteStudentTarget && (
        <DeleteConfirmModal
          title={t.common.deleteConfirm}
          description={t.common.deleteStudentDesc.replace(
            "{name}",
            deleteStudentTarget.student.name,
          )}
          confirmLabel={
            deleteStudentTarget.recCount > 0
              ? t.common.deleteStudentConfirm
              : t.common.deleteConfirm
          }
          saving={deleteSaving}
          error={deleteError}
          onConfirm={deleteStudent}
          onCancel={() => setDeleteStudentTarget(null)}
        >
          {deleteStudentTarget.recCount > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-amber-600 font-bold">
                {t.teacherModal.deleteStudentWarning}{" "}
                <span className="font-black text-amber-800">
                  {deleteStudentTarget.recCount}{" "}
                  {t.teacherModal.deleteStudentNote}
                </span>
              </p>
            </div>
          )}
        </DeleteConfirmModal>
      )}

      {resetPasswordTarget && (
        <ResetPasswordModal
          student={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
        />
      )}

      {editStudentTarget && (
        <EditStudentModal
          student={editStudentTarget}
          onUpdated={(updated) =>
            setStudents((prev) =>
              prev
                .map((s) => (s.id === updated.id ? updated : s))
                .sort((a, b) => a.name.localeCompare(b.name)),
            )
          }
          onClose={() => setEditStudentTarget(null)}
        />
      )}

      {showCreateForm && (
        <CreateStudentModal
          onCreated={(inserted) =>
            setStudents((prev) =>
              [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)),
            )
          }
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}

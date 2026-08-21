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
  X,
} from 'lucide-react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { CreateStudentModal } from './CreateStudentModal';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';
import { EditStudentModal } from './EditStudentModal';
import { ResetPasswordModal } from './ResetPasswordModal';

import { useStudentsManager } from './useStudentsManager';

const avatarColors = [
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-purple-50 text-purple-600 border-purple-200',
  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'bg-amber-50 text-amber-600 border-amber-200',
  'bg-rose-50 text-rose-600 border-rose-200',
  'bg-cyan-50 text-cyan-600 border-cyan-200',
];

export function StudentsManager({
  onSelectStudent,
}: {
  onSelectStudent: (name: string, avatar?: string) => void;
}) {
  const { t } = useLanguage();
  const tm = t.teacherModal;
  const tc = t.common;

  const {
    students,
    filteredStudents,
    availableGrades,
    loading,
    searchQuery,
    setSearchQuery,
    gradeFilter,
    setGradeFilter,
    calculateStudentStats,
    showAddModal,
    setShowAddModal,
    editingStudent,
    setEditingStudent,
    resetPassStudent,
    setResetPassStudent,
    deleteTarget,
    setDeleteTarget,
    deleteSaving,
    deleteError,
    setDeleteError,
    handleDelete,
    onStudentCreated,
    onStudentUpdated,
  } = useStudentsManager();

  useEscapeToClose(() => setShowAddModal(false), showAddModal);
  useEscapeToClose(() => setEditingStudent(null), !!editingStudent);
  useEscapeToClose(() => setResetPassStudent(null), !!resetPassStudent);
  useEscapeToClose(() => setDeleteTarget(null), !!deleteTarget);

  return (
    <div className="space-y-6">
      {/* Unified Header & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Users size={22} />
            </span>
            {tm.studentManagerTitle || 'Quản Lý Danh Sách Học Sinh'}
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {interpolate(tm.studentManagerSubtitle || 'Tổng số: {count} học sinh', {
              count: students.length,
            })}
          </p>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search bar */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={tm.searchStudentPlaceholder || 'Tìm học sinh theo tên...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Grade filter */}
          {availableGrades.length > 0 && (
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs cursor-pointer"
            >
              <option value="all">{tm.filterGradeAll || 'Tất cả khối lớp'}</option>
              {availableGrades.map((g: any) => (
                <option key={g} value={g}>
                  {interpolate(tc.gradeLabel || 'Khối {grade}', { grade: g })}
                </option>
              ))}
              <option value="none">{tm.filterGradeNone || 'Chưa có khối'}</option>
            </select>
          )}

          {/* Add student button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 transition-all shadow-xs text-xs active:scale-95 shrink-0"
          >
            <UserPlus size={16} />
            <span>{tm.addStudentBtn || 'Thêm học sinh mới'}</span>
          </button>
        </div>
      </div>

      {/* Student List Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200/80">
          <p className="text-slate-400 font-black text-sm">
            {searchQuery
              ? tm.noStudentFound || 'Không tìm thấy học sinh nào'
              : tm.noStudentsYet || 'Chưa có học sinh nào'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
          {filteredStudents.map((st, idx) => {
            const stats = calculateStudentStats(st.name);
            const colorClass = avatarColors[idx % avatarColors.length];

            return (
              <div
                key={st.id}
                onClick={() => onSelectStudent(st.name, st.avatar || undefined)}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-center gap-3.5 mb-3.5">
                    <span
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs text-lg font-black group-hover:scale-105 transition-transform ${
                        st.avatar ? 'bg-amber-50 border-amber-200 text-2xl' : colorClass
                      }`}
                    >
                      {st.avatar ||
                        st.name
                          .split(' ')
                          .map((w: string) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 text-base truncate group-hover:text-emerald-600 transition-colors">
                        {st.name}
                      </h3>
                      {st.username && (
                        <p className="text-[11px] font-bold text-emerald-600 truncate font-mono">
                          @{st.username}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {st.year_born && (
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date().getFullYear() - st.year_born} {tc.yearsOld || 'tuổi'}
                          </span>
                        )}
                        {st.grade && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-lg text-[10px] font-black shadow-2xs">
                            {interpolate(tc.gradeLabel || 'Lớp {grade}', {
                              grade: st.grade,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 mb-3.5 text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center gap-0.5 text-amber-500 font-black text-xs sm:text-sm">
                        <Flame size={13} className="shrink-0" />
                        <span>{stats.streak}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-0.5">
                        {tc.streak || 'Chuỗi'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center border-x border-slate-200/60 px-1">
                      <div className="flex items-center justify-center gap-0.5 text-emerald-600 font-black text-xs sm:text-sm">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>
                          {stats.completedTopics}/{stats.totalTopics}
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-0.5">
                        {tc.completed || 'Đã xong'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center gap-0.5 text-blue-600 font-black text-xs sm:text-sm">
                        <BarChart2 size={13} className="shrink-0" />
                        <span>{stats.totalRecordings}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-0.5">
                        {tc.recordings || 'Bài thu'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  className="flex items-center justify-between pt-3 border-t border-slate-100"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setResetPassStudent(st)}
                    className="px-2.5 py-1.5 bg-blue-50/70 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-xs font-black rounded-xl border border-blue-100 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Key size={13} />
                    <span>{tc.resetPasswordBtn || 'Đổi MK'}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingStudent(st)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 hover:border-emerald-200 shadow-2xs transition-all active:scale-95"
                      title={tc.edit || 'Sửa'}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(st)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-100 hover:border-rose-200 shadow-2xs transition-all active:scale-95"
                      title={tc.delete || 'Xóa'}
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
          onCreated={newSt => {
            onStudentCreated(newSt);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onUpdated={updated => {
            onStudentUpdated(updated);
            setEditingStudent(null);
          }}
          onClose={() => setEditingStudent(null)}
        />
      )}

      {resetPassStudent && (
        <ResetPasswordModal student={resetPassStudent} onClose={() => setResetPassStudent(null)} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={tm.deleteStudentTitle || tm.deleteStudentNote || 'Xác nhận xóa học sinh'}
          description={deleteTarget.name}
          saving={deleteSaving}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError('');
          }}
        />
      )}
    </div>
  );
}
export default StudentsManager;

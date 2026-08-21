import React, { useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { AdminTeacherItem } from '../../../services/adminService';
import { TeacherCard } from './TeacherCard';
import { AddTeacherModal } from './AddTeacherModal';
import { EditTeacherModal } from './EditTeacherModal';
import { DeleteTeacherModal } from './DeleteTeacherModal';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';

export interface AdminTeachersProps {
  teachers: AdminTeacherItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function AdminTeachers({ teachers, loading, onRefresh }: AdminTeachersProps) {
  const { t } = useLanguage();
  const tAdmin = t.admin;

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<AdminTeacherItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTeacherItem | null>(null);

  const filtered = teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{tAdmin.tabTeachers}</h2>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            {interpolate(tAdmin.teachersManagerTitle, { count: teachers.length })}
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tAdmin.searchTeacherPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-500/20 transition-all shrink-0 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> {tAdmin.addTeacherBtn}
          </button>
        </div>
      </div>

      {/* Teachers List */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200/80">
          {tAdmin.noTeachersFound}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onEdit={item => setEditingTeacher(item)}
              onDelete={item => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddTeacherModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={onRefresh}
      />

      <EditTeacherModal
        teacher={editingTeacher}
        onClose={() => setEditingTeacher(null)}
        onSuccess={onRefresh}
      />

      <DeleteTeacherModal
        teacher={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}

export default AdminTeachers;

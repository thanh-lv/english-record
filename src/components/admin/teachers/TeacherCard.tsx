import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { AdminTeacherItem } from '../../../services/adminService';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface TeacherCardProps {
  teacher: AdminTeacherItem;
  onEdit: (teacher: AdminTeacherItem) => void;
  onDelete: (teacher: AdminTeacherItem) => void;
}

export function TeacherCard({ teacher, onEdit, onDelete }: TeacherCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-sm">
              {teacher.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h4 className="font-black text-slate-800 text-base">{teacher.name}</h4>
              {teacher.auth_uid ? (
                <p
                  className="text-[10px] font-mono text-emerald-600 font-bold truncate max-w-[200px]"
                  title={teacher.auth_uid}
                >
                  UID: {teacher.auth_uid}
                </p>
              ) : (
                <p className="text-[10px] font-bold text-amber-500">Unlinked Auth UID</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl mb-4 text-center">
          <div>
            <span className="block text-xs font-black text-emerald-600">
              {teacher.student_count}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{t.admin.thStudentsCount}</span>
          </div>
          <div>
            <span className="block text-xs font-black text-blue-600">
              {teacher.recording_count}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {t.admin.thRecordingsCount}
            </span>
          </div>
          <div>
            <span className="block text-xs font-black text-purple-600">{teacher.topic_count}</span>
            <span className="text-[10px] font-bold text-slate-400">{t.admin.thTopicsCount}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onEdit(teacher)}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
        >
          <Edit2 size={13} /> {t.common.edit}
        </button>
        <button
          type="button"
          onClick={() => onDelete(teacher)}
          className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs transition-colors cursor-pointer"
        >
          <Trash2 size={13} /> {t.common.delete}
        </button>
      </div>
    </div>
  );
}

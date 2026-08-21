import React, { useState, useEffect } from 'react';
import { Edit2, X, Loader2 } from 'lucide-react';
import { adminService, AdminTeacherItem } from '../../../services/adminService';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface EditTeacherModalProps {
  teacher: AdminTeacherItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTeacherModal({ teacher, onClose, onSuccess }: EditTeacherModalProps) {
  const { t } = useLanguage();
  const tAdmin = t.admin;

  const [editName, setEditName] = useState('');
  const [editAuthUid, setEditAuthUid] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (teacher) {
      setEditName(teacher.name || '');
      setEditAuthUid(teacher.auth_uid || '');
      setError('');
    }
  }, [teacher]);

  if (!teacher) return null;

  const handleUpdate = async () => {
    if (!editName.trim()) {
      setError(tAdmin.nameRequired);
      return;
    }
    setEditSaving(true);
    setError('');
    try {
      await adminService.updateTeacher(teacher.id, {
        name: editName.trim(),
        auth_uid: editAuthUid.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating teacher');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-black text-base text-slate-800 flex items-center gap-2">
            <Edit2 size={18} className="text-indigo-600" /> {t.common.edit}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {tAdmin.teacherNameLabel} <span className="text-rose-500">*</span>
            </label>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUpdate()}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {tAdmin.authIdLabel}{' '}
              <span className="text-slate-400 font-normal">{tAdmin.authIdOptional}</span>
            </label>
            <input
              value={editAuthUid}
              onChange={e => setEditAuthUid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUpdate()}
              placeholder={tAdmin.authIdPlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white font-mono"
            />
          </div>
        </div>
        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-200 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={editSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {editSaving && <Loader2 size={13} className="animate-spin" />} {t.common.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

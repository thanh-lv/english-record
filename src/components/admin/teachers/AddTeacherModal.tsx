import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTeacherModal({ isOpen, onClose, onSuccess }: AddTeacherModalProps) {
  const { t } = useLanguage();
  const tAdmin = t.admin;

  const [newName, setNewName] = useState('');
  const [newAuthUid, setNewAuthUid] = useState('');
  const [addingSaving, setAddingSaving] = useState(false);
  const [addError, setAddError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newName.trim()) {
      setAddError(tAdmin.nameRequired);
      return;
    }
    setAddingSaving(true);
    setAddError('');
    try {
      await adminService.createTeacher({
        name: newName.trim(),
        auth_uid: newAuthUid.trim() || undefined,
      });
      setNewName('');
      setNewAuthUid('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setAddError(err.message || tAdmin.createTeacherError);
    } finally {
      setAddingSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-black text-base text-slate-800 flex items-center gap-2">
            <Plus size={18} className="text-indigo-600" /> {tAdmin.addTeacherTitle}
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
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={tAdmin.teacherNamePlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {tAdmin.authIdLabel}{' '}
              <span className="text-slate-400 font-normal">{tAdmin.authIdOptional}</span>
            </label>
            <input
              value={newAuthUid}
              onChange={e => setNewAuthUid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={tAdmin.authIdPlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white font-mono"
            />
          </div>
        </div>
        {addError && <p className="text-xs font-bold text-rose-600">{addError}</p>}
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
            onClick={handleCreate}
            disabled={addingSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {addingSaving && <Loader2 size={13} className="animate-spin" />}{' '}
            {tAdmin.createTeacherBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

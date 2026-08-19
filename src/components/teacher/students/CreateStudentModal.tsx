import { AlertCircle, Check, Eye, EyeOff, Loader2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { studentService } from '../../../services/studentService';
import {
  validateStudentName,
  validatePassword,
  validateYearBorn,
  validateGrade,
  sanitizeText,
} from '../../../utils/validators';

interface CreateStudentModalProps {
  onCreated: (student: any) => void;
  onClose: () => void;
}

export function CreateStudentModal({ onCreated, onClose }: CreateStudentModalProps) {
  const [name, setName] = useState('');
  const [yearBorn, setYearBorn] = useState('2015');
  const [grade, setGrade] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  useEscapeToClose(onClose);

  const handleCreate = async () => {
    const cleanName = sanitizeText(name);
    const cleanPass = password.trim();

    const nameValidation = validateStudentName(cleanName, {
      required: t.common.nameMin,
      min: t.common.nameMin,
      max: t.common.nameMax,
    });
    if (!nameValidation.isValid) {
      setError(nameValidation.error || t.common.nameMin);
      return;
    }

    const passValidation = validatePassword(cleanPass, 3, {
      required: t.common.passwordMin,
      min: t.common.passwordMin,
      max: t.common.passwordMax,
    });
    if (!passValidation.isValid) {
      setError(passValidation.error || t.common.passwordMin);
      return;
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 15;
    const maxYear = currentYear - 2;
    const yearValidation = validateYearBorn(
      yearBorn,
      minYear,
      maxYear,
      interpolate(t.common.yearBornInvalid, { min: minYear, max: maxYear })
    );
    if (!yearValidation.isValid) {
      setError(yearValidation.error || '');
      return;
    }
    const parsedYear = parseInt(yearBorn.trim(), 10);

    const gradeValidation = validateGrade(grade, t.common.gradeInvalid);
    if (!gradeValidation.isValid) {
      setError(gradeValidation.error || t.common.gradeInvalid);
      return;
    }
    const parsedGrade = grade.trim() ? parseInt(grade.trim(), 10) : null;

    setSaving(true);
    setError('');
    try {
      const exists = await studentService.checkStudentNameExists(cleanName);
      if (exists) {
        setError(t.common.nameDuplicate);
        return;
      }

      const inserted = await studentService.createStudent({
        name: cleanName,
        password: cleanPass,
        year_born: parsedYear,
        grade: parsedGrade,
      });

      onCreated(inserted);
      onClose();
    } catch (err: any) {
      setError(err.message || t.common.createStudentError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-student-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4
            id="create-student-title"
            className="font-black text-lg text-slate-800 flex items-center gap-2"
          >
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserPlus size={18} />
            </span>
            {t.teacherModal.addStudentTitle || 'Thêm học sinh mới'}
          </h4>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
              {t.common.studentName}
            </label>
            <input
              autoFocus
              value={name}
              maxLength={50}
              onChange={e => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={t.login.namePlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                {t.common.yearBorn}
              </label>
              <input
                type="number"
                value={yearBorn}
                onChange={e => {
                  setYearBorn(e.target.value);
                  setError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={t.common.yearBornPlaceholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                {t.common.grade}
              </label>
              <select
                value={grade}
                onChange={e => {
                  setGrade(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
              >
                <option value="">{t.common.selectGrade}</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                  <option key={g} value={g}>
                    {interpolate(t.common.gradeLabel, { grade: g })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
              {t.common.password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                maxLength={100}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={t.login.passwordPlaceholder}
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? t.common.hidePassword : t.common.showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-all"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {t.common.createStudent || t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

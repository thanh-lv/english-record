import { AlertCircle, Loader2, Pencil, Save, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { studentService } from '../../../services/studentService';
import { validateYearBorn, validateGrade } from '../../../utils/validators';

interface EditStudentModalProps {
  student: any;
  onUpdated: (updated: any) => void;
  onClose: () => void;
}

export function EditStudentModal({ student, onUpdated, onClose }: EditStudentModalProps) {
  const [yearBorn, setYearBorn] = useState(student.year_born?.toString() || '2015');
  const [grade, setGrade] = useState(student.grade?.toString() || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  useEscapeToClose(onClose);

  const handleSave = async () => {
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
      const data = await studentService.updateStudent(student.id, {
        year_born: parsedYear,
        grade: parsedGrade,
      });

      onUpdated(data);
      onClose();
    } catch (err: any) {
      setError(err.message || t.common.updateStudentError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4
            id="edit-student-title"
            className="font-black text-lg text-slate-800 flex items-center gap-2"
          >
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Pencil size={18} />
            </span>
            {t.common.editStudentTitle || 'Chỉnh sửa học sinh'}
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
                onKeyDown={e => e.key === 'Enter' && handleSave()}
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
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? t.common.saving : t.common.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

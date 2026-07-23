import { AlertCircle, Loader2, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useLanguage, interpolate } from "../../i18n/LanguageContext";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";
import { supabase } from "../../lib/supabase";

interface EditStudentModalProps {
  student: any;
  onUpdated: (updated: any) => void;
  onClose: () => void;
}

export function EditStudentModal({
  student,
  onUpdated,
  onClose,
}: EditStudentModalProps) {
  const [yearBorn, setYearBorn] = useState(
    student.year_born?.toString() || "2015",
  );
  const [grade, setGrade] = useState(student.grade || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  useEscapeToClose(onClose);

  const handleSave = async () => {
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 15;
    const maxYear = currentYear - 2;
    const parsedYear = parseInt(yearBorn);
    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < minYear ||
      parsedYear > maxYear
    ) {
      setError(
        interpolate(t.common.yearBornInvalid, { min: minYear, max: maxYear }),
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updatePayload: any = {
        year_born: parsedYear,
        grade: grade.trim() || null,
      };
      let data: any = null;
      const res = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", student.id)
        .select()
        .single();

      if (res.error) {
        if (res.error.message?.includes("grade")) {
          delete updatePayload.grade;
          const retryRes = await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", student.id)
            .select()
            .single();
          if (retryRes.error) throw retryRes.error;
          data = retryRes.data;
        } else {
          throw res.error;
        }
      } else {
        data = res.data;
      }

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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-title"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-emerald-100 p-6 space-y-5 animate-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 flex items-center justify-center">
            <Pencil size={20} />
          </div>
          <div>
            <h4
              id="edit-student-title"
              className="font-extrabold text-slate-800 text-lg leading-tight"
            >
              {t.common.editStudentTitle}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {t.common.editStudentSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
              {t.common.yearBorn}
            </label>
            <input
              type="number"
              value={yearBorn}
              onChange={(e) => {
                setYearBorn(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
              {t.common.grade}
            </label>
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setError("");
              }}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
            >
              <option value="">{t.common.selectGrade}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  {interpolate(t.common.gradeLabel, { grade: g })}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? t.common.saving : t.common.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

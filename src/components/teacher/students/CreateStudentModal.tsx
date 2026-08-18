import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";
import { supabase } from "../../../lib/supabase";

interface CreateStudentModalProps {
  onCreated: (student: any) => void;
  onClose: () => void;
}

export function CreateStudentModal({
  onCreated,
  onClose,
}: CreateStudentModalProps) {
  const [name, setName] = useState("");
  const [yearBorn, setYearBorn] = useState("2015");
  const [grade, setGrade] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  useEscapeToClose(onClose);

  const handleCreate = async () => {
    const trimName = name.trim();
    const trimPass = password.trim();
    const trimGrade = grade.trim();
    if (trimName.length < 2) {
      setError(t.common.nameMin);
      return;
    }
    if (trimPass.length < 3) {
      setError(t.common.passwordMin);
      return;
    }
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

    let parsedGrade: string | number | null = null;
    if (trimGrade) {
      const gNum = parseInt(trimGrade, 10);
      if (isNaN(gNum) || gNum < 1 || gNum > 12) {
        setError(t.common.gradeInvalid);
        return;
      }
      parsedGrade = gNum;
    }

    setSaving(true);
    setError("");
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("name", trimName)
        .maybeSingle();
      if (existing) {
        setError(t.common.nameDuplicate);
        return;
      }

      const insertPayload: any = {
        name: trimName,
        role: "student",
        password: trimPass,
        year_born: parsedYear,
        grade: parsedGrade,
      };

      let inserted: any = null;
      const res = await supabase
        .from("profiles")
        .insert(insertPayload)
        .select()
        .single();

      if (res.error) {
        if (res.error.message?.includes("grade")) {
          delete insertPayload.grade;
          const retryRes = await supabase
            .from("profiles")
            .insert(insertPayload)
            .select()
            .single();
          if (retryRes.error) throw retryRes.error;
          inserted = retryRes.data;
        } else {
          throw res.error;
        }
      } else {
        inserted = res.data;
      }

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
            {t.teacherModal.addStudentTitle || "Thêm học sinh mới"}
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
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
                onChange={(e) => {
                  setYearBorn(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
                onChange={(e) => {
                  setGrade(e.target.value);
                  setError("");
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
              >
                <option value="">{t.common.selectGrade}</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder={t.login.passwordPlaceholder}
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? t.common.hidePassword : t.common.showPassword
                }
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
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {t.common.createStudent || t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

import { AlertCircle, Check, Eye, EyeOff, Key, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";
import { supabase } from "../../lib/supabase";

interface ResetPasswordModalProps {
  student: any;
  onClose: () => void;
}

export function ResetPasswordModal({
  student,
  onClose,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();
  useEscapeToClose(onClose);

  const handleReset = async () => {
    const trimPass = password.trim();
    if (trimPass.length < 3) {
      setError(t.common.passwordMin);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ password: trimPass })
        .eq("id", student.id);
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-title"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-blue-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center">
            <Key size={20} />
          </div>
          <div>
            <h4
              id="reset-password-title"
              className="font-extrabold text-slate-800 text-lg leading-tight"
            >
              {t.common.resetPasswordTitle}
            </h4>
            <p className="text-sm font-bold text-slate-500">{student.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
              {t.common.newPassword}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                placeholder={t.login.passwordPlaceholder}
                className="w-full px-4 py-3 pr-11 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? t.common.hidePassword : t.common.showPassword
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className={`flex-1 py-2.5 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md flex items-center justify-center gap-2 border-b-4 ${success ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-700" : "bg-[#1E88E5] hover:bg-blue-600 border-blue-800"}`}
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : success ? (
              <Check size={15} />
            ) : (
              <Key size={15} />
            )}
            {success ? t.common.success : t.common.changePassword}
          </button>
        </div>
      </div>
    </div>
  );
}

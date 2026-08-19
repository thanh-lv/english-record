import { AlertCircle, Check, Eye, EyeOff, Key, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { studentService } from '../../../services/studentService';
import { validatePassword } from '../../../utils/validators';

interface ResetPasswordModalProps {
  student: any;
  onClose: () => void;
}

export function ResetPasswordModal({ student, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();
  useEscapeToClose(onClose);

  const handleReset = async () => {
    const cleanPass = password.trim();
    const passValidation = validatePassword(cleanPass, 3, {
      required: t.common.passwordMin,
      min: t.common.passwordMin,
      max: t.common.passwordMax,
    });
    if (!passValidation.isValid) {
      setError(passValidation.error || t.common.passwordMin);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await studentService.resetStudentPassword(student.id, cleanPass);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || t.common.changePasswordError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Key size={18} />
            </span>
            <div>
              <h4
                id="reset-password-title"
                className="font-black text-lg text-slate-800 leading-tight"
              >
                {t.common.resetPasswordTitle}
              </h4>
              <p className="text-xs font-bold text-slate-400 mt-0.5">{student.name}</p>
            </div>
          </div>
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
              {t.common.newPassword}
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
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                placeholder={t.login.passwordPlaceholder}
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
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
            onClick={handleReset}
            disabled={saving}
            className={`px-4 py-2 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${success ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#1E88E5] hover:bg-[#1565C0]'}`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : success ? (
              <Check size={14} />
            ) : (
              <Key size={14} />
            )}
            {success ? t.common.success : t.common.changePassword}
          </button>
        </div>
      </div>
    </div>
  );
}

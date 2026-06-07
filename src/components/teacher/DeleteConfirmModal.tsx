import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";

interface DeleteConfirmModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  saving?: boolean;
  error?: string;
  onConfirm: (e: React.MouseEvent) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function DeleteConfirmModal({
  title,
  description,
  confirmLabel,
  saving = false,
  error,
  onConfirm,
  onCancel,
  children,
}: DeleteConfirmModalProps) {
  const { t } = useLanguage();
  useEscapeToClose(onCancel);
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-6 border-4 border-rose-100 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1">
            <h4
              id="delete-confirm-title"
              className="font-extrabold text-slate-800 text-lg"
            >
              {title}
            </h4>
            <p className="text-sm text-slate-500 font-medium">{description}</p>
          </div>
        </div>

        {children}

        {error && (
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200 shadow-sm"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

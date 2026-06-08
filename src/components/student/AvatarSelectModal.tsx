import { useLanguage } from "../../i18n/LanguageContext";
import { X } from "lucide-react";
import { AVATARS } from "./hooks/useAvatar";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";

interface AvatarSelectModalProps {
  currentAvatar: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function AvatarSelectModal({
  currentAvatar,
  onSelect,
  onClose,
}: AvatarSelectModalProps) {
  const { t } = useLanguage();
  useEscapeToClose(onClose);
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-select-title"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 border-4 border-amber-200 shadow-2xl animate-in zoom-in-95 duration-200 relative my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
        >
          <X size={20} />
        </button>
        <h3
          id="avatar-select-title"
          className="text-xl font-black text-slate-800 text-center mb-6"
        >
          {t.common.selectAvatar}
        </h3>
        <div
          className="grid grid-cols-4 gap-4"
          role="radiogroup"
          aria-label={t.common.selectAvatar}
        >
          {AVATARS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              role="radio"
              aria-checked={currentAvatar === emoji}
              aria-label={emoji}
              className={`aspect-square rounded-2xl text-4xl flex items-center justify-center transition-all ${
                currentAvatar === emoji
                  ? "bg-amber-100 border-4 border-amber-400 scale-110 shadow-md"
                  : "bg-slate-50 border-2 border-slate-100 hover:bg-amber-50 hover:border-amber-200 hover:scale-105"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

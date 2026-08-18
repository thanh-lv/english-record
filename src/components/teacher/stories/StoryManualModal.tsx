import { Loader2, X } from "lucide-react";

import { Translations } from "../../../i18n/LanguageContext";

interface StoryManualModalProps {
  t: Translations;
  manualTitle: string;
  manualContent: string;
  manualEmoji: string;
  manualType: string;
  manualYearBorn: string;
  manualSaving: boolean;
  manualError: string;
  onTitleChange: (val: string) => void;
  onEmojiChange: (val: string) => void;
  onTypeChange: (val: string) => void;
  onYearBornChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function StoryManualModal({
  t,
  manualTitle,
  manualContent,
  manualEmoji,
  manualType,
  manualYearBorn,
  manualSaving,
  manualError,
  onTitleChange,
  onEmojiChange,
  onTypeChange,
  onYearBornChange,
  onContentChange,
  onSave,
  onClose,
}: StoryManualModalProps) {
  const tc = t.common;

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg w-full max-w-xl shadow-md border-4 border-blue-100 p-6 space-y-4 my-8">
        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
          <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
            ✍️ {tc.createManualStory || "Viết truyện mới"}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                {tc.storyTitle || "Tiêu đề"}
              </label>
              <input
                value={manualTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="VD: The Little Cat"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                {tc.storyEmoji || "Emoji"}
              </label>
              <input
                value={manualEmoji}
                onChange={(e) => onEmojiChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                {tc.storyGenre || "Thể loại"}
              </label>
              <input
                value={manualType}
                onChange={(e) => onTypeChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                {tc.storyYearBorn || "Độ tuổi (Năm sinh)"}
              </label>
              <select
                value={manualYearBorn}
                onChange={(e) => onYearBornChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-400 focus:outline-none"
              >
                <option value="2018">
                  {t.teacherModal.ageKindergartenOption}
                </option>
                <option value="2015">{t.teacherModal.agePrimaryOption}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
              {tc.readingContentLabel || "Nội dung bài đọc (Tiếng Anh)"}
            </label>
            <textarea
              rows={5}
              value={manualContent}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={
                tc.readingContentPlaceholder ||
                "Nhập nội dung truyện bằng tiếng Anh..."
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-400 focus:outline-none leading-relaxed"
            />
          </div>

          {manualError && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
              {manualError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
          >
            {tc.cancel || "Hủy"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={manualSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
          >
            {manualSaving && <Loader2 size={14} className="animate-spin" />}
            {t.teacherModal?.saveStory || tc.save || "Lưu câu chuyện"}
          </button>
        </div>
      </div>
    </div>
  );
}

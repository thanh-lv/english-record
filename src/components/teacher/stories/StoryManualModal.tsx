import { Loader2, X } from 'lucide-react';
import { Translations, interpolate } from '../../../i18n/LanguageContext';

interface StoryManualModalProps {
  t: Translations;
  manualTitle: string;
  manualContent: string;
  manualEmoji: string;
  manualType: string;
  manualGrades: number[];
  manualSaving: boolean;
  manualError: string;
  onTitleChange: (val: string) => void;
  onEmojiChange: (val: string) => void;
  onTypeChange: (val: string) => void;
  onManualGradesChange: (val: number[]) => void;
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
  manualGrades,
  manualSaving,
  manualError,
  onTitleChange,
  onEmojiChange,
  onTypeChange,
  onManualGradesChange,
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
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
            ✍️ {tc.createManualStory || 'Viết truyện mới'}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                {tc.storyTitle || 'Tiêu đề'}
              </label>
              <input
                value={manualTitle}
                maxLength={150}
                onChange={e => onTitleChange(e.target.value)}
                placeholder="VD: The Little Cat"
                className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                {tc.storyEmoji || 'Emoji'}
              </label>
              <input
                value={manualEmoji}
                maxLength={10}
                onChange={e => onEmojiChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {tc.storyGenre || 'Thể loại'}
            </label>
            <input
              value={manualType}
              maxLength={50}
              onChange={e => onTypeChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {t.teacherModal?.targetGrades || 'Khối / Lớp áp dụng'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <button
                type="button"
                onClick={() => onManualGradesChange([])}
                className={`px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                  manualGrades.length === 0
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                }`}
              >
                {t.teacherModal?.allGradesOption || 'Tất cả các khối'}
              </button>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => {
                const isSelected = manualGrades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      onManualGradesChange(
                        isSelected
                          ? manualGrades.filter(x => x !== g)
                          : [...manualGrades, g].sort((a, b) => a - b)
                      );
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    {interpolate(t.common.gradeLabel, { grade: g })}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{t.teacherModal?.gradesHint}</p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
              {tc.readingContentLabel || 'Nội dung bài đọc (Tiếng Anh)'}
            </label>
            <textarea
              rows={5}
              value={manualContent}
              maxLength={10000}
              onChange={e => onContentChange(e.target.value)}
              placeholder={tc.readingContentPlaceholder || 'Nhập nội dung truyện bằng tiếng Anh...'}
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
            {tc.cancel || 'Hủy'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={manualSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
          >
            {manualSaving && <Loader2 size={14} className="animate-spin" />}
            {t.teacherModal?.saveStory || tc.save || 'Lưu câu chuyện'}
          </button>
        </div>
      </div>
    </div>
  );
}

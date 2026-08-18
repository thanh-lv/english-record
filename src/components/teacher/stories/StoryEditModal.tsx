import { AlertCircle, Loader2, Pencil, X } from "lucide-react";
import { Story } from "../../../types";
import { Translations, interpolate } from "../../../i18n/LanguageContext";

interface StoryEditModalProps {
  t: Translations;
  editingStory: Story;
  editTitle: string;
  editEmoji: string;
  editGrades: number[];
  editContent: string;
  editError: string;
  editSaving: boolean;
  onTitleChange: (val: string) => void;
  onEmojiChange: (val: string) => void;
  onGradesChange: (val: number[]) => void;
  onContentChange: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function StoryEditModal({
  t,
  editTitle,
  editEmoji,
  editGrades,
  editContent,
  editError,
  editSaving,
  onTitleChange,
  onEmojiChange,
  onGradesChange,
  onContentChange,
  onSave,
  onClose,
}: StoryEditModalProps) {
  const tc = t.common;

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
            <Pencil className="text-amber-500" />{" "}
            {tc.editStoryInfo || "Chỉnh sửa câu chuyện"}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                {tc.storyTitle || "Tiêu đề"}
              </label>
              <input
                value={editTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                {tc.storyEmoji || "Biểu tượng"}
              </label>
              <input
                value={editEmoji}
                onChange={(e) => onEmojiChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {t.teacherModal?.targetGrades || "Khối / Lớp áp dụng"}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <button
                type="button"
                onClick={() => onGradesChange([])}
                className={`px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                  editGrades.length === 0
                    ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                }`}
              >
                {t.teacherModal?.allGradesOption || "Tất cả các khối"}
              </button>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
                const isSelected = editGrades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      onGradesChange(
                        isSelected
                          ? editGrades.filter((x) => x !== g)
                          : [...editGrades, g].sort((a, b) => a - b),
                      );
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                      isSelected
                        ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                    }`}
                  >
                    {interpolate(t.common.gradeLabel, { grade: g })}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {t.teacherModal?.gradesHint}
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {tc.storyContent || "Nội dung tiếng Anh"}
            </label>
            <textarea
              rows={6}
              value={editContent}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-amber-400 focus:outline-none leading-relaxed"
            />
          </div>

          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle size={15} /> {editError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-sm transition-colors"
          >
            {tc.cancel || "Hủy"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={editSaving}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-sm shadow-md transition-colors flex items-center gap-1.5"
          >
            {editSaving && <Loader2 size={16} className="animate-spin" />}
            {tc.saveChanges || "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

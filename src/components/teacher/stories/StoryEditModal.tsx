import { AlertCircle, Loader2, Pencil, X } from "lucide-react";
import { Story } from "../../../types";

interface StoryEditModalProps {
  t: any;
  editingStory: Story;
  editTitle: string;
  editEmoji: string;
  editContent: string;
  editError: string;
  editSaving: boolean;
  onTitleChange: (val: string) => void;
  onEmojiChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function StoryEditModal({
  t,
  editTitle,
  editEmoji,
  editContent,
  editError,
  editSaving,
  onTitleChange,
  onEmojiChange,
  onContentChange,
  onSave,
  onClose,
}: StoryEditModalProps) {
  const tc = (t as any).common || {};

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-md border-4 border-amber-100 p-6 space-y-5 my-8">
        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
          <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
            <Pencil className="text-amber-500" />{" "}
            {tc.editStoryInfo || "Chỉnh sửa câu chuyện"}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                {tc.storyTitle || "Tiêu đề"}
              </label>
              <input
                value={editTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                {tc.storyEmoji || "Biểu tượng"}
              </label>
              <input
                value={editEmoji}
                onChange={(e) => onEmojiChange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>
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
            {tc.save || "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { Loader2, Wand2, X } from "lucide-react";

interface StoryCreateModalProps {
  t: any;
  title: string;
  yearBorn: string;
  prompt: string;
  isGenerating: boolean;
  generatedStory: string;
  generatedImageUrl: string;
  isSaving: boolean;
  aiError: string;
  onTitleChange: (val: string) => void;
  onYearBornChange: (val: string) => void;
  onPromptChange: (val: string) => void;
  onGenerate: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function StoryCreateModal({
  t,
  title,
  yearBorn,
  prompt,
  isGenerating,
  generatedStory,
  generatedImageUrl,
  isSaving,
  aiError,
  onTitleChange,
  onYearBornChange,
  onPromptChange,
  onGenerate,
  onSave,
  onClose,
}: StoryCreateModalProps) {
  const tc = (t as any).common || {};

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg w-full max-w-xl shadow-md border-4 border-purple-100 p-6 space-y-4 my-8">
        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
          <h4 className="font-black text-lg text-purple-800 flex items-center gap-2">
            ✨ {tc.createAiStory || "Tạo truyện bằng AI"}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                Tiêu đề
              </label>
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="VD: The Magic Dragon"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                Năm sinh học sinh
              </label>
              <input
                value={yearBorn}
                onChange={(e) => onYearBornChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
              Ý tưởng / Gợi ý cho AI (Prompt)
            </label>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="VD: A friendly dragon who loves eating apples..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-purple-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1.5 shrink-0"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Wand2 size={14} />
                )}
                Tạo thử
              </button>
            </div>
          </div>

          {/* Generated preview */}
          {generatedStory && (
            <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200 animate-in fade-in duration-200">
              <div className="flex gap-3 items-start">
                {generatedImageUrl && (
                  <img
                    src={generatedImageUrl}
                    alt="AI Generated"
                    className="w-20 h-20 object-cover rounded-lg border border-purple-200 shrink-0"
                  />
                )}
                <p className="text-xs text-slate-700 font-medium leading-relaxed max-h-32 overflow-y-auto">
                  {generatedStory}
                </p>
              </div>
            </div>
          )}

          {aiError && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
              {aiError}
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
            disabled={isSaving || !generatedStory}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {tc.save || "Lưu câu chuyện"}
          </button>
        </div>
      </div>
    </div>
  );
}

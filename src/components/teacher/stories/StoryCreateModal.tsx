import { Loader2, Wand2, X } from 'lucide-react';
import { Translations, interpolate } from '../../../i18n/LanguageContext';

interface StoryCreateModalProps {
  t: Translations;
  title: string;
  aiGrades: number[];
  prompt: string;
  isGenerating: boolean;
  generatedStory: string;
  generatedImageUrl: string;
  isSaving: boolean;
  aiError: string;
  onTitleChange: (val: string) => void;
  onAiGradesChange: (val: number[]) => void;
  onPromptChange: (val: string) => void;
  onGenerate: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function StoryCreateModal({
  t,
  title,
  aiGrades,
  prompt,
  isGenerating,
  generatedStory,
  generatedImageUrl,
  isSaving,
  aiError,
  onTitleChange,
  onAiGradesChange,
  onPromptChange,
  onGenerate,
  onSave,
  onClose,
}: StoryCreateModalProps) {
  const tc = t.common;

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-black text-lg text-purple-800 flex items-center gap-2">
            ✨ {tc.createAiStory || 'Tạo truyện bằng AI'}
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
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {tc.storyTitle || 'Tiêu đề'}
            </label>
            <input
              value={title}
              maxLength={150}
              onChange={e => onTitleChange(e.target.value)}
              placeholder="VD: The Magic Dragon"
              className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {t.teacherModal?.targetGrades || 'Khối / Lớp áp dụng'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <button
                type="button"
                onClick={() => onAiGradesChange([])}
                className={`px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                  aiGrades.length === 0
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                }`}
              >
                {t.teacherModal?.allGradesOption || 'Tất cả các khối'}
              </button>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => {
                const isSelected = aiGrades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      onAiGradesChange(
                        isSelected
                          ? aiGrades.filter(x => x !== g)
                          : [...aiGrades, g].sort((a, b) => a - b)
                      );
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
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
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
              {tc.storyPromptLabel || 'Ý tưởng / Gợi ý cho AI (Prompt)'}
            </label>
            <div className="flex gap-2">
              <input
                value={prompt}
                maxLength={500}
                onChange={e => onPromptChange(e.target.value)}
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
                {tc.tryGenerate || 'Tạo thử'}
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
            {tc.cancel || 'Hủy'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !generatedStory}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {t.teacherModal?.saveStory || tc.save || 'Lưu câu chuyện'}
          </button>
        </div>
      </div>
    </div>
  );
}

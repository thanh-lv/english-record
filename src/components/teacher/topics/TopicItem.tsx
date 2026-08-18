import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { Topic, Question } from "../../../types";
import { Translations, interpolate } from "../../../i18n/LanguageContext";

interface TopicItemProps {
  t: Translations;
  topic: Topic;
  idx: number;
  isExpanded: boolean;
  isEditing: boolean;
  editTopicTitle: string;
  editTopicGrades: number[];
  saving: boolean;
  onToggleExpand: () => void;
  onToggleActive: (id: string, current: boolean) => void;
  onStartEdit: (id: string, title: string, grades?: number[]) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDeleteTopic: (id: string, title: string) => void;
  onEditTopicTitleChange: (value: string) => void;
  onEditTopicGradesChange: (grades: number[]) => void;
  onOpenAddQuestion: (topicId: string, topicType: string) => void;
  onOpenEditQuestion: (topicId: string, topicType: string, q: Question) => void;
  onDeleteQuestion: (id: string, text: string) => void;
  onOpenAiParser: (topicId: string) => void;
}

export function TopicItem({
  t,
  topic,
  idx,
  isExpanded,
  isEditing,
  editTopicTitle,
  editTopicGrades,
  saving,
  onToggleExpand,
  onToggleActive,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteTopic,
  onEditTopicTitleChange,
  onEditTopicGradesChange,
  onOpenAddQuestion,
  onOpenEditQuestion,
  onDeleteQuestion,
  onOpenAiParser,
}: TopicItemProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all overflow-hidden">
      {isEditing ? (
        <div className="p-4 bg-blue-50/70 border-b border-blue-100 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <input
              autoFocus
              value={editTopicTitle}
              onChange={(e) => onEditTopicTitleChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSaveEdit(topic.id)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-blue-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            />
            <button
              type="button"
              onClick={() => onSaveEdit(topic.id)}
              disabled={saving}
              aria-label={t.common.save}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-2xs shrink-0 active:scale-95 transition-all"
            >
              <Check size={15} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label={t.common.cancel}
              className="p-2 bg-white text-slate-500 rounded-xl hover:bg-slate-100 border border-slate-200 shadow-2xs shrink-0 active:scale-95 transition-all"
            >
              <X size={15} />
            </button>
          </div>

          {/* Grade pill selection in edit mode */}
          <div className="pl-10 flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] font-black text-slate-500 mr-1">
              {t.teacherModal.targetGrades}:
            </span>
            <button
              type="button"
              onClick={() => onEditTopicGradesChange([])}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all ${
                editTopicGrades.length === 0
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {t.teacherModal.allGradesOption}
            </button>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
              const isSelected = editTopicGrades.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    onEditTopicGradesChange(
                      isSelected
                        ? editTopicGrades.filter((x) => x !== g)
                        : [...editTopicGrades, g].sort((a, b) => a - b),
                    );
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  {interpolate(t.common.gradeLabel, { grade: g })}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronDown size={18} className="text-slate-400 shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-slate-400 shrink-0" />
          )}
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">
            {idx + 1}
          </span>
          <div className="flex-1 min-w-0 flex items-center gap-2 truncate">
            <span className="font-black text-slate-800 text-sm truncate">
              {topic.title}
            </span>
            {Array.isArray(topic.grades) && topic.grades.length > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70 shrink-0">
                {interpolate(t.common.gradeLabel, {
                  grade: topic.grades
                    .slice()
                    .sort((a: number, b: number) => a - b)
                    .join(", "),
                })}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 shrink-0">
                {t.teacherModal.allGradesOption}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 font-bold px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
            {topic.questions.length} {t.common.questionCount}
          </span>
          <div
            className="flex gap-1.5 shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleActive(topic.id, topic.is_active ?? true);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all active:scale-95 ${
                (topic.is_active ?? true)
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
              }`}
            >
              {(topic.is_active ?? true) ? (
                <Eye size={12} />
              ) : (
                <EyeOff size={12} />
              )}
              <span>
                {(topic.is_active ?? true)
                  ? t.teacherModal.topicStatusActive || "Đang hiện"
                  : t.teacherModal.topicStatusHidden || "Đã ẩn"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStartEdit(topic.id, topic.title, topic.grades)}
              className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all active:scale-95"
              title={t.common.edit}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteTopic(topic.id, topic.title)}
              className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-100 hover:border-rose-200 transition-all active:scale-95"
              title={t.common.delete}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-2 space-y-2">
          {topic.questions.map((q) => (
            <div
              key={q.id}
              className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs"
            >
              <div className="flex items-start gap-2.5 group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">{q.text}</p>
                  {q.translation && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {q.translation}
                    </p>
                  )}
                  {q.sample_answer && (
                    <p className="text-[11px] text-emerald-600 mt-0.5 italic font-medium">
                      💡 {q.sample_answer}
                    </p>
                  )}
                  {q.target && (
                    <p className="text-[11px] text-purple-600 mt-0.5 font-bold">
                      🎯 {q.target}
                    </p>
                  )}
                </div>
                {q.image_url && (
                  <img
                    src={q.image_url}
                    alt={
                      q.text
                        ? interpolate(t.common.questionIllustration, {
                            text: q.text.slice(0, 30),
                          })
                        : t.common.questionIllustrationDefault
                    }
                    className="w-12 h-12 object-cover rounded-xl border border-slate-100 shrink-0 ml-2 shadow-2xs"
                  />
                )}
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => onOpenEditQuestion(topic.id, topic.type, q)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-100 transition-all active:scale-95"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(q.id, q.text)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-100 transition-all active:scale-95"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add question buttons */}
          <div className="p-2 flex items-center gap-3 bg-white rounded-xl border border-slate-100">
            <button
              type="button"
              onClick={() => onOpenAddQuestion(topic.id, topic.type)}
              className="text-xs text-slate-600 hover:text-emerald-600 font-black flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 transition-all active:scale-95"
            >
              <Plus size={14} /> {t.common.addQuestion}
            </button>
            <button
              type="button"
              onClick={() => onOpenAiParser(topic.id)}
              className="text-xs text-purple-600 hover:text-purple-700 font-black flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-100 transition-all active:scale-95"
            >
              <Sparkles size={14} /> {t.aiParser.openButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

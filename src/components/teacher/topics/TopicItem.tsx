import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Sparkles,
  Link,
} from "lucide-react";
import { Topic, Question } from "../../../types";

interface TopicItemProps {
  t: any;
  topic: Topic;
  idx: number;
  isExpanded: boolean;
  isEditing: boolean;
  editTopicTitle: string;
  saving: boolean;
  onToggleExpand: () => void;
  onToggleActive: (id: string, current: boolean) => void;
  onStartEdit: (id: string, title: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDeleteTopic: (id: string, title: string) => void;
  onEditTopicTitleChange: (value: string) => void;
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
  saving,
  onToggleExpand,
  onToggleActive,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteTopic,
  onEditTopicTitleChange,
  onOpenAddQuestion,
  onOpenEditQuestion,
  onDeleteQuestion,
  onOpenAiParser,
}: TopicItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/share/topic/${topic.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-lg border-2 border-slate-100 shadow-sm overflow-hidden">
      {isEditing ? (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border-b-2 border-blue-100">
          <span className="w-7 h-7 rounded-lg bg-[#E3F2FD] text-[#1E88E5] font-black text-xs flex items-center justify-center shrink-0">
            {idx + 1}
          </span>
          <input
            autoFocus
            value={editTopicTitle}
            onChange={(e) => onEditTopicTitleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit(topic.id)}
            className="flex-1 px-3 py-2 rounded-lg border-2 border-blue-300 text-sm font-bold focus:outline-none focus:border-blue-500 bg-white"
          />
          <button
            type="button"
            onClick={() => onSaveEdit(topic.id)}
            disabled={saving}
            aria-label={t.common.save}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label={t.common.cancel}
            className="p-2 bg-white text-slate-500 rounded-lg hover:bg-slate-100 border border-slate-200 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronDown size={18} className="text-slate-400 shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-slate-400 shrink-0" />
          )}
          <span className="w-7 h-7 rounded-lg bg-[#E3F2FD] text-[#1E88E5] font-black text-xs flex items-center justify-center shrink-0">
            {idx + 1}
          </span>
          <span className="flex-1 font-extrabold text-slate-800 truncate">
            {topic.title}
          </span>
          <span className="text-xs text-slate-400 font-bold shrink-0">
            {topic.questions.length} {t.common.questionCount}
          </span>
          <div
            className="flex gap-1 shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleActive(topic.id, topic.is_active ?? true);
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
                (topic.is_active ?? true)
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {(topic.is_active ?? true)
                ? t.teacherModal.topicStatusActive
                : t.teacherModal.topicStatusHidden}
            </button>
            <button
              type="button"
              title="Copy link chia sẻ cho học sinh"
              onClick={handleCopyLink}
              className={`p-1.5 rounded-lg transition-colors ${
                copied
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              {copied ? <Check size={14} /> : <Link size={14} />}
            </button>
            <button
              type="button"
              onClick={() => onStartEdit(topic.id, topic.title)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteTopic(topic.id, topic.title)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      {isExpanded && (
        <div className="border-t-2 border-slate-100 divide-y divide-slate-100">
          {topic.questions.map((q) => (
            <div key={q.id} className="px-4 py-3">
              <div className="flex items-start gap-2 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{q.text}</p>
                  {q.translation && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {q.translation}
                    </p>
                  )}
                  {q.sample_answer && (
                    <p className="text-xs text-emerald-600 mt-0.5 italic">
                      {q.sample_answer}
                    </p>
                  )}
                  {q.target && (
                    <p className="text-xs text-purple-500 mt-0.5">
                      🎯 {q.target}
                    </p>
                  )}
                </div>
                {q.image_url && (
                  <img
                    src={q.image_url}
                    alt="Question"
                    className="w-12 h-12 object-cover rounded-lg border-2 border-slate-100 shrink-0 ml-2"
                  />
                )}
                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => onOpenEditQuestion(topic.id, topic.type, q)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(q.id, q.text)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add question buttons */}
          <div className="px-4 py-2 flex items-center gap-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => onOpenAddQuestion(topic.id, topic.type)}
              className="text-sm text-slate-500 hover:text-emerald-600 font-bold flex items-center gap-1 py-1"
            >
              <Plus size={14} /> {t.common.addQuestion}
            </button>
            <button
              type="button"
              onClick={() => onOpenAiParser(topic.id)}
              className="text-sm text-violet-500 hover:text-violet-700 font-bold flex items-center gap-1 py-1"
            >
              <Sparkles size={14} /> {t.aiParser.openButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Story } from "../../../types";
import { Translations, interpolate } from "../../../i18n/LanguageContext";

interface StoryCardProps {
  t: Translations;
  story: Story;
  onEdit: (story: Story) => void;
  onDelete: (story: Story, e: React.MouseEvent) => void;
  onToggleActive: (storyId: string, currentStatus: boolean) => void;
}

export function StoryCard({
  t,
  story,
  onEdit,
  onDelete,
  onToggleActive,
}: StoryCardProps) {
  const tm = t.teacherModal;
  const tc = t.common;
  const isActive = story.is_active ?? true;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-lg flex flex-col hover:border-purple-300 transition-all duration-300 group">
      {/* Thumbnail Area */}
      <div className="aspect-[16/10] sm:aspect-[4/3] bg-gradient-to-br from-slate-100 to-purple-50/50 relative overflow-hidden">
        {story.image_url ? (
          <img
            src={story.image_url}
            alt={story.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-xs">
              {story.emoji || "📚"}
            </span>
          </div>
        )}

        {/* Dark subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20 pointer-events-none" />

        {/* Status Badge top-right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(story.id, isActive);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black backdrop-blur-md border shadow-xs transition-all active:scale-95 ${
              isActive
                ? "bg-emerald-500/90 text-white border-emerald-400/50 hover:bg-emerald-600"
                : "bg-slate-800/85 text-slate-200 border-slate-700/60 hover:bg-slate-900"
            }`}
            title={isActive ? "Bấm để ẩn" : "Bấm để hiện"}
          >
            {isActive ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>
              {isActive
                ? tm.filterStoryStatusActive || "Đang hiện"
                : tm.filterStoryStatusHidden || "Đã ẩn"}
            </span>
          </button>
        </div>

        {/* Category tag bottom-left */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center text-[10px] font-black text-white bg-purple-900/80 backdrop-blur-md border border-purple-400/30 px-2 py-0.5 rounded-lg shadow-xs">
            {story.type}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h4 className="font-black text-slate-800 text-sm sm:text-base line-clamp-1 group-hover:text-purple-600 transition-colors mb-1">
          {story.title}
        </h4>

        {/* Target Grades */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          {Array.isArray(story.grades) && story.grades.length > 0 ? (
            <span className="inline-flex items-center text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
              {interpolate(t.common.gradeLabel, {
                grade: story.grades
                  .slice()
                  .sort((a, b) => a - b)
                  .join(", "),
              })}
            </span>
          ) : (
            <span className="inline-flex items-center text-[11px] font-black text-slate-600 bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-lg">
              {t.teacherModal?.allGradesOption || "Tất cả các khối"}
            </span>
          )}
        </div>

        {/* Content Snippet */}
        {story.content && (
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed mb-3 flex-1">
            {story.content}
          </p>
        )}

        {/* Actions Footer */}
        <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onEdit(story)}
            className="flex-1 py-2 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-600 text-xs font-black rounded-xl border border-slate-100 hover:border-purple-200 shadow-2xs transition-all flex justify-center items-center gap-1.5 active:scale-95"
          >
            <Pencil size={13} />
            <span>{tc.edit || "Sửa"}</span>
          </button>
          <button
            type="button"
            onClick={(e) => onDelete(story, e)}
            className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-100 hover:border-rose-200 shadow-2xs transition-all active:scale-95"
            title={tc.delete || "Xóa"}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

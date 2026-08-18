import { Pencil, Trash2 } from "lucide-react";
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md flex flex-col hover:border-purple-300 transition-all group">
      <div className="aspect-square sm:aspect-video bg-slate-100 relative">
        {story.image_url ? (
          <img
            src={story.image_url}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {story.emoji}
          </div>
        )}
        {!(story.is_active ?? true) && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
            <span className="text-white text-xs font-black bg-slate-800/80 px-2.5 py-1 rounded-lg">
              {tm.filterStoryStatusHidden || "Đã ẩn"}
            </span>
          </div>
        )}
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <h4 className="font-extrabold text-slate-800 text-sm line-clamp-1 mb-1">
          {story.title}
        </h4>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg line-clamp-1">
            {story.type}
          </span>
          {Array.isArray(story.grades) && story.grades.length > 0 ? (
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg">
              {interpolate(t.common.gradeLabel, {
                grade: story.grades
                  .slice()
                  .sort((a, b) => a - b)
                  .join(", "),
              })}
            </span>
          ) : (
            <span className="text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-lg">
              {t.teacherModal?.allGradesOption || "Tất cả các khối"}
            </span>
          )}
        </div>
        <div className="mt-auto flex gap-1.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onEdit(story)}
            className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
          >
            <Pencil size={12} /> {tc.edit || "Sửa"}
          </button>
          <button
            type="button"
            onClick={(e) => onDelete(story, e)}
            className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
          >
            <Trash2 size={12} /> {tc.delete || "Xóa"}
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(story.id, story.is_active ?? true);
          }}
          className={`w-full mt-1.5 py-1 rounded-lg text-[10px] font-black transition-colors ${
            (story.is_active ?? true)
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {(story.is_active ?? true)
            ? tm.filterStoryStatusActive || "Đang hiện"
            : tm.filterStoryStatusHidden || "Đã ẩn"}
        </button>
      </div>
    </div>
  );
}

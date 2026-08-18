import { Pencil, Trash2 } from "lucide-react";
import { Story } from "../../../types";
import { Translations } from "../../../i18n/LanguageContext";

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
    <div className="bg-white rounded-lg border-2 border-slate-100 overflow-hidden shadow-md flex flex-col hover:border-purple-200 transition-all">
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
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center rounded-lg">
            <span className="text-white text-xs font-black bg-slate-800/70 px-2 py-1 rounded-lg">
              {tm.filterStoryStatusHidden || "Đã ẩn"}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="font-extrabold text-slate-800 text-sm line-clamp-1 mb-0.5">
          {story.title}
        </h4>
        <p className="text-xs font-bold text-purple-600 mb-2 line-clamp-1">
          {story.type}
        </p>
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

import { Award, BookOpen, Flame, Library, Pencil } from "lucide-react";

type ActiveTab = "exercises" | "stories" | "achievements";

interface StudentSidebarProps {
  profile: any;
  currentAvatar: string;
  completedNumbers: number[];
  streak: number;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onAvatarClick: () => void;
}

export function StudentSidebar({
  profile,
  currentAvatar,
  completedNumbers,
  streak,
  activeTab,
  onTabChange,
  onAvatarClick,
}: StudentSidebarProps) {
  return (
    <aside className="w-full md:w-64 shrink-0 space-y-4">
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border-3 border-[#E3F2FD] shadow-md text-center relative group">
        <button
          type="button"
          onClick={onAvatarClick}
          className="w-20 h-20 mx-auto bg-white border-4 border-amber-200 hover:border-amber-400 hover:scale-110 active:scale-95 transition-all rounded-full flex items-center justify-center text-4xl shadow-sm relative mb-4"
          title="Đổi Avatar"
        >
          {currentAvatar}
          <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform">
            <Pencil size={12} />
          </span>
        </button>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          Hello, <span className="text-[#FF8A80]">{profile.name}</span>! 👋
        </h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm font-bold shadow-sm">
            <Award size={16} /> {completedNumbers.length} Quà
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold shadow-sm border ${streak > 0 ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}
          >
            <Flame
              size={16}
              className={streak > 0 ? "fill-orange-500 text-orange-600" : "text-slate-400"}
            />
            {streak > 0 ? `${streak} Ngày` : "Bắt đầu học!"}
          </div>
        </div>
      </div>

      <nav className="bg-white/80 backdrop-blur-sm p-3 rounded-[2rem] border-3 border-slate-100 shadow-sm flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onTabChange("exercises")}
          className={`flex items-center gap-3 px-5 py-4 rounded-xl font-extrabold text-sm transition-all ${
            activeTab === "exercises"
              ? "bg-[#E3F2FD] text-[#1E88E5] shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <BookOpen size={20} className={activeTab === "exercises" ? "text-[#1E88E5]" : "text-slate-400"} />
          Bài tập của con
          {activeTab === "exercises" && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E88E5]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange("stories")}
          className={`flex items-center gap-3 px-5 py-4 rounded-xl font-extrabold text-sm transition-all ${
            activeTab === "stories"
              ? "bg-purple-50 text-purple-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <Library size={20} className={activeTab === "stories" ? "text-purple-500" : "text-slate-400"} />
          Truyện kể 📚
          {activeTab === "stories" && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange("achievements")}
          className={`flex items-center gap-3 px-5 py-4 rounded-xl font-extrabold text-sm transition-all ${
            activeTab === "achievements"
              ? "bg-amber-50 text-amber-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <Award size={20} className={activeTab === "achievements" ? "text-amber-500" : "text-slate-400"} />
          Thành tích 🏆
          {activeTab === "achievements" && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FFB300]" />
          )}
        </button>
      </nav>
    </aside>
  );
}

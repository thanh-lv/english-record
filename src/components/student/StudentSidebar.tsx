import { Award, BookOpen, Flame, Library, Pencil } from "lucide-react";

type ActiveTab = "exercises" | "stories" | "achievements";

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: "exercises", label: "Bài tập", icon: <BookOpen size={20} /> },
  { id: "stories", label: "Truyện kể", icon: <Library size={20} /> },
  { id: "achievements", label: "Thành tích", icon: <Award size={20} /> },
];

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
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-4">
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
                className={
                  streak > 0
                    ? "fill-orange-500 text-orange-600"
                    : "text-slate-400"
                }
              />
              {streak > 0 ? `${streak} Ngày` : "Bắt đầu học!"}
            </div>
          </div>
        </div>

        <nav className="bg-white/80 backdrop-blur-sm p-3 rounded-[2rem] border-3 border-slate-100 shadow-sm flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl font-extrabold text-sm transition-all ${
                activeTab === item.id
                  ? "bg-[#E3F2FD] text-[#1E88E5] shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <span
                className={
                  activeTab === item.id ? "text-[#1E88E5]" : "text-slate-400"
                }
              >
                {item.icon}
              </span>
              {item.label}
              {activeTab === item.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E88E5]" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile: compact profile bar at top */}
      <div className="md:hidden bg-white/80 backdrop-blur-sm px-4 py-3 rounded-[1.5rem] border-2 border-[#E3F2FD] shadow-sm flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={onAvatarClick}
          className="w-11 h-11 bg-white border-2 border-amber-200 rounded-full flex items-center justify-center text-2xl shadow-sm shrink-0"
        >
          {currentAvatar}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 text-sm truncate">
            Hello, <span className="text-[#FF8A80]">{profile.name}</span>! 👋
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold text-amber-600">
              🎁 {completedNumbers.length} Quà
            </span>
            {streak > 0 && (
              <span className="text-xs font-bold text-orange-500">
                🔥 {streak} Ngày
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 inset-x-0 md:hidden z-40 bg-white border-t-2 border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex pb-safe">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-extrabold transition-all ${active ? "text-[#1E88E5]" : "text-slate-400"}`}
              >
                <span
                  className={`p-1.5 rounded-xl transition-all ${active ? "bg-[#E3F2FD]" : ""}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

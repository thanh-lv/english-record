import { BookMarked, BookOpen, Library, Mic, Users } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export type TeacherTab =
  | "recordings"
  | "topics"
  | "students"
  | "stories"
  | "vocabulary";

interface TeacherSidebarProps {
  activeTab: TeacherTab;
  onTabChange: (tab: TeacherTab) => void;
}

export function TeacherSidebar({
  activeTab,
  onTabChange,
}: TeacherSidebarProps) {
  const { t } = useLanguage();
  const NAV_ITEMS: { id: TeacherTab; label: string; icon: React.ReactNode }[] =
    [
      {
        id: "recordings",
        label: t.teacherNav.recordings,
        icon: <Mic size={18} />,
      },
      {
        id: "topics",
        label: t.teacherNav.topics,
        icon: <BookOpen size={18} />,
      },
      {
        id: "students",
        label: t.teacherNav.students,
        icon: <Users size={18} />,
      },
      {
        id: "stories",
        label: t.teacherNav.stories,
        icon: <Library size={18} />,
      },
      {
        id: "vocabulary",
        label: t.sidebar.flashcards,
        icon: <BookMarked size={18} />,
      },
    ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden sticky top-4">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Menu
          </p>
        </div>
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold text-sm transition-all ${
                  active
                    ? "bg-[#E3F2FD] text-[#1E88E5] shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <span className={active ? "text-[#1E88E5]" : "text-slate-400"}>
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E88E5]" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

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
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-extrabold transition-all ${
                  active ? "text-[#1E88E5]" : "text-slate-400"
                }`}
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

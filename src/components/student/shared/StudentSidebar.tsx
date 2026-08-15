import {
  Award,
  BookMarked,
  BookOpen,
  Flame,
  Gamepad2,
  Library,
  Menu,
  X,
  Pencil,
  Video,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../../../i18n/LanguageContext";
import { useState } from "react";

export type ActiveTab =
  | "exercises"
  | "shadowing"
  | "stories"
  | "achievements"
  | "flashcards"
  | "games";

interface StudentSidebarProps {
  profile: any;
  currentAvatar: string;
  completedNumbers: number[];
  streak: number;
  onAvatarClick: () => void;
}

export function StudentSidebar({
  profile,
  currentAvatar,
  completedNumbers,
  streak,
  onAvatarClick,
}: StudentSidebarProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeTab = (location.pathname.split("/")[2] ||
    "exercises") as ActiveTab;

  const NAV_ITEMS = [
    {
      id: "exercises" as ActiveTab,
      label: t.sidebar.exercises,
      icon: <BookOpen size={20} />,
    },
    {
      id: "shadowing" as ActiveTab,
      label: t.sidebar.shadowing,
      icon: <Video size={20} />,
    },
    {
      id: "stories" as ActiveTab,
      label: t.sidebar.stories,
      icon: <Library size={20} />,
    },
    {
      id: "achievements" as ActiveTab,
      label: t.sidebar.achievements,
      icon: <Award size={20} />,
    },
    {
      id: "flashcards" as ActiveTab,
      label: t.sidebar.flashcards,
      icon: <BookMarked size={20} />,
    },
    {
      id: "games" as ActiveTab,
      label: t.sidebar.games,
      icon: <Gamepad2 size={20} />,
    },
  ];

  const NavLink = ({ item }: { item: (typeof NAV_ITEMS)[0] }) => {
    const active = activeTab === item.id;
    return (
      <Link
        key={item.id}
        to={`/student/${item.id}`}
        onClick={() => setMobileOpen(false)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-extrabold text-sm transition-all ${
          active
            ? "bg-[#E3F2FD] text-[#1E88E5] shadow-md"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        }`}
      >
        <span className={active ? "text-[#1E88E5]" : "text-slate-400"}>
          {item.icon}
        </span>
        {item.label}
        {active && (
          <span className="ml-auto w-1.5 h-1.5 rounded-lg bg-[#1E88E5]" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-4">
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border-3 border-[#E3F2FD] shadow-md text-center relative group">
          <button
            type="button"
            onClick={onAvatarClick}
            className="w-20 h-20 mx-auto bg-white border-4 border-amber-200 hover:border-amber-400 hover:scale-110 active:scale-95 transition-all rounded-lg flex items-center justify-center text-4xl shadow-md relative mb-4"
            title={t.common.changeAvatar}
          >
            {currentAvatar}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-lg border-2 border-white flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform">
              <Pencil size={12} />
            </span>
          </button>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {t.sidebar.hello}{" "}
            <span className="text-[#FF8A80]">{profile.name}</span>! 👋
          </h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-bold shadow-md">
              <Award size={16} /> {completedNumbers.length} {t.sidebar.prizes}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold shadow-md border ${streak > 0 ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}
            >
              <Flame
                size={16}
                className={
                  streak > 0
                    ? "fill-orange-500 text-orange-600"
                    : "text-slate-400"
                }
              />
              {streak > 0
                ? `${streak} ${t.sidebar.days}`
                : t.sidebar.startLearning}
            </div>
          </div>
        </div>

        <nav className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border-3 border-slate-100 shadow-md flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={`/student/${item.id}`}
              className={`flex items-center gap-3 px-5 py-4 rounded-lg font-extrabold text-sm transition-all ${
                activeTab === item.id
                  ? "bg-[#E3F2FD] text-[#1E88E5] shadow-md"
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
                <span className="ml-auto w-1.5 h-1.5 rounded-lg bg-[#1E88E5]" />
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-lg bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        aria-label={t.common.openMenu}
      >
        <Menu size={20} />
      </button>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: left drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-[60] bg-white shadow-md flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Menu
          </p>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            aria-label={t.common.closeMenu}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </>
  );
}

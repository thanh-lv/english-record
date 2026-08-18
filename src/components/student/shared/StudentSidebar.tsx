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
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold text-sm transition-all active:scale-95 ${
          active
            ? "bg-blue-50 text-blue-600 shadow-2xs font-black"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        }`}
      >
        <span className={active ? "text-blue-600" : "text-slate-400"}>
          {item.icon}
        </span>
        {item.label}
        {active && (
          <span className="ml-auto w-2 h-2 rounded-full bg-blue-600" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-4">
        <div className="bg-white/85 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-sm text-center relative group">
          <button
            type="button"
            onClick={onAvatarClick}
            className="w-20 h-20 mx-auto bg-gradient-to-tr from-amber-50 to-orange-50 border-3 border-amber-200 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all rounded-2xl flex items-center justify-center text-4xl shadow-sm relative mb-3 cursor-pointer"
            title={t.common.changeAvatar}
          >
            {currentAvatar}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-xl border-2 border-white flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform shadow-2xs">
              <Pencil size={11} />
            </span>
          </button>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">
            {t.sidebar.hello}{" "}
            <span className="text-blue-600">{profile.name}</span>! 👋
          </h2>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-black shadow-2xs">
              <Award size={14} className="text-amber-600" />{" "}
              {completedNumbers.length} {t.sidebar.prizes}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-2xs border ${
                streak > 0
                  ? "bg-orange-50 border-orange-200/80 text-orange-600"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <Flame
                size={14}
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

        <nav className="bg-white/85 backdrop-blur-md p-2.5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={`/student/${item.id}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all active:scale-95 ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-600 shadow-2xs font-black"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span
                className={
                  activeTab === item.id ? "text-blue-600" : "text-slate-400"
                }
              >
                {item.icon}
              </span>
              {item.label}
              {activeTab === item.id && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-600" />
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-2xl bg-white shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
        aria-label={t.common.openMenu}
      >
        <Menu size={20} />
      </button>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: left drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-[60] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Menu
          </p>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
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

import {
  BookMarked,
  BookOpen,
  FileAudio,
  Library,
  Menu,
  Mic,
  Users,
  Video,
  X,
  Calendar,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../../../i18n/LanguageContext";
import { useState } from "react";

export type TeacherTab =
  | "attendance"
  | "recordings"
  | "topics"
  | "students"
  | "stories"
  | "vocabulary"
  | "shadowing"
  | "audio-builder";

const TAB_THEMES: Record<
  TeacherTab,
  {
    activeClass: string;
    iconActiveClass: string;
    dotClass: string;
  }
> = {
  attendance: {
    activeClass: "bg-purple-50 text-purple-700 border-purple-200/90 shadow-xs",
    iconActiveClass: "text-purple-600",
    dotClass: "bg-purple-600 shadow-purple-200",
  },
  recordings: {
    activeClass: "bg-blue-50 text-[#1E88E5] border-blue-200/90 shadow-xs",
    iconActiveClass: "text-[#1E88E5]",
    dotClass: "bg-[#1E88E5] shadow-blue-200",
  },
  topics: {
    activeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-xs",
    iconActiveClass: "text-emerald-600",
    dotClass: "bg-emerald-600 shadow-emerald-200",
  },
  students: {
    activeClass: "bg-cyan-50 text-cyan-700 border-cyan-200/90 shadow-xs",
    iconActiveClass: "text-cyan-600",
    dotClass: "bg-cyan-600 shadow-cyan-200",
  },
  stories: {
    activeClass: "bg-amber-50 text-amber-800 border-amber-200/90 shadow-xs",
    iconActiveClass: "text-amber-600",
    dotClass: "bg-amber-600 shadow-amber-200",
  },
  vocabulary: {
    activeClass: "bg-rose-50 text-rose-700 border-rose-200/90 shadow-xs",
    iconActiveClass: "text-rose-600",
    dotClass: "bg-rose-600 shadow-rose-200",
  },
  shadowing: {
    activeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/90 shadow-xs",
    iconActiveClass: "text-indigo-600",
    dotClass: "bg-indigo-600 shadow-indigo-200",
  },
  "audio-builder": {
    activeClass: "bg-teal-50 text-teal-700 border-teal-200/90 shadow-xs",
    iconActiveClass: "text-teal-600",
    dotClass: "bg-teal-600 shadow-teal-200",
  },
};

export function TeacherSidebar() {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeTab = (location.pathname.split("/")[2] ||
    "recordings") as TeacherTab;

  const NAV_ITEMS: { id: TeacherTab; label: string; icon: React.ReactNode }[] =
    [
      {
        id: "attendance",
        label: t.attendance.title,
        icon: <Calendar size={18} />,
      },
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
        label: t.teacherNav.flashcards,
        icon: <BookMarked size={18} />,
      },
      {
        id: "shadowing",
        label: t.teacherNav.shadowing,
        icon: <Video size={18} />,
      },
      {
        id: "audio-builder",
        label: (t.teacherNav as any).audioBuilder || "Tạo Audio",
        icon: <FileAudio size={18} />,
      },
    ];

  const NavLink = ({ item }: { item: (typeof NAV_ITEMS)[0] }) => {
    const active = activeTab === item.id;
    const theme = TAB_THEMES[item.id] || TAB_THEMES.recordings;

    return (
      <Link
        key={item.id}
        to={`/teacher/${item.id}`}
        onClick={() => setMobileOpen(false)}
        className={`group relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-black text-xs transition-all border ${
          active
            ? theme.activeClass
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold border-transparent"
        }`}
      >
        <span
          className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            active
              ? theme.iconActiveClass
              : "text-slate-400 group-hover:text-slate-600"
          }`}
        >
          {item.icon}
        </span>
        <span className="truncate tracking-wide">{item.label}</span>
        {active && (
          <span
            className={`ml-auto w-2 h-2 rounded-full shadow-xs shrink-0 ${theme.dotClass}`}
          />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/80 sticky top-[84px] max-h-[calc(100vh-100px)] overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Menu
          </p>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            Teacher
          </span>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} />
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
        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </>
  );
}

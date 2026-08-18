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
    return (
      <Link
        key={item.id}
        to={`/teacher/${item.id}`}
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
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white rounded-lg shadow-md border border-slate-100 overflow-hidden sticky top-4">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Menu
          </p>
        </div>
        <nav className="p-3 space-y-1">
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

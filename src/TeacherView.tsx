import { createClient } from "@supabase/supabase-js";
import { AlertCircle, BookOpen, Key, Library, Mic, Users } from "lucide-react";
import React, { useEffect, useState } from "react";

import { RecordingsPanel } from "./components/teacher/RecordingsPanel";
import { StoriesManager } from "./components/teacher/StoriesManager";
import { StudentsManager } from "./components/teacher/StudentsManager";
import { TopicsManager } from "./components/teacher/TopicsManager";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "english-app-auth-v3",
    lock: (_name: string, _timeout: number, fn: () => Promise<any>) => fn(),
  },
});

const supabaseForStudents = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "",
  {
    auth: {
      storageKey: "english-app-auth-v3",
      lock: (_name: string, _timeout: number, fn: () => Promise<any>) => fn(),
    },
  },
);

export default function TeacherView({
  user,
  profile,
}: {
  user: any;
  profile: any;
}) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "recordings" | "topics" | "students" | "stories"
  >("recordings");

  useEffect(() => {
    if (!user) return;

    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .order("createdAt", { ascending: false });

        if (error) throw error;
        if (data) setRecordings(data);
      } catch (error) {
        console.error("Error fetching recordings: ", error);
        setAppError("Không thể kết nối lấy dữ liệu bài nộp từ hệ thống.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();

    const channel = supabase
      .channel("teacher-recordings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recordings" },
        () => {
          fetchRecordings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase
        .from("recordings")
        .delete()
        .eq("id", deleteTargetId);
      if (error) throw error;

      setRecordings((prev) => prev.filter((r) => r.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err) {
      console.error("Lỗi khi xóa: ", err);
      setAppError("Không thể xóa bài nộp này.");
    }
  };

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const navItems = [
    { id: "recordings" as const, label: "Bài nộp", icon: <Mic size={18} /> },
    {
      id: "topics" as const,
      label: "Quản lý Topics",
      icon: <BookOpen size={18} />,
    },
    {
      id: "students" as const,
      label: "Học sinh",
      icon: <Users size={18} />,
    },
    {
      id: "stories" as const,
      label: "Truyện kể",
      icon: <Library size={18} />,
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 min-h-screen flex flex-col">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] text-white px-6 py-5 rounded-[2rem] shadow-md border-b-4 border-emerald-900 flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-black mb-0.5">
            Bảng điều khiển của {profile.name} 📚
          </h2>
          <p className="text-emerald-100 font-bold opacity-90 text-sm">
            Tổng số bài học sinh đã nộp: {recordings.length}
          </p>
        </div>
        <div className="hidden sm:flex w-14 h-14 bg-white/20 rounded-full items-center justify-center border-2 border-white/20">
          <Key size={28} />
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="flex gap-5 flex-1 items-start">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden sticky top-4">
          {/* brand strip */}
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Menu
            </p>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold text-sm transition-all ${
                    active
                      ? "bg-[#E3F2FD] text-[#1E88E5] shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <span
                    className={active ? "text-[#1E88E5]" : "text-slate-400"}
                  >
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

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-4 pb-24 md:pb-0">
          {activeTab === "recordings" && appError && (
            <div className="bg-[#FFEBEE] border-2 border-[#FFCDD2] text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-bold">{appError}</span>
            </div>
          )}

          {activeTab === "recordings" && (
            <RecordingsPanel
              recordings={recordings}
              loading={loading}
              formatDate={formatDate}
              onDeleteRequest={(id) => setDeleteTargetId(id)}
            />
          )}

          {activeTab === "topics" && <TopicsManager />}

          {activeTab === "students" && <StudentsManager />}

          {activeTab === "stories" && <StoriesManager />}
        </div>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <div className="fixed bottom-0 inset-x-0 md:hidden z-40">
        <div className="mx-3 mb-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-[1.5rem] shadow-xl flex overflow-hidden">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
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

      {/* Delete confirmation modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-6 border-4 border-rose-100 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-lg">
                  Xác nhận xóa
                </h4>
                <p className="text-sm text-slate-500 font-medium">
                  Thầy cô có chắc chắn muốn xóa bài ghi âm của học sinh này khỏi
                  hệ thống không?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTargetId(null);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200 shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

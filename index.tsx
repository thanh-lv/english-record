import { useState, useEffect } from "react";
import TeacherView from "./src/TeacherView";
import StudentView from "./src/StudentView";
import LoginScreen from "./src/LoginScreen";
import { Mic, User, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { NotificationBell } from "./src/components/teacher/NotificationBell";
import { useNotifications } from "./src/components/teacher/hooks/useNotifications";

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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [teacherActiveTab, setTeacherActiveTab] = useState<string>("recordings");

  const {
    notifications,
    unreadCount,
    readIds,
    addNotification,
    markRead,
    markAllRead,
    clearAll,
  } = useNotifications();

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setAuthLoading((prev) => {
        if (prev) console.warn("Auth timeout: forcing loading to stop after 5 seconds");
        return false;
      });
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError && getUserError.name !== "AuthSessionMissingError") {
          console.warn("GetUser warning:", getUserError.message);
        }
        if (!currentUser) {
          const { error: signInError } = await supabase.auth.signInAnonymously();
          if (signInError) {
            console.error("Anonymous sign-in error:", signInError);
            setAuthLoading(false);
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
        setAuthLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      const savedProfileId = localStorage.getItem("english_record_profile_id");
      if (currentUser && savedProfileId) {
        try {
          const { data, error } = await supabase
            .from("profiles").select("*").eq("id", savedProfileId).maybeSingle();
          if (!error && data) {
            setUserProfile(data);
          } else {
            localStorage.removeItem("english_record_profile_id");
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Error fetching persisted profile:", err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    if (e) e.preventDefault();
    localStorage.removeItem("english_record_profile_id");
    setUserProfile(null);
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-pink-100 rounded-full flex items-center justify-center text-5xl shadow-lg border-4 border-white">
            🎤
          </div>
          <span className="absolute -top-1 -right-1 text-xl animate-bounce">✨</span>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xl font-black bg-gradient-to-r from-[#1E88E5] to-[#F06292] bg-clip-text text-transparent">
            SpeakwithMsMy
          </p>
          <p className="text-slate-400 font-bold text-xs tracking-wide flex items-center gap-2 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Đang kết nối...
          </p>
        </div>
      </div>
    );
  }

  const isTeacher = userProfile?.role === "teacher";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] text-slate-800 font-sans selection:bg-pink-100">
      <header className="bg-white/80 backdrop-blur-md shadow-sm px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-10 border-b-4 border-[#FFF0F0]">
        <h1 className="font-extrabold text-[#1E88E5] flex items-center gap-2">
          <span className="p-1.5 bg-[#E3F2FD] rounded-xl inline-block shadow-inner shrink-0">
            <Mic size={16} className="text-[#1E88E5]" />
          </span>
          <span className="text-base md:text-2xl tracking-wide">
            <span className="sm:hidden">MsMy</span>
            <span className="hidden sm:inline">SpeakwithMsMy</span>
          </span>
        </h1>
        {userProfile && (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#FFFDE7] border-2 border-[#FFF59D] rounded-full shadow-sm">
              <User size={14} className="text-[#FFB74D]" />
              <span className="text-sm font-bold text-slate-700">
                {userProfile.name}
                <span className="text-slate-400 font-normal ml-1">
                  ({isTeacher ? "Cô Giáo" : "Học sinh"})
                </span>
              </span>
            </div>

            {/* Bell chỉ hiện khi là teacher */}
            {isTeacher && (
              <div className="text-slate-600">
                <NotificationBell
                  notifications={notifications}
                  unreadCount={unreadCount}
                  readIds={readIds}
                  onMarkRead={markRead}
                  onMarkAllRead={markAllRead}
                  onClearAll={clearAll}
                  onNavigate={(recordId) => {
                    setTeacherActiveTab("recordings:" + recordId);
                    setTimeout(() => setTeacherActiveTab("recordings"), 2100);
                  }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-2 rounded-full border border-rose-200 transition-all"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-3 md:p-6 lg:p-8">
        {!userProfile && <LoginScreen setProfile={setUserProfile} user={user} />}
        {userProfile?.role === "student" && <StudentView user={user} profile={userProfile} />}
        {isTeacher && (
          <TeacherView
            user={user}
            addNotification={addNotification}
            activeTabSignal={teacherActiveTab}
          />
        )}
      </main>
    </div>
  );
}

import { useState, useEffect, lazy, Suspense } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import LoginScreen from "./src/LoginScreen";

const TeacherView = lazy(() => import("./src/TeacherView"));
const StudentView = lazy(() => import("./src/StudentView"));
import { Mic, User, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { NotificationBell } from "./src/components/teacher/NotificationBell";
import { useNotifications } from "./src/components/teacher/hooks/useNotifications";
import { useLanguage } from "./src/i18n/LanguageContext";

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
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();

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
            if (data.language === "vi" || data.language === "en") {
              setLang(data.language);
            }
          } else {
            localStorage.removeItem("english_record_profile_id");
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Error fetching persisted profile:", err);
          setUserProfile(null);
        }
      } else if (currentUser && !session?.user.is_anonymous) {
        // Teacher logged in via Supabase Auth — load profile by auth_uid
        try {
          const { data } = await supabase
            .from("profiles").select("*").eq("auth_uid", currentUser.id).eq("role", "teacher").maybeSingle();
          if (data) {
            localStorage.setItem("english_record_profile_id", data.id);
            setUserProfile(data);
            if (data.language === "vi" || data.language === "en") {
              setLang(data.language);
            }
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Error fetching teacher profile:", err);
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

  const isTeacher = userProfile?.role === "teacher";

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
            {t.appName}
          </p>
          <p className="text-slate-400 font-bold text-xs tracking-wide flex items-center gap-2 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.common.connecting}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] text-slate-800 font-sans selection:bg-pink-100 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md shadow-sm px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-10 border-b-4 border-[#FFF0F0]">
        <h1 className="font-extrabold text-[#1E88E5] flex items-center gap-2">
          <span className="p-1.5 bg-[#E3F2FD] rounded-xl inline-block shadow-inner shrink-0">
            <Mic size={16} className="text-[#1E88E5]" />
          </span>
          <span className="text-base md:text-2xl tracking-wide">
            <span className="sm:hidden">{t.appNameShort}</span>
            <span className="hidden sm:inline">{t.appName}</span>
          </span>
        </h1>
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi", userProfile?.id)}
            className="text-xs font-black px-2.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
          >
            {lang === "vi" ? "🇬🇧 EN" : "🇻🇳 VI"}
          </button>

          {userProfile && (
            <>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#FFFDE7] border-2 border-[#FFF59D] rounded-full shadow-sm">
                <User size={14} className="text-[#FFB74D]" />
                <span className="text-sm font-bold text-slate-700">
                  {userProfile.name}
                  <span className="text-slate-400 font-normal ml-1">
                    ({isTeacher ? t.teacher : t.student})
                  </span>
                </span>
              </div>

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
                      navigate(`/teacher/recordings?highlight=${recordId}`);
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
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-3 md:p-6 lg:p-8 flex-1 w-full flex flex-col">
        <Suspense fallback={null}>
          <Routes>
            <Route
              path="/login"
              element={
                userProfile ? (
                  <Navigate to={isTeacher ? "/teacher" : "/student"} replace />
                ) : (
                  <LoginScreen setProfile={setUserProfile} user={user} />
                )
              }
            />
            <Route
              path="/student/*"
              element={
                userProfile?.role === "student" ? (
                  <StudentView user={user} profile={userProfile} />
                ) : (
                  <Navigate to={userProfile ? "/teacher" : "/login"} replace />
                )
              }
            />
            <Route
              path="/teacher/*"
              element={
                isTeacher ? (
                  <TeacherView user={user} addNotification={addNotification} />
                ) : (
                  <Navigate to={userProfile ? "/student" : "/login"} replace />
                )
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    !userProfile
                      ? "/login"
                      : isTeacher
                        ? "/teacher"
                        : "/student"
                  }
                  replace
                />
              }
            />
          </Routes>
        </Suspense>
      </main>

      <footer className="border-t border-slate-100 py-5 px-4 text-center space-y-1 mt-auto">
        <p className="text-sm font-extrabold text-slate-500">
          English with Ms My 🎤
        </p>
        <p className="text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} · Made with ❤️ for young learners
        </p>
      </footer>
    </div>
  );
}

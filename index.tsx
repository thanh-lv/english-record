import { useState, useEffect, lazy, Suspense } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import LoginScreen from "./src/LoginScreen";

const TeacherView = lazy(() => import("./src/TeacherView"));
const StudentView = lazy(() => import("./src/StudentView"));
import { Mic, User, LogOut, Loader2 } from "lucide-react";
import { NotificationBell } from "./src/components/teacher/shared/NotificationBell";
import { useNotifications } from "./src/components/teacher/hooks/useNotifications";
import { useLanguage } from "./src/i18n/LanguageContext";
import { supabase } from "./src/lib/supabase";



export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

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
        if (prev)
          console.warn("Auth timeout: forcing loading to stop after 5 seconds");
        return false;
      });
    }, 5000);

    const initAuth = async () => {
      try {
        const {
          data: { user: currentUser },
          error: getUserError,
        } = await supabase.auth.getUser();
        if (getUserError && getUserError.name !== "AuthSessionMissingError") {
          console.warn("GetUser warning:", getUserError.message);
        }
        if (!currentUser) {
          const { error: signInError } =
            await supabase.auth.signInAnonymously();
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      const savedProfileId = localStorage.getItem("english_record_profile_id");

      if (currentUser && savedProfileId) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", savedProfileId)
            .maybeSingle();
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
            .from("profiles")
            .select("*")
            .eq("auth_uid", currentUser.id)
            .eq("role", "teacher")
            .maybeSingle();
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
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-pink-100 rounded-lg flex items-center justify-center text-5xl shadow-md border-4 border-white">
            🎤
          </div>
          <span className="absolute -top-1 -right-1 text-xl animate-bounce">
            ✨
          </span>
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] text-slate-800 font-sans selection:bg-pink-100 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md shadow-md px-4 md:px-6 py-3 h-[68px] sm:height-auto flex justify-between items-center sticky top-0 z-10 border-b-4 border-[#FFF0F0]">
        <h1 className="font-extrabold text-[#1E88E5] flex items-center gap-2">
          <span className="p-1.5 bg-[#E3F2FD] rounded-lg shadow-inner shrink-0 hidden sm:inline-block">
            <Mic size={16} className="text-[#1E88E5]" />
          </span>
          <span className="text-lg md:text-2xl tracking-wide hidden sm:block">
            {t.appName}
          </span>
        </h1>
        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
          {/* Language switcher */}
          <button
            type="button"
            onClick={() =>
              setLang(lang === "vi" ? "en" : "vi", userProfile?.id)
            }
            className="text-xs font-black px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
          >
            {lang === "vi" ? "🇬🇧 English" : "🇻🇳 Vietnamese"}
          </button>

          {userProfile && (
            <>
              <div className="flex items-center gap-1.5 p-1 bg-[#FFFDE7] border border-[#FFF59D] rounded-lg shadow-md max-w-[140px] sm:max-w-none sm:mr-0">
                <span className="text-sm sm:text-base shrink-0">{userProfile.avatar || (isTeacher ? '👩‍🏫' : '👦')}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
                  {userProfile.name}
                  <span className="text-slate-400 font-normal ml-1 hidden sm:inline">
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
                className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-2 rounded-lg border border-rose-200 transition-all"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto p-3 md:p-6 lg:p-8 flex-1 w-full flex flex-col">
        <Suspense fallback={null}>
          <Routes>
            <Route
              path="/login"
              element={
                userProfile ? (
                  <Navigate to={location.state?.from || (isTeacher ? "/teacher" : "/student")} replace />
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
                  <Navigate to={userProfile ? "/teacher" : "/login"} state={{ from: location.pathname }} replace />
                )
              }
            />
            <Route
              path="/teacher/*"
              element={
                isTeacher ? (
                  <TeacherView user={user} addNotification={addNotification} />
                ) : (
                  <Navigate to={userProfile ? "/student" : "/login"} state={{ from: location.pathname }} replace />
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
                  state={!userProfile ? { from: location.pathname } : undefined}
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

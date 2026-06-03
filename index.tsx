import { useState, useEffect } from "react";
import TeacherView from "./src/TeacherView";
import StudentView from "./src/StudentView";
import LoginScreen from "./src/LoginScreen";
import { Mic, User, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

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
            .from("profiles")
            .select("*")
            .eq("id", savedProfileId)
            .maybeSingle();

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
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-12 h-12 text-[#FF8A80] animate-spin" />
        <p className="text-slate-500 font-bold text-sm tracking-wide">
          Đang kết nối hệ thống học tập dễ thương...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] text-slate-800 font-sans selection:bg-pink-100">
      <header className="bg-white/80 backdrop-blur-md shadow-sm px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-10 border-b-4 border-[#FFF0F0]">
        <h1 className="text-lg md:text-3xl font-extrabold text-[#1E88E5] flex items-center gap-2 tracking-wider">
          <span className="p-1.5 md:p-2 bg-[#E3F2FD] rounded-2xl inline-block shadow-inner">
            <Mic size={18} className="text-[#1E88E5]" />
          </span>
          <span className="hidden sm:inline">SpeakwithMsMy</span>
          <span className="sm:hidden">SpeakwithMsMy</span>
        </h1>
        {userProfile && (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#FFFDE7] border-2 border-[#FFF59D] rounded-full shadow-sm">
              <User size={16} className="text-[#FFB74D]" />
              <span className="text-sm font-bold text-slate-700">
                {userProfile.name}{" "}
                <span className="text-slate-400 font-normal">
                  ({userProfile.role === "teacher" ? "Cô Giáo" : "student"})
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-full border-2 border-rose-200 transition-all shadow-sm whitespace-nowrap"
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-3 md:p-6 lg:p-8">
        {!userProfile && <LoginScreen setProfile={setUserProfile} user={user} />}
        {userProfile?.role === "student" && <StudentView user={user} profile={userProfile} />}
        {userProfile?.role === "teacher" && <TeacherView user={user} profile={userProfile} />}
      </main>
    </div>
  );
}

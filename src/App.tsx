import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const TeacherPage = lazy(() => import('./pages/TeacherPage'));
const StudentPage = lazy(() => import('./pages/StudentPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
import { Mic, LogOut, Loader2 } from 'lucide-react';
import { NotificationBell } from './components/teacher/shared/NotificationBell';
import { useNotifications } from './components/teacher/hooks/useNotifications';
import { useLanguage, interpolate } from './i18n/LanguageContext';
import { useAuth } from './hooks/useAuth';
import { TeacherProvider } from './contexts/TeacherContext';

export default function App() {
  const { t, lang, setLang } = useLanguage();
  const { user, userProfile, setUserProfile, authLoading, isSuperAdmin, isTeacher, logout } =
    useAuth({
      onLanguageChange: setLang,
    });
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const currentTeacherId = isTeacher && userProfile ? userProfile.id : null;
  const { notifications, unreadCount, readIds, addNotification, markRead, markAllRead, clearAll } =
    useNotifications(currentTeacherId);

  const handleLogout = async (e: React.MouseEvent) => {
    if (e) e.preventDefault();
    await logout();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-pink-100 rounded-lg flex items-center justify-center text-5xl shadow-md border-4 border-white">
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

  if (isAdminRoute) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-[#FFFDF6] via-[#F8FAFC] to-[#F1F5F9] text-slate-800 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
        <Suspense
          fallback={
            <div className="min-h-screen bg-slate-50/50 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route
              path="/admin/login"
              element={
                isSuperAdmin ? (
                  <Navigate to="/admin/dashboard" replace />
                ) : (
                  <AdminLoginPage setProfile={setUserProfile} />
                )
              }
            />
            <Route
              path="/admin/*"
              element={
                isSuperAdmin ? (
                  <AdminPage user={user} onLogout={logout} />
                ) : (
                  <Navigate to="/admin/login" replace />
                )
              }
            />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] text-slate-800 font-sans selection:bg-pink-100 flex flex-col">
      <header className="bg-white/90 backdrop-blur-md shadow-xs sticky top-0 z-30 border-b border-slate-200/80">
        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8 py-2.5 flex justify-between items-center">
          <h1 className="font-extrabold text-[#1E88E5] flex items-center gap-2.5">
            <span className="p-2 bg-[#E3F2FD] rounded-xl shadow-xs shrink-0 hidden sm:inline-flex items-center justify-center text-[#1E88E5]">
              <Mic size={18} />
            </span>
            <span className="text-lg md:text-xl font-black tracking-tight text-slate-800 hidden sm:block">
              {t.appName}
            </span>
          </h1>
          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
            {/* Language switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi', userProfile?.id)}
              className="h-9 text-xs font-black px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-xs flex items-center gap-1.5"
            >
              {lang === 'vi' ? '🇬🇧 English' : '🇻🇳 Vietnamese'}
            </button>

            {userProfile && (
              <>
                <div className="h-9 flex items-center gap-2 px-3 py-1 bg-amber-50/90 border border-amber-200/80 rounded-xl shadow-xs max-w-[160px] sm:max-w-none">
                  <span className="text-base shrink-0">
                    {userProfile.avatar || (isTeacher ? '👩‍🏫' : '👦')}
                  </span>
                  <span className="text-xs font-extrabold text-slate-700 truncate">
                    {userProfile.name}
                    <span className="text-slate-400 font-bold ml-1 hidden sm:inline">
                      ({isTeacher ? t.teacher : t.student})
                    </span>
                  </span>
                </div>

                {isTeacher && (
                  <div className="text-slate-600 flex items-center">
                    <NotificationBell
                      notifications={notifications}
                      unreadCount={unreadCount}
                      readIds={readIds}
                      onMarkRead={markRead}
                      onMarkAllRead={markAllRead}
                      onClearAll={clearAll}
                      onNavigate={recordId => {
                        navigate(`/teacher/recordings?highlight=${recordId}`);
                      }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 flex items-center gap-1.5 text-xs font-black text-rose-600 hover:text-rose-700 bg-rose-50/90 hover:bg-rose-100/90 px-3 py-1.5 rounded-xl border border-rose-200/80 transition-all shadow-xs"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">{t.logout}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8 py-4 lg:py-6 flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 text-[#1E88E5] animate-spin" />
              <p className="text-xs font-bold text-slate-400">
                {t.common.loading || 'Đang tải...'}
              </p>
            </div>
          }
        >
          <Routes>
            <Route
              path="/login"
              element={
                userProfile ? (
                  <Navigate
                    to={
                      location.state?.from ||
                      (isTeacher
                        ? '/teacher/attendance'
                        : isSuperAdmin
                          ? '/admin/dashboard'
                          : '/student')
                    }
                    replace
                  />
                ) : (
                  <LoginPage setProfile={setUserProfile} user={user} />
                )
              }
            />
            <Route
              path="/student/*"
              element={
                userProfile?.role === 'student' ? (
                  <StudentPage user={user} profile={userProfile} />
                ) : (
                  <Navigate
                    to={
                      userProfile
                        ? isTeacher
                          ? '/teacher/attendance'
                          : isSuperAdmin
                            ? '/admin/dashboard'
                            : '/login'
                        : '/login'
                    }
                    state={{ from: location.pathname }}
                    replace
                  />
                )
              }
            />
            <Route
              path="/teacher/*"
              element={
                isTeacher && userProfile ? (
                  <TeacherProvider teacherId={userProfile.id}>
                    <TeacherPage user={user} addNotification={addNotification} />
                  </TeacherProvider>
                ) : (
                  <Navigate
                    to={userProfile ? (isSuperAdmin ? '/admin/dashboard' : '/student') : '/login'}
                    state={{ from: location.pathname }}
                    replace
                  />
                )
              }
            />
            <Route
              path="/"
              element={
                <Navigate
                  to={
                    !userProfile
                      ? '/login'
                      : isSuperAdmin
                        ? '/admin/dashboard'
                        : isTeacher
                          ? '/teacher/attendance'
                          : '/student'
                  }
                  replace
                />
              }
            />
            <Route path="*" element={<NotFoundPage userProfile={userProfile} />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="border-t border-slate-100 py-5 px-4 text-center space-y-1 mt-auto">
        <p className="text-sm font-extrabold text-slate-500">{t.footerTagline}</p>
        <p className="text-xs text-slate-400 font-medium">
          {interpolate(t.footerCopyright, { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, HelpCircle, Compass } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { UserProfile } from '../types';

interface NotFoundPageProps {
  userProfile?: UserProfile | null;
}

export default function NotFoundPage({ userProfile }: NotFoundPageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const tNotFound = t.notFound;

  const isTeacher = userProfile?.role === 'teacher';
  const isSuperAdmin = userProfile?.role === 'super_admin';

  const homePath = !userProfile
    ? '/login'
    : isSuperAdmin
      ? '/admin/dashboard'
      : isTeacher
        ? '/teacher/attendance'
        : '/student';

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Visual Badge & 404 Illustration */}
        <div className="relative inline-block mx-auto">
          {/* Background ambient glow */}
          <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-150 -z-10" />

          {/* Large 404 number with gradient and cute icons */}
          <div className="relative">
            <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 select-none">
              404
            </h1>

            {/* Floating cute elements */}
            <span className="absolute -top-2 -right-4 text-3xl animate-bounce delay-100 select-none">
              🔍
            </span>
            <span className="absolute -bottom-2 -left-4 text-3xl animate-pulse select-none">
              🪐
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-black shadow-xs mt-2">
            <Compass size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
            <span>{tNotFound.badge}</span>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            {tNotFound.title}
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed">
            {tNotFound.subtitle}
          </p>
        </div>

        {/* Suggestions Card */}
        <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left text-xs text-slate-600 space-y-2.5 max-w-md mx-auto">
          <p className="font-black text-slate-800 flex items-center gap-1.5">
            <Search size={14} className="text-blue-600" />
            <span>{tNotFound.suggestTitle}</span>
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600 font-medium">
            <li>{tNotFound.suggest1}</li>
            <li>{tNotFound.suggest2}</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{tNotFound.goBackBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(homePath)}
            className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home size={16} />
            <span>{tNotFound.backHomeBtn}</span>
          </button>
        </div>

        {/* Footer help note */}
        <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5 pt-4">
          <HelpCircle size={13} />
          <span>{tNotFound.needHelp}</span>
        </p>
      </div>
    </div>
  );
}

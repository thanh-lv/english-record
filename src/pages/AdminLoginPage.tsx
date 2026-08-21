import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff, Loader2, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export default function AdminLoginPage({
  setProfile,
}: {
  setProfile: (profile: UserProfile) => void;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tAdmin = t.admin;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError(tAdmin.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(tAdmin.passwordMinLength);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const profile = await authService.signInSuperAdmin(email, password);
      setProfile(profile);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || tAdmin.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#FFFDF7] via-[#F8FAFC] to-[#F1F5F9] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Background soft glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card container */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Icon & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl text-slate-950 shadow-md shadow-amber-500/20 mb-4 animate-bounce">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {tAdmin.loginTitle}
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">{tAdmin.loginSubtitle}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-200">
              <span className="shrink-0 text-rose-600 font-black">✕</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
              {tAdmin.emailLabel}
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={tAdmin.emailPlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
              {tAdmin.passwordLabel}
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tAdmin.passwordPlaceholder}
                className="w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {tAdmin.submitting}
              </>
            ) : (
              tAdmin.submitBtn
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft size={14} /> {tAdmin.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}

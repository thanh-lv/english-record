import { AlertCircle, Eye, EyeOff, Loader2, GraduationCap, User as UserIcon } from 'lucide-react';
import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const FLOATING = ['🌟', '🎈', '📚', '🎵', '✨', '🦋', '🌈', '🎯'];

export default function LoginPage({
  setProfile,
  user,
}: {
  setProfile: (p: UserProfile | null) => void;
  user: User | null;
}) {
  const { t } = useLanguage();
  const [loginMode, setLoginMode] = useState<'student' | 'teacher'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleStudentLogin = async () => {
    const trimmedUsername = name.trim();
    if (trimmedUsername.length < 2) {
      setError(t.login.usernameRequired || t.common.nameRequired || 'Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (password.length < 3) {
      setError(t.common.passwordRequired);
      return;
    }

    let currentUserId = user?.id;
    if (!currentUserId) {
      try {
        const anonUser = await authService.signInAnonymously();
        currentUserId = anonUser?.id;
      } catch (err) {
        console.warn('Anonymous sign-in skipped or unavailable:', err);
      }
    }

    const profileData = await authService.loginStudent(
      trimmedUsername,
      password,
      currentUserId || 'anonymous'
    );
    setProfile(profileData);
  };

  const handleTeacherLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError(t.common.emailInvalid);
      return;
    }
    if (password.length < 3) {
      setError(t.common.teacherPasswordMin);
      return;
    }

    const profile = await authService.signInTeacher(email, password);
    setProfile(profile);
  };

  const handleLogin = async (e: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError('');
    setIsLoggingIn(true);
    try {
      if (loginMode === 'teacher') {
        await handleTeacherLogin();
      } else {
        await handleStudentLogin();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || t.common.loginGenericError);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden py-4 flex-1">
      {/* Floating decorations */}
      {FLOATING.map((emoji, i) => (
        <span
          key={i}
          className="absolute text-2xl pointer-events-none select-none animate-float opacity-40"
          style={{
            left: `${8 + ((i * 12) % 84)}%`,
            top: `${5 + ((i * 17) % 80)}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        >
          {emoji}
        </span>
      ))}

      <div className="relative z-10 w-full max-w-sm mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
        {/* Mascot + title */}
        <div className="text-center mb-4">
          <div className="relative inline-block">
            <div className="w-16 h-16 md:w-24 md:h-24 mx-auto bg-gradient-to-br from-blue-100 to-pink-100 rounded-lg flex items-center justify-center text-3xl md:text-5xl shadow-md border-4 border-white mb-3 animate-in zoom-in duration-700">
              🎤
            </div>
            <span className="absolute -top-1 -right-1 text-lg animate-bounce">✨</span>
          </div>
          <h2 className="text-lg md:text-2xl font-black text-slate-800 leading-tight">
            {t.login.welcome}
          </h2>
          <h1 className="text-xl md:text-3xl font-black bg-gradient-to-r from-[#1E88E5] to-[#F06292] bg-clip-text text-transparent">
            {t.appName}!
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-bold mt-1">{t.login.subtitle}</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-lg shadow-md shadow-blue-100/60 border-4 border-[#FFFDE7] p-4 md:p-6 space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setLoginMode('student');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition-all ${
                loginMode === 'student'
                  ? 'bg-white text-[#1E88E5] shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserIcon size={13} /> {t.login.studentTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('teacher');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition-all ${
                loginMode === 'teacher'
                  ? 'bg-white text-[#F06292] shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <GraduationCap size={13} /> {t.login.teacherTab}
            </button>
          </div>

          {/* Student: Name input */}
          {loginMode === 'student' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-600 uppercase tracking-wide">
                {t.login.nameLabel}
              </label>
              <input
                type="text"
                placeholder={t.login.namePlaceholder}
                className="w-full px-4 py-2.5 md:py-3.5 bg-[#FFFDF6] border-2 border-amber-200 rounded-lg focus:ring-4 focus:ring-amber-100 focus:border-amber-400 focus:outline-none text-base transition-all text-slate-700 font-bold placeholder-slate-300"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleLogin(e as any)}
                disabled={isLoggingIn}
                autoComplete="username"
              />
            </div>
          )}

          {/* Teacher: Email input */}
          {loginMode === 'teacher' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-600 uppercase tracking-wide">
                {t.login.emailLabel}
              </label>
              <input
                type="email"
                placeholder={t.login.emailPlaceholder}
                className="w-full px-4 py-2.5 md:py-3.5 bg-[#FFFDF6] border-2 border-pink-200 rounded-lg focus:ring-4 focus:ring-pink-100 focus:border-pink-400 focus:outline-none text-base transition-all text-slate-700 font-bold placeholder-slate-300"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleLogin(e as any)}
                disabled={isLoggingIn}
                autoComplete="email"
              />
            </div>
          )}

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide">
              {t.login.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t.login.passwordPlaceholder}
                className={`w-full px-4 py-3.5 pr-12 bg-[#FFFDF6] border-2 rounded-lg focus:ring-4 focus:outline-none text-base transition-all text-slate-700 font-bold placeholder-slate-300 ${
                  loginMode === 'teacher'
                    ? 'border-pink-200 focus:ring-pink-100 focus:border-pink-400'
                    : 'border-amber-200 focus:ring-amber-100 focus:border-amber-400'
                }`}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleLogin(e as any)}
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={
              isLoggingIn || (loginMode === 'student' ? !name.trim() : !email.trim()) || !password
            }
            className={`w-full py-4 text-white rounded-lg font-black text-lg transition-all shadow-md hover:shadow-md active:scale-95 border-b-4 disabled:border-slate-400 disabled:from-slate-300 disabled:to-slate-300 flex items-center justify-center gap-2 mt-2 ${
              loginMode === 'teacher'
                ? 'bg-gradient-to-r from-[#E91E63] to-[#F06292] hover:from-[#C2185B] hover:to-[#E91E63] shadow-pink-200 border-pink-900'
                : 'bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] hover:from-[#1565C0] hover:to-[#1E88E5] shadow-blue-200 border-blue-800'
            }`}
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {t.login.submitting}
              </>
            ) : (
              <>{loginMode === 'teacher' ? t.login.teacherSubmit : t.login.submit}</>
            )}
          </button>
        </div>

        {loginMode === 'student' && (
          <p className="text-center text-xs text-slate-400 font-bold mt-4">{t.login.hint}</p>
        )}
      </div>
    </div>
  );
}

export const LoginScreen = LoginPage;

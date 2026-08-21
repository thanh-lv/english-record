import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { loggerService } from '../services/loggerService';
import { UserProfile, Language } from '../types';

export interface UseAuthOptions {
  onLanguageChange?: (lang: Language) => void;
}

export function useAuth(options?: UseAuthOptions) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    authService.getStoredProfile()
  );
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    return !authService.getStoredProfile() && !authService.getStoredProfileId();
  });
  const { onLanguageChange } = options || {};
  const onLanguageChangeRef = useRef(onLanguageChange);
  onLanguageChangeRef.current = onLanguageChange;

  useEffect(() => {
    loggerService.setUserContext({
      id: userProfile?.id || null,
      name: userProfile?.name || null,
      role: userProfile?.role || null,
    });
  }, [userProfile]);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setAuthLoading(prev => {
        if (prev)
          loggerService.warn('Auth', 'Auth timeout: forcing loading to stop after 5 seconds');
        return false;
      });
    }, 5000);

    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          await authService.signInAnonymously().catch(err => {
            console.warn('Anonymous sign-in on init skipped or failed:', err?.message);
          });
        }
      } catch (err) {
        loggerService.error('Auth', 'Auth initialization error', err);
      }
    };
    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      const savedProfileId = authService.getStoredProfileId();

      if (savedProfileId) {
        try {
          const profile = await authService.getProfileById(savedProfileId);
          if (profile) {
            authService.setStoredProfile(profile);
            setUserProfile(profile);
            if (
              (profile.language === 'vi' || profile.language === 'en') &&
              onLanguageChangeRef.current
            ) {
              onLanguageChangeRef.current(profile.language as 'vi' | 'en');
            }
          } else {
            authService.clearStoredProfile();
            setUserProfile(null);
          }
        } catch (err) {
          loggerService.error('Auth', 'Error fetching persisted profile', err);
          const cached = authService.getStoredProfile();
          if (!cached) {
            setUserProfile(null);
          }
        }
      } else if (currentUser && !session?.user.is_anonymous) {
        // Teacher logged in via Supabase Auth — load profile by auth_uid
        try {
          const profile = await authService.getTeacherProfileByAuthUid(currentUser.id);
          if (profile) {
            authService.setStoredProfile(profile);
            setUserProfile(profile);
            if (
              (profile.language === 'vi' || profile.language === 'en') &&
              onLanguageChangeRef.current
            ) {
              onLanguageChangeRef.current(profile.language as 'vi' | 'en');
            }
          } else {
            authService.clearStoredProfile();
            setUserProfile(null);
          }
        } catch (err) {
          loggerService.error('Auth', 'Error fetching teacher profile', err);
          const cached = authService.getStoredProfile();
          if (!cached) {
            setUserProfile(null);
          }
        }
      } else {
        authService.clearStoredProfile();
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const loginStudent = useCallback(
    async (name: string, pass: string) => {
      let currentUserId = user?.id;
      if (!currentUserId) {
        try {
          const anonUser = await authService.signInAnonymously();
          currentUserId = anonUser?.id;
        } catch {
          // ignore
        }
      }
      const profile = await authService.loginStudent(name, pass, currentUserId || 'anonymous');
      authService.setStoredProfile(profile);
      setUserProfile(profile);
      return profile;
    },
    [user]
  );

  const loginTeacher = useCallback(async (email: string, pass: string) => {
    const profile = await authService.signInTeacher(email, pass);
    authService.setStoredProfile(profile);
    setUserProfile(profile);
    return profile;
  }, []);

  const loginSuperAdmin = useCallback(async (email: string, pass: string) => {
    const profile = await authService.signInSuperAdmin(email, pass);
    authService.setStoredProfile(profile);
    setUserProfile(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    authService.clearStoredProfile();
    setUserProfile(null);
    await authService.signOut();
  }, []);

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isTeacher = userProfile?.role === 'teacher';
  const isStudent = userProfile?.role === 'student';

  return {
    user,
    userProfile,
    setUserProfile,
    authLoading,
    isSuperAdmin,
    isTeacher,
    isStudent,
    loginStudent,
    loginTeacher,
    loginSuperAdmin,
    logout,
  };
}

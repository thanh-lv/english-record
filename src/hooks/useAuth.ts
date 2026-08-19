import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { authService, UserProfile } from '../services/authService';

interface UseAuthOptions {
  onLanguageChange?: (lang: 'vi' | 'en') => void;
}

export function useAuth(options?: UseAuthOptions) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { onLanguageChange } = options || {};

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setAuthLoading(prev => {
        if (prev) console.warn('Auth timeout: forcing loading to stop after 5 seconds');
        return false;
      });
    }, 5000);

    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          await authService.signInAnonymously();
        }
      } catch (err) {
        console.error('Auth error:', err);
        setAuthLoading(false);
      }
    };
    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      const savedProfileId = authService.getStoredProfileId();

      if (currentUser && savedProfileId) {
        try {
          const profile = await authService.getProfileById(savedProfileId);
          if (profile) {
            setUserProfile(profile);
            if ((profile.language === 'vi' || profile.language === 'en') && onLanguageChange) {
              onLanguageChange(profile.language as 'vi' | 'en');
            }
          } else {
            authService.clearStoredProfileId();
            setUserProfile(null);
          }
        } catch (err) {
          console.error('Error fetching persisted profile:', err);
          setUserProfile(null);
        }
      } else if (currentUser && !session?.user.is_anonymous) {
        // Teacher logged in via Supabase Auth — load profile by auth_uid
        try {
          const profile = await authService.getTeacherProfileByAuthUid(currentUser.id);
          if (profile) {
            authService.setStoredProfileId(profile.id);
            setUserProfile(profile);
            if ((profile.language === 'vi' || profile.language === 'en') && onLanguageChange) {
              onLanguageChange(profile.language as 'vi' | 'en');
            }
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error('Error fetching teacher profile:', err);
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
  }, [onLanguageChange]);

  const loginStudent = useCallback(
    async (name: string, pass: string) => {
      if (!user) {
        throw new Error('Hệ thống đang khởi tạo, vui lòng thử lại sau 2 giây.');
      }
      const profile = await authService.loginStudent(name, pass, user.id);
      setUserProfile(profile);
      return profile;
    },
    [user]
  );

  const loginTeacher = useCallback(async (email: string, pass: string) => {
    const profile = await authService.signInTeacher(email, pass);
    setUserProfile(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    setUserProfile(null);
    await authService.signOut();
  }, []);

  const isTeacher = userProfile?.role === 'teacher';
  const isStudent = userProfile?.role === 'student';

  return {
    user,
    userProfile,
    setUserProfile,
    authLoading,
    isTeacher,
    isStudent,
    loginStudent,
    loginTeacher,
    logout,
  };
}

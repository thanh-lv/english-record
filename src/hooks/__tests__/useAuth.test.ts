import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { authService } from '../../services/authService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
    },
  },
}));

vi.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    signInAnonymously: vi.fn(),
    getStoredProfile: vi.fn(),
    setStoredProfile: vi.fn(),
    clearStoredProfile: vi.fn(),
    getStoredProfileId: vi.fn(),
    setStoredProfileId: vi.fn(),
    clearStoredProfileId: vi.fn(),
    getProfileById: vi.fn(),
    getTeacherProfileByAuthUid: vi.fn(),
    loginStudent: vi.fn(),
    signInTeacher: vi.fn(),
    signInSuperAdmin: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe('useAuth hook', () => {
  let authCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (authService.getStoredProfile as any).mockReturnValue(null);
    (authService.getStoredProfileId as any).mockReturnValue(null);
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      authCallback = cb;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes anonymous sign-in if no user is authenticated', async () => {
    (authService.getCurrentUser as any).mockResolvedValue(null);
    (authService.getStoredProfileId as any).mockReturnValue(null);

    renderHook(() => useAuth());

    expect(authService.getCurrentUser).toHaveBeenCalled();
  });

  it('handles auth initialization error gracefully', async () => {
    (authService.getCurrentUser as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      if (authCallback) {
        await authCallback('INITIAL_SESSION', null);
      }
    });

    expect(result.current.authLoading).toBe(false);
  });

  it('initializes userProfile synchronously from stored profile in localStorage', () => {
    const cachedProfile = { id: 'prof-cached', name: 'Cached Teacher', role: 'teacher' };
    (authService.getStoredProfile as any).mockReturnValue(cachedProfile);

    const { result } = renderHook(() => useAuth());

    expect(result.current.userProfile).toEqual(cachedProfile);
    expect(result.current.authLoading).toBe(false);
  });

  it('triggers safety timeout after 5 seconds if authLoading remains true', () => {
    (authService.getCurrentUser as any).mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useAuth());

    expect(result.current.authLoading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5100);
    });

    expect(result.current.authLoading).toBe(false);
  });

  it('loads student profile from localStorage when session exists', async () => {
    const mockProfile = { id: 'prof-1', name: 'Alice', role: 'student', language: 'vi' };
    (authService.getStoredProfileId as any).mockReturnValue('prof-1');
    (authService.getProfileById as any).mockResolvedValue(mockProfile);

    const onLanguageChange = vi.fn();
    const { result } = renderHook(() => useAuth({ onLanguageChange }));

    await act(async () => {
      await authCallback('SIGNED_IN', {
        user: { id: 'user-1', is_anonymous: true },
      });
    });

    expect(result.current.userProfile).toEqual(mockProfile);
    expect(result.current.isStudent).toBe(true);
    expect(result.current.isTeacher).toBe(false);
    expect(onLanguageChange).toHaveBeenCalledWith('vi');
  });

  it('clears stored profile if getProfileById returns null', async () => {
    (authService.getStoredProfileId as any).mockReturnValue('invalid-id');
    (authService.getProfileById as any).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback('SIGNED_IN', {
        user: { id: 'user-1', is_anonymous: true },
      });
    });

    expect(authService.clearStoredProfile).toHaveBeenCalled();
    expect(result.current.userProfile).toBeNull();
  });

  it('handles error during getProfileById gracefully', async () => {
    (authService.getStoredProfileId as any).mockReturnValue('prof-1');
    (authService.getProfileById as any).mockRejectedValue(new Error('DB failure'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback('SIGNED_IN', {
        user: { id: 'user-1', is_anonymous: true },
      });
    });

    expect(result.current.userProfile).toBeNull();
  });

  it('loads teacher profile by auth_uid when user is not anonymous', async () => {
    const mockTeacher = { id: 'teacher-1', name: 'Teacher', role: 'teacher', language: 'en' };
    (authService.getStoredProfileId as any).mockReturnValue(null);
    (authService.getTeacherProfileByAuthUid as any).mockResolvedValue(mockTeacher);

    const onLanguageChange = vi.fn();
    const { result } = renderHook(() => useAuth({ onLanguageChange }));

    await act(async () => {
      await authCallback('SIGNED_IN', {
        user: { id: 'teacher-auth-uid', is_anonymous: false },
      });
    });

    expect(authService.setStoredProfile).toHaveBeenCalledWith(mockTeacher);
    expect(result.current.userProfile).toEqual(mockTeacher);
    expect(result.current.isTeacher).toBe(true);
    expect(onLanguageChange).toHaveBeenCalledWith('en');
  });

  it('handles error during getTeacherProfileByAuthUid gracefully', async () => {
    (authService.getStoredProfileId as any).mockReturnValue(null);
    (authService.getTeacherProfileByAuthUid as any).mockRejectedValue(new Error('DB err'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback('SIGNED_IN', {
        user: { id: 'teacher-auth-uid', is_anonymous: false },
      });
    });

    expect(result.current.userProfile).toBeNull();
  });

  it('handles student login action when user is initialized', async () => {
    const mockStudent = { id: 'st-1', name: 'Bob', role: 'student' };
    (authService.loginStudent as any).mockResolvedValue(mockStudent);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback('SIGNED_IN', {
        user: { id: 'user-1', is_anonymous: true },
      });
    });

    await act(async () => {
      const profile = await result.current.loginStudent('Bob', '123');
      expect(profile).toEqual(mockStudent);
    });

    expect(result.current.userProfile).toEqual(mockStudent);
  });

  it('handles student login gracefully even when user is not yet initialized', async () => {
    const mockStudent = { id: 'st-1', name: 'Bob', role: 'student' };
    (authService.loginStudent as any).mockResolvedValue(mockStudent);
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const profile = await result.current.loginStudent('Bob', '123');
      expect(profile).toEqual(mockStudent);
    });

    expect(result.current.userProfile).toEqual(mockStudent);
  });

  it('handles teacher login action', async () => {
    const mockTeacher = { id: 'teacher-1', name: 'Teacher', role: 'teacher' };
    (authService.signInTeacher as any).mockResolvedValue(mockTeacher);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const profile = await result.current.loginTeacher('teacher@school.com', 'secret');
      expect(profile).toEqual(mockTeacher);
    });

    expect(result.current.userProfile).toEqual(mockTeacher);
  });

  it('handles logout action', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.signOut).toHaveBeenCalled();
    expect(result.current.userProfile).toBeNull();
  });
});

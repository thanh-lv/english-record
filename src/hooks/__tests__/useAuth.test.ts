import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    getStoredProfileId: vi.fn(),
    setStoredProfileId: vi.fn(),
    clearStoredProfileId: vi.fn(),
    getProfileById: vi.fn(),
    getTeacherProfileByAuthUid: vi.fn(),
    loginStudent: vi.fn(),
    signInTeacher: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe('useAuth hook', () => {
  let authCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('initializes anonymous sign-in if no user is authenticated', async () => {
    (authService.getCurrentUser as any).mockResolvedValue(null);
    (authService.getStoredProfileId as any).mockReturnValue(null);

    renderHook(() => useAuth());

    expect(authService.getCurrentUser).toHaveBeenCalled();
  });

  it('loads profile from localStorage when session exists', async () => {
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

  it('handles student login action', async () => {
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

  it('handles logout action', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.signOut).toHaveBeenCalled();
    expect(result.current.userProfile).toBeNull();
  });
});

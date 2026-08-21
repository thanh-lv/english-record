import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, PROFILE_ID_STORAGE_KEY } from '../authService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInAnonymously: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('LocalStorage helpers', () => {
    it('manages profile ID in localStorage correctly', () => {
      expect(authService.getStoredProfileId()).toBeNull();

      authService.setStoredProfileId('profile-123');
      expect(authService.getStoredProfileId()).toBe('profile-123');
      expect(localStorage.getItem(PROFILE_ID_STORAGE_KEY)).toBe('profile-123');

      authService.clearStoredProfileId();
      expect(authService.getStoredProfileId()).toBeNull();
    });

    it('manages full profile in localStorage correctly', () => {
      expect(authService.getStoredProfile()).toBeNull();

      const mockProfile: any = { id: 'p1', name: 'Teacher A', role: 'teacher' };
      authService.setStoredProfile(mockProfile);
      expect(authService.getStoredProfile()).toEqual(mockProfile);
      expect(authService.getStoredProfileId()).toBe('p1');

      authService.clearStoredProfile();
      expect(authService.getStoredProfile()).toBeNull();
      expect(authService.getStoredProfileId()).toBeNull();
    });

    it('gracefully handles localStorage exceptions', () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(authService.getStoredProfileId()).toBeNull();
      expect(authService.getStoredProfile()).toBeNull();
      getItemSpy.mockRestore();

      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => authService.setStoredProfileId('123')).not.toThrow();
      expect(() =>
        authService.setStoredProfile({ id: '123', name: 'Test', role: 'student' } as any)
      ).not.toThrow();
      setItemSpy.mockRestore();

      const removeItemSpy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(() => authService.clearStoredProfileId()).not.toThrow();
      expect(() => authService.clearStoredProfile()).not.toThrow();
      removeItemSpy.mockRestore();
    });
  });

  describe('getCurrentUser', () => {
    it('returns the current user when present', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'u1', email: 'test@example.com' } },
        error: null,
      });

      const user = await authService.getCurrentUser();
      expect(user).toEqual({ id: 'u1', email: 'test@example.com' });
    });

    it('returns null when no user is found', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('logs a warning on unexpected error other than AuthSessionMissingError', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: { name: 'NetworkError', message: 'Connection lost' },
      });

      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('GetUser warning:', 'Connection lost');
      warnSpy.mockRestore();
    });
  });

  describe('signInAnonymously', () => {
    it('signs in anonymously and returns the user', async () => {
      (supabase.auth.signInAnonymously as any).mockResolvedValue({
        data: { user: { id: 'anon-1' } },
        error: null,
      });

      const user = await authService.signInAnonymously();
      expect(user).toEqual({ id: 'anon-1' });
    });

    it('throws error when anonymous sign-in fails', async () => {
      (supabase.auth.signInAnonymously as any).mockResolvedValue({
        data: { user: null },
        error: new Error('Network error'),
      });

      await expect(authService.signInAnonymously()).rejects.toThrow('Network error');
    });
  });

  describe('getProfileById', () => {
    it('fetches profile by ID', async () => {
      const mockProfile = { id: 'p1', name: 'Alice', role: 'student' };
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const profile = await authService.getProfileById('p1');
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('id', 'p1');
      expect(profile).toEqual(mockProfile);
    });

    it('returns null when error or not found', async () => {
      const maybeSingleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Not found') });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const profile = await authService.getProfileById('p1');
      expect(profile).toBeNull();
    });
  });

  describe('getTeacherProfileByAuthUid', () => {
    it('fetches teacher profile by auth UID', async () => {
      const mockProfile = { id: 't1', name: 'Teacher 1', role: 'teacher' };
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
      const eqRoleMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqUidMock = vi.fn().mockReturnValue({ eq: eqRoleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqUidMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const profile = await authService.getTeacherProfileByAuthUid('auth-123');
      expect(eqUidMock).toHaveBeenCalledWith('auth_uid', 'auth-123');
      expect(eqRoleMock).toHaveBeenCalledWith('role', 'teacher');
      expect(profile).toEqual(mockProfile);
    });

    it('returns null if teacher profile not found or error occurs', async () => {
      const maybeSingleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Not found') });
      const eqRoleMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqUidMock = vi.fn().mockReturnValue({ eq: eqRoleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqUidMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const profile = await authService.getTeacherProfileByAuthUid('invalid-uid');
      expect(profile).toBeNull();
    });
  });

  describe('signInTeacher', () => {
    it('authenticates teacher and sets profile in localStorage', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: { id: 'teacher-auth-1' } },
        error: null,
      });

      const mockProfile = { id: 'prof-teacher-1', name: 'Teacher Bob', role: 'teacher' };
      vi.spyOn(authService, 'getTeacherProfileByAuthUid').mockResolvedValue(mockProfile as any);

      const profile = await authService.signInTeacher('teacher@example.com', 'pass123456');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'teacher@example.com',
        password: 'pass123456',
      });
      expect(profile).toEqual(mockProfile);
      expect(localStorage.getItem(PROFILE_ID_STORAGE_KEY)).toBe('prof-teacher-1');
    });

    it('throws error when password is wrong', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid credentials'),
      });

      await expect(authService.signInTeacher('teacher@example.com', 'wrongpass')).rejects.toThrow(
        'Email hoặc mật khẩu không chính xác.'
      );
    });

    it('throws error when teacher profile does not exist in profiles table', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: { id: 'teacher-auth-1' } },
        error: null,
      });
      vi.spyOn(authService, 'getTeacherProfileByAuthUid').mockResolvedValue(null);

      await expect(authService.signInTeacher('teacher@example.com', 'pass123456')).rejects.toThrow(
        'Tài khoản giáo viên không tồn tại trong hệ thống.'
      );
    });
  });

  describe('loginStudent', () => {
    it('logs in student successfully and updates auth_user_id', async () => {
      const existing = {
        id: 'st-1',
        name: 'Alice',
        role: 'student',
        password: '123',
      };

      const maybeSingleMock = vi.fn().mockResolvedValue({ data: existing, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const ilikeMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });

      const eqUpdateMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: selectMock, update: updateMock };
        }
        return {};
      });

      const res = await authService.loginStudent('Alice', '123', 'anon-user-1');

      expect(res.id).toBe('st-1');
      expect(res.auth_user_id).toBe('anon-user-1');
      expect(localStorage.getItem(PROFILE_ID_STORAGE_KEY)).toBe('st-1');
    });

    it('allows student login when existing account has no password set', async () => {
      const existing = {
        id: 'st-1',
        name: 'Alice',
        role: 'student',
        password: null,
      };

      const maybeSingleMock = vi.fn().mockResolvedValue({ data: existing, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const ilikeMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });

      const eqUpdateMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock });

      (supabase.from as any).mockReturnValue({ select: selectMock, update: updateMock });

      const res = await authService.loginStudent('Alice', 'newpass123', 'anon-1');
      expect(res.id).toBe('st-1');
      expect(res.password).toBe('newpass123');
    });

    it('throws error when student does not exist', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const ilikeMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(authService.loginStudent('NonExistent', '123', 'anon-1')).rejects.toThrow(
        'Tên đăng nhập không tồn tại.'
      );
    });

    it('throws error when search query fails', async () => {
      const maybeSingleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Search failed') });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const ilikeMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(authService.loginStudent('Alice', '123', 'anon-1')).rejects.toThrow(
        'Search failed'
      );
    });

    it('throws error when student password does not match', async () => {
      const existing = {
        id: 'st-1',
        name: 'Alice',
        role: 'student',
        password: 'correct-password',
      };

      const maybeSingleMock = vi.fn().mockResolvedValue({ data: existing, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const ilikeMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(authService.loginStudent('Alice', 'wrong-pass', 'anon-1')).rejects.toThrow(
        'Tên đăng nhập hoặc mật khẩu không chính xác.'
      );
    });

    it('throws error when update profile fails on login', async () => {
      const existing = { id: 'st-1', name: 'Alice', role: 'student', password: '123' };

      const maybeSingleMock = vi.fn().mockResolvedValue({ data: existing, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const ilikeMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock });

      const eqUpdateMock = vi.fn().mockResolvedValue({ error: new Error('Update failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock });

      (supabase.from as any).mockReturnValue({ select: selectMock, update: updateMock });

      await expect(authService.loginStudent('Alice', '123', 'anon-1')).rejects.toThrow(
        'Update failed'
      );
    });

    it('times out when DB operation hangs', async () => {
      const selectMock = vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
          }),
        }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(authService.loginStudent('Alice', '123', 'anon-1', 20)).rejects.toThrow(
        'Hết thời gian kết nối, vui lòng thử lại!'
      );
    });
  });

  describe('signOut', () => {
    it('clears storage, signs out and signs in anonymously', async () => {
      localStorage.setItem(PROFILE_ID_STORAGE_KEY, 'some-id');
      (supabase.auth.signOut as any).mockResolvedValue({ error: null });
      (supabase.auth.signInAnonymously as any).mockResolvedValue({
        data: { user: { id: 'anon' } },
        error: null,
      });

      await authService.signOut();

      expect(localStorage.getItem(PROFILE_ID_STORAGE_KEY)).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(supabase.auth.signInAnonymously).toHaveBeenCalled();
    });
  });
});

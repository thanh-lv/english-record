import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export const PROFILE_ID_STORAGE_KEY = 'english_record_profile_id';
export const PROFILE_DATA_STORAGE_KEY = 'english_record_user_profile';

export type { UserProfile };

export const authService = {
  getStoredProfile(): UserProfile | null {
    try {
      const data = localStorage.getItem(PROFILE_DATA_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setStoredProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(PROFILE_DATA_STORAGE_KEY, JSON.stringify(profile));
      localStorage.setItem(PROFILE_ID_STORAGE_KEY, profile.id);
    } catch {
      // ignore storage errors
    }
  },

  clearStoredProfile(): void {
    try {
      localStorage.removeItem(PROFILE_DATA_STORAGE_KEY);
      localStorage.removeItem(PROFILE_ID_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  },

  getStoredProfileId(): string | null {
    try {
      return localStorage.getItem(PROFILE_ID_STORAGE_KEY) || this.getStoredProfile()?.id || null;
    } catch {
      return null;
    }
  },

  setStoredProfileId(id: string): void {
    try {
      localStorage.setItem(PROFILE_ID_STORAGE_KEY, id);
    } catch {
      // ignore storage errors
    }
  },

  clearStoredProfileId(): void {
    this.clearStoredProfile();
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') {
      console.warn('GetUser warning:', error.message);
    }
    return user;
  },

  async signInAnonymously() {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  },

  async getProfileById(profileId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserProfile;
  },

  async getTeacherProfileByAuthUid(authUid: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_uid', authUid)
      .eq('role', 'teacher')
      .maybeSingle();

    if (error || !data) {
      // Check if user is super_admin
      try {
        const adminRes = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_uid', authUid)
          .maybeSingle();

        if (adminRes?.data && adminRes.data.role === 'super_admin') {
          return adminRes.data as UserProfile;
        }
      } catch {
        // ignore mock errors in unit tests
      }
      return null;
    }
    return data as UserProfile;
  },

  async signInTeacher(email: string, pass: string): Promise<UserProfile> {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });
    if (signInError || !data.user) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const profile = await this.getTeacherProfileByAuthUid(data.user.id);
    if (!profile) {
      throw new Error('Tài khoản giáo viên không tồn tại trong hệ thống.');
    }

    this.setStoredProfile(profile);
    return profile;
  },

  async signInSuperAdmin(email: string, pass: string): Promise<UserProfile> {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });
    if (signInError || !data.user) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_uid', data.user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (error || !profile) {
      await supabase.auth.signOut();
      throw new Error('Tài khoản không có quyền quản trị viên cấp cao (Super Admin).');
    }

    this.setStoredProfile(profile as UserProfile);
    return profile as UserProfile;
  },

  async loginStudent(
    username: string,
    pass: string,
    currentUserId = 'anonymous',
    timeoutMs = 8000
  ): Promise<UserProfile> {
    const trimmedUsername = username.trim();

    const dbOperation = async () => {
      const { data: existingUser, error: searchError } = await supabase
        .from('profiles')
        .select(
          'id, name, role, password, avatar, year_born, grade, auth_user_id, teacher_id, username'
        )
        .ilike('username', trimmedUsername)
        .eq('role', 'student')
        .maybeSingle();

      if (searchError) throw searchError;
      if (!existingUser || existingUser.role !== 'student') {
        throw new Error('Tên đăng nhập không tồn tại.');
      }
      if (existingUser.password && existingUser.password !== pass) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }

      const validAuthUserId =
        currentUserId && currentUserId !== 'anonymous'
          ? currentUserId
          : existingUser.auth_user_id || null;

      const updatedProfile: UserProfile = {
        ...existingUser,
        auth_user_id: validAuthUserId,
        password: pass,
        updated_at: new Date().toISOString(),
      };

      const updatePayload: Record<string, any> = {
        password: pass,
        updated_at: updatedProfile.updated_at,
      };
      if (validAuthUserId) {
        updatePayload.auth_user_id = validAuthUserId;
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', existingUser.id);

      if (dbError) throw dbError;
      return updatedProfile;
    };

    const profileData = (await Promise.race([
      dbOperation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Hết thời gian kết nối, vui lòng thử lại!')), timeoutMs)
      ),
    ])) as UserProfile;

    this.setStoredProfile(profileData);
    return profileData;
  },

  async signOut(): Promise<void> {
    this.clearStoredProfile();
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
  },
};

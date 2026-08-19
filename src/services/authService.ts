import { supabase } from '../lib/supabase';

export const PROFILE_ID_STORAGE_KEY = 'english_record_profile_id';

export interface UserProfile {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  avatar?: string | null;
  year_born?: number | null;
  grade?: number | null;
  language?: 'vi' | 'en' | string;
  auth_uid?: string | null;
  auth_user_id?: string | null;
  password?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export const authService = {
  getStoredProfileId(): string | null {
    try {
      return localStorage.getItem(PROFILE_ID_STORAGE_KEY);
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
    try {
      localStorage.removeItem(PROFILE_ID_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
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

    if (error || !data) return null;
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

    this.setStoredProfileId(profile.id);
    return profile;
  },

  async loginStudent(
    name: string,
    pass: string,
    currentUserId: string,
    timeoutMs = 8000
  ): Promise<UserProfile> {
    const trimmedName = name.trim();

    const dbOperation = async () => {
      const { data: existingUser, error: searchError } = await supabase
        .from('profiles')
        .select('id, name, role, password, avatar, year_born, grade, auth_user_id')
        .ilike('name', trimmedName)
        .eq('role', 'student')
        .maybeSingle();

      if (searchError) throw searchError;
      if (!existingUser || existingUser.role !== 'student') {
        throw new Error('Tên học sinh không tồn tại.');
      }
      if (existingUser.password && existingUser.password !== pass) {
        throw new Error('Tên học sinh đã tồn tại hoặc mật khẩu không chính xác.');
      }

      const updatedProfile: UserProfile = {
        ...existingUser,
        auth_user_id: currentUserId,
        password: pass,
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          auth_user_id: currentUserId,
          password: pass,
          updated_at: updatedProfile.updated_at,
        })
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

    this.setStoredProfileId(profileData.id);
    return profileData;
  },

  async signOut(): Promise<void> {
    this.clearStoredProfileId();
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
  },
};

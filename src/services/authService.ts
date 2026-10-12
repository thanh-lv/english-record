import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export const PROFILE_ID_STORAGE_KEY = 'english_record_profile_id';
export const PROFILE_DATA_STORAGE_KEY = 'english_record_user_profile';

export type { UserProfile };

// Mã lỗi do hàm login_student trả về
const STUDENT_LOGIN_ERRORS: Record<string, string> = {
  student_not_found: 'Tên đăng nhập không tồn tại.',
  invalid_password: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
  password_not_set: 'Tài khoản chưa có mật khẩu. Hãy nhờ giáo viên đặt mật khẩu cho em nhé.',
};

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
      // Không bao giờ lưu mật khẩu xuống máy người dùng
      const { password: _password, ...safeProfile } = profile;
      localStorage.setItem(PROFILE_DATA_STORAGE_KEY, JSON.stringify(safeProfile));
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

  /**
   * Đăng nhập học sinh. Mật khẩu được kiểm tra phía server bởi hàm `login_student`
   * (xem docs/migrations/004_student_password_hash.sql); client không bao giờ nhận mật khẩu.
   */
  async loginStudent(username: string, pass: string, timeoutMs = 8000): Promise<UserProfile> {
    const dbOperation = async () => {
      const { data, error } = await supabase.rpc('login_student', {
        p_username: username.trim(),
        p_password: pass,
      });

      if (error) {
        const friendly = STUDENT_LOGIN_ERRORS[error.message];
        if (friendly) throw new Error(friendly);
        throw error;
      }
      if (!data) throw new Error(STUDENT_LOGIN_ERRORS.student_not_found);
      return data as UserProfile;
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

export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
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

export interface TeacherLoginCredentials {
  email: string;
  pass: string;
}

export interface StudentLoginCredentials {
  name: string;
  pass: string;
  currentUserId: string;
  timeoutMs?: number;
}

import type { UserProfile } from '../types';

/**
 * Trang mặc định của người dùng theo vai trò; chưa đăng nhập thì về trang đăng nhập.
 */
export function homePathFor(profile?: Pick<UserProfile, 'role'> | null): string {
  if (!profile) return '/login';
  if (profile.role === 'super_admin') return '/admin/dashboard';
  if (profile.role === 'teacher') return '/teacher/attendance';
  return '/student';
}

-- ============================================================
-- Migration: Super Admin & Auto Create Profile from Auth.Users
-- ============================================================

-- 1. Cập nhật check constraint cho role trong bảng profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'super_admin'::text]));

-- 2. Đảm bảo unique index cho auth_uid
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_uid_key 
  ON profiles (auth_uid) 
  WHERE auth_uid IS NOT NULL;

-- 3. Đảm bảo role 'super_admin' và 'teacher' có tên riêng biệt
DROP INDEX IF EXISTS profiles_teacher_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_staff_name_unique
  ON profiles (lower(trim(both from name)))
  WHERE role IN ('teacher', 'super_admin');

-- 4. TRIGGER TỰ ĐỘNG: Khi bạn bấm "Add user" trong Authentication > Users, 
-- hệ thống sẽ TỰ ĐỘNG tạo 1 dòng trong bảng profiles với auth_uid tương ứng!
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  -- Bỏ qua nếu là tài khoản ẩn danh (Anonymous user không có email)
  IF (NEW.is_anonymous IS TRUE) OR (NEW.email IS NULL) THEN
    RETURN NEW;
  END IF;

  -- Nếu là email của Super Admin
  IF NEW.email = 'levanthanh29111999@gmail.com' THEN
    INSERT INTO public.profiles (name, role, auth_uid, updated_at)
    VALUES ('Super Admin', 'super_admin', NEW.id, now())
    ON CONFLICT (auth_uid) DO UPDATE
      SET role = 'super_admin', updated_at = now();
  ELSE
    -- Mặc định các email khác tạo từ Supabase Auth sẽ là Giáo Viên (teacher)
    INSERT INTO public.profiles (name, role, auth_uid, password, updated_at)
    VALUES (split_part(NEW.email, '@', 1), 'teacher', NEW.id, '12345678', now())
    ON CONFLICT (auth_uid) DO UPDATE
      SET role = 'teacher', updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. ĐỒNG BỘ DỮ LIỆU ĐÃ TẠO SẴN:
-- Đồng bộ tất cả tài khoản đã có sẵn trong Authentication > Users sang profiles
INSERT INTO public.profiles (name, role, auth_uid, password, updated_at)
SELECT 
  CASE WHEN u.email = 'levanthanh29111999@gmail.com' THEN 'Super Admin' ELSE split_part(u.email, '@', 1) END,
  CASE WHEN u.email = 'levanthanh29111999@gmail.com' THEN 'super_admin' ELSE 'teacher' END,
  u.id,
  CASE WHEN u.email = 'levanthanh29111999@gmail.com' THEN NULL ELSE '12345678' END,
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_uid = u.id
WHERE p.id IS NULL AND (u.is_anonymous IS NOT TRUE OR u.is_anonymous IS NULL);

-- Đảm bảo tài khoản levanthanh29111999@gmail.com là super_admin
UPDATE public.profiles
SET role = 'super_admin', updated_at = now()
WHERE auth_uid = (SELECT id FROM auth.users WHERE email = 'levanthanh29111999@gmail.com');

-- ============================================================
-- Migration 004: Hash mật khẩu học sinh & đăng nhập phía server
-- ============================================================
-- Trước đây mật khẩu học sinh nằm dạng chữ thường ở profiles.password và trình
-- duyệt tự tải về để so sánh, nên ai cũng đọc được mật khẩu của mọi học sinh.
-- Sau migration này:
--   * Mật khẩu chỉ còn ở dạng hash bcrypt trong bảng student_credentials,
--     bảng này client không đọc/ghi trực tiếp được.
--   * Đăng nhập học sinh đi qua hàm login_student(), so sánh hash phía server.
--   * Giáo viên vẫn tạo học sinh / đặt lại mật khẩu bằng cách ghi profiles.password
--     như cũ: trigger sẽ hash giá trị đó rồi xóa bản chữ thường trước khi lưu.
--
-- LƯU Ý TRƯỚC KHI CHẠY:
--   * Bước 3 xóa mật khẩu chữ thường và KHÔNG khôi phục được. Hãy backup trước.
--   * Học sinh cũ chưa từng có mật khẩu sẽ không đăng nhập được cho tới khi
--     giáo viên đặt mật khẩu (trước đây các tài khoản này nhập gì cũng vào được).
--   * Chạy migration rồi deploy bản web mới ngay sau đó: bản web cũ không đăng
--     nhập học sinh được nữa.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Bảng lưu hash. Bật RLS và không có policy nào: chỉ các hàm SECURITY DEFINER
--    bên dưới mới đụng tới được.
CREATE TABLE IF NOT EXISTS public.student_credentials (
  profile_id    uuid PRIMARY KEY
                REFERENCES public.profiles(id) ON DELETE CASCADE
                DEFERRABLE INITIALLY DEFERRED,
  password_hash text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_credentials FROM PUBLIC, anon, authenticated;

-- 2. Chuyển mật khẩu hiện có sang hash (giữ nguyên từng ký tự như đang lưu)
INSERT INTO public.student_credentials (profile_id, password_hash)
SELECT id, extensions.crypt(password, extensions.gen_salt('bf', 8))
FROM public.profiles
WHERE role = 'student' AND password IS NOT NULL AND password <> ''
ON CONFLICT (profile_id) DO NOTHING;

-- 3. Xóa mật khẩu chữ thường của học sinh
UPDATE public.profiles
SET password = NULL
WHERE role = 'student' AND password IS NOT NULL;

-- 4. Ai được đặt mật khẩu cho học sinh: giáo viên chủ nhiệm của học sinh đó,
--    super admin, hoặc SQL Editor / service key (không có JWT của người dùng).
CREATE OR REPLACE FUNCTION public.can_set_student_password(p_teacher_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.role(), 'service_role') = 'service_role'
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.auth_uid = auth.uid()
          AND (p.role = 'super_admin' OR (p.role = 'teacher' AND p.id = p_teacher_id))
      );
$$;

-- 5. Trigger: mọi lần ghi profiles.password của học sinh đều được hash sang
--    student_credentials, cột password luôn được lưu là NULL.
CREATE OR REPLACE FUNCTION public.hash_student_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'student' THEN
    RETURN NEW;
  END IF;

  IF NEW.password IS NULL OR NEW.password = '' THEN
    NEW.password := NULL;
    RETURN NEW;
  END IF;

  IF NOT public.can_set_student_password(
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.teacher_id ELSE NEW.teacher_id END
  ) THEN
    RAISE EXCEPTION 'not_allowed_to_set_student_password' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.student_credentials (profile_id, password_hash, updated_at)
  VALUES (NEW.id, crypt(NEW.password, gen_salt('bf', 8)), now())
  ON CONFLICT (profile_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, updated_at = now();

  NEW.password := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_hash_student_password ON public.profiles;
CREATE TRIGGER profiles_hash_student_password
  BEFORE INSERT OR UPDATE OF password ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.hash_student_password();

-- 6. Đăng nhập học sinh. Trả về hồ sơ (không kèm mật khẩu) nếu đúng, ngược lại
--    báo lỗi với message: student_not_found | password_not_set | invalid_password
CREATE OR REPLACE FUNCTION public.login_student(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile  public.profiles%ROWTYPE;
  v_hash     text;
  v_found    boolean := false;
  v_has_hash boolean := false;
BEGIN
  FOR v_profile IN
    SELECT p.*
    FROM public.profiles p
    WHERE p.role = 'student'
      AND lower(p.username) = lower(trim(p_username))
  LOOP
    v_found := true;

    SELECT c.password_hash INTO v_hash
    FROM public.student_credentials c
    WHERE c.profile_id = v_profile.id;

    IF v_hash IS NOT NULL THEN
      v_has_hash := true;
      IF v_hash = crypt(p_password, v_hash) THEN
        -- Gắn phiên ẩn danh hiện tại với học sinh, giống luồng đăng nhập cũ
        UPDATE public.profiles
        SET auth_user_id = coalesce(auth.uid(), auth_user_id),
            updated_at = now()
        WHERE id = v_profile.id
        RETURNING * INTO v_profile;

        RETURN to_jsonb(v_profile) - 'password';
      END IF;
    END IF;
  END LOOP;

  IF NOT v_found THEN
    RAISE EXCEPTION 'student_not_found';
  ELSIF NOT v_has_hash THEN
    RAISE EXCEPTION 'password_not_set';
  END IF;
  RAISE EXCEPTION 'invalid_password';
END;
$$;

REVOKE ALL ON FUNCTION public.login_student(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_student(text, text) TO anon, authenticated;

COMMIT;

-- Kiểm tra sau khi chạy:
--   * Không còn mật khẩu chữ thường của học sinh (kết quả phải là 0):
--       SELECT count(*) FROM profiles WHERE role = 'student' AND password IS NOT NULL;
--   * Học sinh chưa có mật khẩu, cần giáo viên đặt lại:
--       SELECT p.name, p.username FROM profiles p
--       LEFT JOIN student_credentials c ON c.profile_id = p.id
--       WHERE p.role = 'student' AND c.profile_id IS NULL;

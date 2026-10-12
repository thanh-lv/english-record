-- ============================================================
-- Migration: Multi-Teacher Architecture
-- Description: Thêm teacher_id vào các bảng chưa có,
--              sửa unique constraints, cập nhật views
-- ============================================================

-- ============================================================
-- STEP 1: Thêm cột teacher_id cho các bảng chưa có
-- ============================================================

ALTER TABLE attendance_students
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE shadowing_videos
  ADD COLUMN IF NOT EXISTS teacher_id uuid;

ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS teacher_id uuid;

ALTER TABLE vocab_audios
  ADD COLUMN IF NOT EXISTS teacher_id uuid;

-- ============================================================
-- STEP 2: Tạo indexes cho teacher_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_attendance_students_teacher
  ON attendance_students(teacher_id);

CREATE INDEX IF NOT EXISTS idx_shadowing_videos_teacher
  ON shadowing_videos(teacher_id);

CREATE INDEX IF NOT EXISTS idx_recordings_teacher
  ON recordings(teacher_id);

CREATE INDEX IF NOT EXISTS idx_vocab_audios_teacher
  ON vocab_audios(teacher_id);

CREATE INDEX IF NOT EXISTS idx_profiles_teacher
  ON profiles(teacher_id);

CREATE INDEX IF NOT EXISTS idx_topics_teacher
  ON topics(teacher_id);

CREATE INDEX IF NOT EXISTS idx_stories_teacher
  ON stories(teacher_id);

CREATE INDEX IF NOT EXISTS idx_vocabulary_sets_teacher
  ON vocabulary_sets(teacher_id);

-- ============================================================
-- STEP 3: Sửa unique constraints cho profiles
-- Name phải unique trong phạm vi 1 giáo viên (không global)
-- ============================================================

-- Xóa unique indexes cũ (global unique trên name)
DROP INDEX IF EXISTS profiles_name_unique_idx;
DROP INDEX IF EXISTS profiles_name_unique;

-- Tạo unique index mới: name unique per teacher (cho students)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_name_teacher_unique
  ON profiles (lower(trim(both from name)), teacher_id)
  WHERE teacher_id IS NOT NULL;

-- Giữ unique cho teacher names (teacher không có teacher_id)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_teacher_name_unique
  ON profiles (lower(trim(both from name)))
  WHERE role = 'teacher';

-- ============================================================
-- STEP 4: Sửa unique constraint cho attendance_students
-- Name phải unique trong phạm vi 1 giáo viên
-- ============================================================

ALTER TABLE attendance_students
  DROP CONSTRAINT IF EXISTS attendance_students_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_students_name_teacher_unique
  ON attendance_students (lower(trim(both from name)), teacher_id)
  WHERE teacher_id IS NOT NULL;

-- ============================================================
-- STEP 5: Cập nhật views
-- ============================================================

DROP VIEW IF EXISTS public.student_recording_stats_view CASCADE;
CREATE VIEW public.student_recording_stats_view AS
SELECT
  p.id AS student_id,
  p.name,
  p.grade,
  p.teacher_id,
  count(r.id) AS total_recordings,
  max(r.created_at) AS last_submission_at
FROM profiles p
LEFT JOIN recordings r
  ON lower(trim(both from r.student_name)) = lower(trim(both from p.name))
  AND (r.teacher_id = p.teacher_id OR (r.teacher_id IS NULL AND p.teacher_id IS NULL))
WHERE p.role = 'student'
GROUP BY p.id, p.name, p.grade, p.teacher_id;

DROP VIEW IF EXISTS public.daily_attendance_overview_view CASCADE;
CREATE VIEW public.daily_attendance_overview_view AS
SELECT
  a.teacher_id,
  date(ar.checkin_time AT TIME ZONE 'UTC') AS checkin_date,
  count(DISTINCT ar.student_id) AS total_checked_in
FROM attendance_records ar
JOIN attendance_students a ON ar.student_id = a.id
GROUP BY a.teacher_id, date(ar.checkin_time AT TIME ZONE 'UTC')
ORDER BY checkin_date DESC;

-- ============================================================
-- STEP 7: Copy dữ liệu name sang username cho học sinh
-- ============================================================

-- Hàm chuyển đổi tên tiếng Việt sang slug username (viết liền, không dấu)
CREATE OR REPLACE FUNCTION generate_slug(text) RETURNS text AS $$
DECLARE
  v_str text := lower(trim(both from $1));
BEGIN
  v_str := regexp_replace(v_str, '[áàảãạăắằẳẵặâấầẩẫậ]', 'a', 'g');
  v_str := regexp_replace(v_str, '[éèẻẽẹêếềểễệ]', 'e', 'g');
  v_str := regexp_replace(v_str, '[íìỉĩị]', 'i', 'g');
  v_str := regexp_replace(v_str, '[óòỏõọôốồổỗộơớờởỡợ]', 'o', 'g');
  v_str := regexp_replace(v_str, '[úùủũụưứừửữự]', 'u', 'g');
  v_str := regexp_replace(v_str, '[ýỳỷỹỵ]', 'y', 'g');
  v_str := regexp_replace(v_str, '[đ]', 'd', 'g');
  v_str := regexp_replace(v_str, '[^a-z0-9]', '', 'g');
  RETURN v_str;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Cập nhật username cho tất cả học sinh chưa có username:
UPDATE profiles
SET username = generate_slug(name)
WHERE role = 'student' AND (username IS NULL OR trim(username) = '');


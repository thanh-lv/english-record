-- ============================================================
-- Migration 003: Hỗ trợ điểm danh nửa buổi
-- ============================================================
-- Mỗi bản ghi điểm danh có thêm "session_value": 1 = cả buổi, 0.5 = nửa buổi.
-- Các bản ghi cũ tự động nhận giá trị 1 nên số buổi / học phí không thay đổi.

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS session_value numeric(2,1) NOT NULL DEFAULT 1;

ALTER TABLE attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_session_value_check;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_session_value_check
  CHECK (session_value IN (0.5, 1));

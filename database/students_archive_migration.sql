-- Add archived flag to students for archive support
-- Run this script on existing databases.

USE kuran_mektebi;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: index for fast filtering
CREATE INDEX IF NOT EXISTS idx_students_archived ON students(archived);

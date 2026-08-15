-- PROMPT 12: Yoklama Modulu migration
-- Replace lesson_id with class_room_id in attendance table.

USE kuran_mektebi;

-- 1. Add class_room_id column if not exists
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS class_room_id INT NULL AFTER student_id;

-- 2. Add foreign key for class_room_id
ALTER TABLE attendance
  ADD CONSTRAINT IF NOT EXISTS fk_attendance_class_room
  FOREIGN KEY (class_room_id) REFERENCES class_rooms(id) ON DELETE SET NULL;

-- 3. Drop foreign key on lesson_id (name may be auto-generated)
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance'
    AND COLUMN_NAME = 'lesson_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @drop_fk_sql = IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE attendance DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);

PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Drop lesson_id column
ALTER TABLE attendance DROP COLUMN IF EXISTS lesson_id;

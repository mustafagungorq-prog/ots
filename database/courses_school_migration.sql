-- Bind courses to schools.

USE kuran_mektebi;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS school_id INT NULL AFTER description;

-- Add FK only if it does not already exist.
SET @fk_name = 'fk_courses_school';
SET @sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'courses'
      AND CONSTRAINT_NAME = @fk_name
  ),
  'ALTER TABLE courses ADD CONSTRAINT fk_courses_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Assign existing courses to the first active school so they remain visible.
SET @default_school = (SELECT id FROM schools WHERE active = TRUE ORDER BY id LIMIT 1);
UPDATE courses SET school_id = @default_school WHERE school_id IS NULL;

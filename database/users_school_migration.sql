-- Add school_id to users so admins/teachers can be scoped to a single school.

USE kuran_mektebi;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS school_id INT NULL AFTER role;

-- Add FK only if it does not already exist.
SET @fk_name = 'fk_users_school';
SET @sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND CONSTRAINT_NAME = @fk_name
  ),
  'ALTER TABLE users ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

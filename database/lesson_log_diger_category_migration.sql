-- Add 'diger' option to lesson_logs.category enum
ALTER TABLE lesson_logs
  MODIFY COLUMN category ENUM('ilmihal','adab','tecvid','diger') NOT NULL;

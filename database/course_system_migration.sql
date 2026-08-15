-- PROMPT 13: Kurs Bazli Ders Plani migration
-- Eski lessons/teacher_lessons yapisi yerine courses/course_schedules yapisi olusturur.
-- Eski veriler (lessons, teacher_lessons, students.lessons, class_rooms.lesson_ids) kaybolmaz.

USE kuran_mektebi;

-- 1. Create new course-based tables
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    teacher_id INT,
    class_room_id INT,
    day_of_week VARCHAR(20),
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (class_room_id) REFERENCES class_rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS class_room_courses (
    class_room_id INT NOT NULL,
    course_id INT NOT NULL,
    PRIMARY KEY (class_room_id, course_id),
    FOREIGN KEY (class_room_id) REFERENCES class_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS student_courses (
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Prepare homework_templates for course_id
ALTER TABLE homework_templates
  ADD COLUMN IF NOT EXISTS course_id INT NULL AFTER details;

-- Drop the old FK on homework_templates.lesson_id if exists
SET @fk_ht = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'homework_templates'
    AND COLUMN_NAME = 'lesson_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);
SET @drop_fk_ht = IF(@fk_ht IS NOT NULL, CONCAT('ALTER TABLE homework_templates DROP FOREIGN KEY ', @fk_ht), 'SELECT 1');
PREPARE stmt FROM @drop_fk_ht;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE homework_templates
  ADD CONSTRAINT IF NOT EXISTS fk_homework_templates_course
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- 3. Migrate lessons -> courses (preserve IDs for backward mapping)
INSERT INTO courses (id, name, description, active)
SELECT id, name, '', active
FROM lessons
ON DUPLICATE KEY UPDATE name = VALUES(name), active = VALUES(active);

-- 4. Migrate lesson schedules -> course_schedules
INSERT INTO course_schedules (course_id, day_of_week, start_time, end_time, active)
SELECT id, day_of_week, start_time, end_time, active
FROM lessons
WHERE day_of_week IS NOT NULL OR start_time IS NOT NULL OR end_time IS NOT NULL;

-- 5. Migrate teacher_lessons -> course_schedules
INSERT INTO course_schedules (course_id, teacher_id, active)
SELECT tl.lesson_id, tl.teacher_id, TRUE
FROM teacher_lessons tl
LEFT JOIN course_schedules cs ON cs.course_id = tl.lesson_id AND cs.teacher_id = tl.teacher_id
WHERE cs.id IS NULL;

-- 6. Migrate class_rooms.lesson_ids JSON -> class_room_courses
INSERT INTO class_room_courses (class_room_id, course_id)
SELECT cr.id, jt.lesson_id
FROM class_rooms cr,
     JSON_TABLE(cr.lesson_ids, '$[*]' COLUMNS (lesson_id INT PATH '$')) AS jt
ON DUPLICATE KEY UPDATE class_room_id = class_room_courses.class_room_id;

-- 7. Migrate students.lessons JSON -> student_courses
INSERT INTO student_courses (student_id, course_id)
SELECT s.id, jt.lesson_id
FROM students s,
     JSON_TABLE(s.lessons, '$[*]' COLUMNS (lesson_id INT PATH '$')) AS jt
ON DUPLICATE KEY UPDATE student_id = student_courses.student_id;

-- 8. Migrate homework_templates.lesson_id -> course_id
UPDATE homework_templates ht
JOIN courses c ON c.id = ht.lesson_id
SET ht.course_id = c.id
WHERE ht.lesson_id IS NOT NULL;

-- 9. Drop old lesson columns/tables
ALTER TABLE homework_templates DROP COLUMN IF EXISTS lesson_id;
ALTER TABLE students DROP COLUMN IF EXISTS lessons;
ALTER TABLE class_rooms DROP COLUMN IF EXISTS lesson_ids;
DROP TABLE IF EXISTS teacher_lessons;
DROP TABLE IF EXISTS lessons;

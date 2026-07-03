-- Memorization module default seed data
-- Run after schema/migration.

-- If needed, select DB in phpMyAdmin first, then run this script.
-- USE kuran_mektebi;

-- Select one teacher/admin user for checked_by
SET @checker_user_id = 0;
SELECT id INTO @checker_user_id
FROM users
WHERE role IN ('superadmin', 'admin', 'authorized_teacher', 'teacher')
ORDER BY id
LIMIT 1;

-- Default memorization texts
INSERT INTO memorization_texts (title, content, active, created_by)
SELECT x.title, x.content, 1, @checker_user_id
FROM (
  SELECT 'Fatiha Suresi' AS title, 'Bismillahirrahmanirrahim. Elhamdulillahi rabbil alemin...' AS content
  UNION ALL
  SELECT 'Ayetel Kursi', 'Allahu la ilahe illa huvel hayyul kayyum...'
  UNION ALL
  SELECT 'Amenerresulu', 'Amenerresulu bima unzile ileyhi min rabbihi...'
  UNION ALL
  SELECT 'Yasin Suresi Ilk 10 Ayet', 'Yasin. Vel kuranil hakim...'
  UNION ALL
  SELECT 'Tebareke Suresi Ilk 5 Ayet', 'Tebarekellezi bi yedihil mulk...'
) x
WHERE NOT EXISTS (
  SELECT 1
  FROM memorization_texts mt
  WHERE mt.title = x.title
);

SET @text_id_1 = 0;
SELECT id INTO @text_id_1
FROM memorization_texts
WHERE title = 'Fatiha Suresi'
ORDER BY id DESC
LIMIT 1;

SET @text_id_2 = 0;
SELECT id INTO @text_id_2
FROM memorization_texts
WHERE title = 'Ayetel Kursi'
ORDER BY id DESC
LIMIT 1;

SET @text_id_3 = 0;
SELECT id INTO @text_id_3
FROM memorization_texts
WHERE title = 'Amenerresulu'
ORDER BY id DESC
LIMIT 1;

-- For first 3 students: first text -> completed
INSERT INTO memorization_tracking (student_id, text_id, status, teacher_note, checked_by, checked_at)
SELECT s.id, @text_id_1, 'completed', 'Ezber tam ve akici.', @checker_user_id, NOW()
FROM (
  SELECT id
  FROM students
  ORDER BY id
  LIMIT 3
) s
WHERE @text_id_1 IS NOT NULL
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  teacher_note = VALUES(teacher_note),
  checked_by = VALUES(checked_by),
  checked_at = VALUES(checked_at);

-- For first 3 students: second text -> repeat
INSERT INTO memorization_tracking (student_id, text_id, status, teacher_note, checked_by, checked_at)
SELECT s.id, @text_id_2, 'repeat', 'Talim gerekli, tekrar istenecek.', @checker_user_id, NOW()
FROM (
  SELECT id
  FROM students
  ORDER BY id
  LIMIT 3
) s
WHERE @text_id_2 IS NOT NULL
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  teacher_note = VALUES(teacher_note),
  checked_by = VALUES(checked_by),
  checked_at = VALUES(checked_at);

-- For first 3 students: third text -> not_completed
INSERT INTO memorization_tracking (student_id, text_id, status, teacher_note, checked_by, checked_at)
SELECT s.id, @text_id_3, 'not_completed', 'Henuz calismaya baslanmadi.', @checker_user_id, NOW()
FROM (
  SELECT id
  FROM students
  ORDER BY id
  LIMIT 3
) s
WHERE @text_id_3 IS NOT NULL
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  teacher_note = VALUES(teacher_note),
  checked_by = VALUES(checked_by),
  checked_at = VALUES(checked_at);

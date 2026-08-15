-- Migrate memorization_tracking status values to the new set used by Ezber Takibi.
-- Old: completed | repeat | not_completed
-- New: passed | failed | repeat_tecvid | repeat_harf | not_appointment | home_work

-- 1. Expand enum to hold both old and new values temporarily.
ALTER TABLE memorization_tracking
  MODIFY COLUMN status ENUM('completed','repeat','not_completed','passed','failed','repeat_tecvid','repeat_harf','not_appointment','home_work')
  NOT NULL DEFAULT 'not_completed';

-- 2. Map old statuses to new ones.
UPDATE memorization_tracking SET status = 'passed'        WHERE status = 'completed';
UPDATE memorization_tracking SET status = 'failed'        WHERE status = 'not_completed';
UPDATE memorization_tracking SET status = 'repeat_tecvid' WHERE status = 'repeat';

-- 3. Reduce enum to the final new values with the new default.
ALTER TABLE memorization_tracking
  MODIFY COLUMN status ENUM('passed','failed','repeat_tecvid','repeat_harf','not_appointment','home_work')
  NOT NULL DEFAULT 'not_appointment';

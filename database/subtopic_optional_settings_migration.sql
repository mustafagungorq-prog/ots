-- PROMPT 1: Alt Konu Zorunluluğunu Kaldır
-- 1. lesson_logs.sub_topic artık nullable
ALTER TABLE lesson_logs MODIFY sub_topic VARCHAR(200) NULL;

-- 2. Sistem ayarları tablosu
CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Varsayılan: Alt Konu zorunlu değil
INSERT INTO system_settings (`key`, `value`) VALUES ('sub_topic_required', 'false')
ON DUPLICATE KEY UPDATE `value` = `value`;

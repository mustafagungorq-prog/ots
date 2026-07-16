-- PROMPT 9: Gelişmiş Ezber Sistemi migration
-- Run on existing databases to add dynamic scoring criteria support.

USE kuran_mektebi;

-- Add scores JSON column to memorization_tracking
ALTER TABLE memorization_tracking
  ADD COLUMN IF NOT EXISTS scores JSON NULL AFTER status;

-- Create dynamic memorization criteria table
CREATE TABLE IF NOT EXISTS memorization_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    max_score INT NOT NULL DEFAULT 100,
    weight INT NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default criteria for the scoring mode
INSERT IGNORE INTO memorization_criteria (code, label, max_score, weight, sort_order, active) VALUES
('tecvid', 'Tecvid', 100, 1, 1, TRUE),
('mahrec', 'Mahreç', 100, 1, 2, TRUE),
('akicilik', 'Akıcılık', 100, 1, 3, TRUE),
('ezber', 'Ezber', 100, 1, 4, TRUE),
('ses', 'Ses', 100, 1, 5, TRUE);

-- Default memorization mode setting
INSERT IGNORE INTO system_settings (`key`, `value`) VALUES ('memorization_mode', 'simple');

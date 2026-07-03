-- Memorization Tracking module migration
-- Run this script on existing databases.

USE kuran_mektebi;

CREATE TABLE IF NOT EXISTS memorization_texts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS memorization_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    text_id INT NOT NULL,
    status ENUM('completed','repeat','not_completed') NOT NULL DEFAULT 'not_completed',
    teacher_note TEXT,
    checked_by INT,
    checked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_student_text (student_id, text_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (text_id) REFERENCES memorization_texts(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

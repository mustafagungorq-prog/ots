-- Veli aydınlatma ve KVKK onay kayıtları
CREATE TABLE IF NOT EXISTS parent_consents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    illumination_consent BOOLEAN NOT NULL DEFAULT FALSE,
    kvkk_consent BOOLEAN NOT NULL DEFAULT FALSE,
    illumination_consented_at TIMESTAMP NULL,
    kvkk_consented_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

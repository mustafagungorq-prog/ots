-- Grid column permissions storage.
-- Run this on existing databases to enable DB-backed grid column visibility rules.

CREATE TABLE IF NOT EXISTS grid_column_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grid_id VARCHAR(50) NOT NULL,
    column_key VARCHAR(50) NOT NULL,
    column_label VARCHAR(100) NOT NULL,
    allowed_roles JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_grid_column (grid_id, column_key),
    INDEX idx_grid_id (grid_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Öğrenciler
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('students', 'firstName', 'Ad Soyad', '["superadmin","admin","authorized_teacher","teacher","parent"]'),
('students', 'tcKimlik', 'TC Kimlik', '["superadmin"]'),
('students', 'grade', 'Sinif', '["superadmin","admin","authorized_teacher","teacher","parent"]'),
('students', 'school', 'Medrese', '["superadmin","admin","authorized_teacher"]'),
('students', 'group', 'Grup', '["superadmin","admin","authorized_teacher","teacher"]'),
('students', 'age', 'Yas', '["superadmin","admin","authorized_teacher","teacher","parent"]'),
('students', 'city', 'Memleket', '["superadmin","admin","authorized_teacher","teacher","parent"]'),
('students', 'lessons', 'Dersler', '["superadmin","admin","authorized_teacher","teacher"]'),
('students', 'actions', 'Islem', '["superadmin","admin","authorized_teacher"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

-- Okullar / Medreseler
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('schools', 'address', 'Adres', '["superadmin","admin"]'),
('schools', 'phone', 'Telefon', '["superadmin","admin"]'),
('schools', 'principal', 'Yetkili', '["superadmin","admin"]'),
('schools', 'studentCount', 'Ogrenci Sayisi', '["superadmin","admin"]'),
('schools', 'actions', 'Islem', '["superadmin","admin"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

-- Dersler
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('lessons', 'name', 'Ders Adi', '["superadmin","admin","authorized_teacher"]'),
('lessons', 'classRoom', 'Sinif', '["superadmin","admin","authorized_teacher"]'),
('lessons', 'dayOfWeek', 'Gun', '["superadmin","admin","authorized_teacher"]'),
('lessons', 'time', 'Saat', '["superadmin","admin","authorized_teacher"]'),
('lessons', 'studentCount', 'Ogrenci Sayisi', '["superadmin","admin","authorized_teacher"]'),
('lessons', 'actions', 'Islem', '["superadmin","admin"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

-- Ders Öğrencileri
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('lessonStudents', 'firstName', 'Ad Soyad', '["superadmin","admin","authorized_teacher","teacher"]'),
('lessonStudents', 'grade', 'Sinif', '["superadmin","admin","authorized_teacher","teacher"]'),
('lessonStudents', 'school', 'Medrese', '["superadmin","admin","authorized_teacher","teacher"]'),
('lessonStudents', 'parentName', 'Veli', '["superadmin","admin","authorized_teacher","teacher"]'),
('lessonStudents', 'parentPhone', 'Veli Telefon', '["superadmin","admin","authorized_teacher","teacher"]'),
('lessonStudents', 'phone', 'Ogrenci Telefon', '["superadmin","admin","authorized_teacher","teacher"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

-- Yoklama
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('attendance', 'date', 'Tarih', '["superadmin","admin","authorized_teacher","teacher"]'),
('attendance', 'student', 'Ogrenci', '["superadmin","admin","authorized_teacher","teacher"]'),
('attendance', 'status', 'Durum', '["superadmin","admin","authorized_teacher","teacher"]'),
('attendance', 'notes', 'Not', '["superadmin","admin","authorized_teacher","teacher"]'),
('attendance', 'actions', 'Islem', '["superadmin","admin","authorized_teacher","teacher"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

-- Gelişim Takibi
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('progress', 'date', 'Tarih', '["superadmin","admin","authorized_teacher","teacher"]'),
('progress', 'student', 'Ogrenci', '["superadmin","admin","authorized_teacher","teacher"]'),
('progress', 'kuran', 'Kuran', '["superadmin","admin","authorized_teacher","teacher"]'),
('progress', 'risale', 'Risale', '["superadmin","admin","authorized_teacher","teacher"]'),
('progress', 'elifba', 'Elifba', '["superadmin","admin","authorized_teacher","teacher"]'),
('progress', 'notes', 'Not', '["superadmin","admin","authorized_teacher","teacher"]'),
('progress', 'actions', 'Islem', '["superadmin","admin","authorized_teacher","teacher"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

-- Yorumlar
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('comments', 'student', 'Ogrenci', '["superadmin","admin","authorized_teacher"]'),
('comments', 'type', 'Tur', '["superadmin","admin","authorized_teacher"]'),
('comments', 'author', 'Yazar', '["superadmin","admin","authorized_teacher"]'),
('comments', 'date', 'Tarih', '["superadmin","admin","authorized_teacher"]'),
('comments', 'content', 'Icerik', '["superadmin","admin","authorized_teacher"]'),
('comments', 'actions', 'Islem', '["superadmin","admin","authorized_teacher"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

-- Raporlar
INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES
('reports', 'date', 'Tarih', '["superadmin","admin","authorized_teacher"]'),
('reports', 'student', 'Ogrenci', '["superadmin","admin","authorized_teacher"]'),
('reports', 'type', 'Tur', '["superadmin","admin","authorized_teacher"]'),
('reports', 'method', 'Yontem', '["superadmin","admin","authorized_teacher"]'),
('reports', 'status', 'Durum', '["superadmin","admin","authorized_teacher"]'),
('reports', 'actions', 'Islem', '["superadmin","admin","authorized_teacher"]')
ON DUPLICATE KEY UPDATE column_label=VALUES(column_label), allowed_roles=VALUES(allowed_roles);

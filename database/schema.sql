-- 365 Kuran Kuran Mektebi - Ogretmen Takip Sistemi
-- MySQL Database Schema

CREATE DATABASE IF NOT EXISTS kuran_mektebi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kuran_mektebi;

-- Users (Kullanicilar)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    role ENUM('superadmin','admin','authorized_teacher','teacher','parent') NOT NULL DEFAULT 'teacher',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Schools (Medreseler)
CREATE TABLE IF NOT EXISTS schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    principal_name VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Courses (Kurslar)
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Course Schedules (Kurs Ders Planlari)
-- A course can have multiple schedules (different days / teachers / classrooms).
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

-- Class Rooms (Gruplar)
CREATE TABLE IF NOT EXISTS class_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    school_id INT NOT NULL,
    description TEXT,
    teacher_ids JSON,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Class Room Courses (Gruplar arasi Kurs iliskisi)
CREATE TABLE IF NOT EXISTS class_room_courses (
    class_room_id INT NOT NULL,
    course_id INT NOT NULL,
    PRIMARY KEY (class_room_id, course_id),
    FOREIGN KEY (class_room_id) REFERENCES class_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Students (Ogrenciler)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tc_kimlik VARCHAR(11),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    age INT,
    birth_year INT,
    city VARCHAR(50),
    school_id INT,
    school_name VARCHAR(100),
    grade VARCHAR(50),
    phone VARCHAR(20),
    parent_name VARCHAR(100),
    parent_phone VARCHAR(20),
    email VARCHAR(100),
    group_id INT,
    assigned_surveys JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
    FOREIGN KEY (group_id) REFERENCES class_rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Parent-Student Links (Veli-Ogrenci Iliskisi)
CREATE TABLE IF NOT EXISTS parent_student_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_user_id INT NOT NULL,
    student_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_parent_student (parent_user_id, student_id),
    FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Attendance (Yoklama)
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_room_id INT,
    date DATE NOT NULL,
    status ENUM('present','absent','excused','late') NOT NULL DEFAULT 'present',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_room_id) REFERENCES class_rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Progress (Gelisim Takibi)
CREATE TABLE IF NOT EXISTS progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    kuran_current_page INT DEFAULT 0,
    kuran_target_page INT DEFAULT 0,
    kuran_pages INT DEFAULT 0,
    risale_current_page INT DEFAULT 0,
    risale_target_page INT DEFAULT 0,
    risale_pages INT DEFAULT 0,
    elifba_current_page INT DEFAULT 0,
    elifba_target_page INT DEFAULT 0,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comments (Yorumlar)
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reports (Raporlar)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT,
    title VARCHAR(200) NOT NULL,
    recipients JSON,
    sent_via ENUM('email','sms','both') DEFAULT 'email',
    status ENUM('draft','sent') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student Reports (Ogrenci Raporlari)
CREATE TABLE IF NOT EXISTS student_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    report_type VARCHAR(50),
    report_period VARCHAR(100),
    subject VARCHAR(200),
    strengths TEXT,
    improvements TEXT,
    recommendations TEXT,
    attendance_summary TEXT,
    lesson_data TEXT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Surveys (Anketler)
CREATE TABLE IF NOT EXISTS surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Survey Questions (Anket Sorulari)
CREATE TABLE IF NOT EXISTS survey_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    question TEXT NOT NULL,
    question_type ENUM('text','single_choice','multiple_choice','rating') DEFAULT 'text',
    options JSON,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Survey Answers (Anket Cevaplari)
CREATE TABLE IF NOT EXISTS survey_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    question_id INT NOT NULL,
    student_id INT NOT NULL,
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Homework Templates (Odev Sablonlari)
CREATE TABLE IF NOT EXISTS homework_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    details TEXT,
    type ENUM('ezber','okuma-kuran','okuma-risale','diger') DEFAULT 'diger',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    course_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student Courses (Ogrenci Kurs Iliskisi)
CREATE TABLE IF NOT EXISTS student_courses (
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Homework Assignments (Odev Atamalari)
CREATE TABLE IF NOT EXISTS homework_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    template_id INT,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    details TEXT,
    due_date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES homework_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Memorization Texts (Ezber Metinleri)
CREATE TABLE IF NOT EXISTS memorization_texts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Memorization Tracking (Ezber Takip)
CREATE TABLE IF NOT EXISTS memorization_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    text_id INT NOT NULL,
    status ENUM('passed','failed','repeat_tecvid','repeat_harf') NOT NULL DEFAULT 'failed',
    scores JSON,
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

-- Curriculum Topics (Mufredat Konulari)
CREATE TABLE IF NOT EXISTS curriculum_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('ilmihal','adab','tecvid','diger') NOT NULL,
    title VARCHAR(200) NOT NULL,
    sub_topics JSON,
    active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lesson Logs (Ders Isleme Kayitlari)
CREATE TABLE IF NOT EXISTS lesson_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    category ENUM('ilmihal','adab','tecvid','diger') NOT NULL,
    topic VARCHAR(200) NOT NULL,
    sub_topic VARCHAR(200) NULL,
    notes TEXT,
    author VARCHAR(100),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- Grid Column Permissions
CREATE TABLE IF NOT EXISTS grid_column_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grid_id VARCHAR(50) NOT NULL,
    column_key VARCHAR(50) NOT NULL,
    column_label VARCHAR(100),
    allowed_roles JSON,
    UNIQUE KEY unique_grid_col (grid_id, column_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Permission Matrix
CREATE TABLE IF NOT EXISTS permission_matrix (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_id VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    superadmin BOOLEAN DEFAULT FALSE,
    admin BOOLEAN DEFAULT FALSE,
    authorized_teacher BOOLEAN DEFAULT FALSE,
    teacher BOOLEAN DEFAULT FALSE,
    parent BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO system_settings (`key`, `value`) VALUES ('sub_topic_required', 'false');

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, password, full_name, email, role) VALUES
('admin', '$2y$10$E6Zfo8N051qAi3/MZo79ee.NjNieRw44rhkA.NCqj3Yq3VMZyS5Yq', 'Sistem Yoneticisi', 'admin@kuranmektebi.com', 'superadmin');

-- Insert default curriculum topics
INSERT IGNORE INTO curriculum_topics (id, category, title, sub_topics, active) VALUES
(1, 'ilmihal', 'Iman Esaslari', '["Allah''a iman", "Meleklere iman", "Kitaplara iman", "Peygamberlere iman", "Ahirete iman", "Kaza ve kadere iman"]', TRUE),
(2, 'ilmihal', 'Ibabet', '["Namaz", "Oruc", "Hac", "Zekat", "Kurban"]', TRUE),
(3, 'ilmihal', 'Ahlak ve Davranis', '["Dogru sozluluk", "Guvenilirlik", "Sabir", "Sukur", "Tevekkul", "Merhamet"]', TRUE),
(4, 'ilmihal', 'Gunluk Yasam', '["Tesettur", "Helal-haram", "Dua ve zikir", "Cuma gunu", "Bayramlar"]', TRUE),
(5, 'adab', 'Aile Adabi', '["Anneye saygi", "Babaya saygi", "Kardeslik hukuku", "Buyuklere saygi", "Misafirperverlik"]', TRUE),
(6, 'adab', 'Cami Adabi', '["Cami giris adabı", "Namaz adabı", "Kuran okuma adabı", "Cemaatle namaz", "Camide sessizlik"]', TRUE),
(7, 'adab', 'Sozlu ve Yazili Adab', '["Selamlasma", "Konusma adabı", "Dinleme adabı", "Yazisma adabı", "Telefon adabı"]', TRUE),
(8, 'adab', 'Yemek ve Giyim Adabi', '["Yemek oncesi dua", "Sofra adabı", "Elbis secimi", "Temizlik", "Yemek sonrasi sukur"]', TRUE),
(9, 'tecvid', 'Tenvin ve Izhar', '["Izhar-i halqi", "Izhar-i sifawi", "Izhar-i mutlak"]', TRUE),
(10, 'tecvid', 'Sifatlar', '["Hams", "Cahr", "Rahve", "Tefessum", "Takti", "Istifal"]', TRUE),
(11, 'tecvid', 'Makrec-i huruf', '["Havvaiye", "Cehriye", "Lisaviye", "Sefatiyye"]', TRUE),
(12, 'tecvid', 'Meddlar', '["Tabii med", "Mutasil med", "Munfasil med", "Lazim med", "Arz med"]', TRUE),
(13, 'tecvid', 'Teshil ve Ikhfa', '["Ikhfa-i hakiki", "Ikhfa-i sifawi", "Teshil"]', TRUE),
(14, 'tecvid', 'Kiraat Ilmi Giris', '["Kiraat cesitleri", "Sebeb-i kurii", "Kiraat kurallari"]', TRUE);

-- Insert default class rooms (groups)
INSERT IGNORE INTO class_rooms (id, name, grade, school_id, description, teacher_ids, active, created_at) VALUES
(1, 'Kudus Grubu', '6. Sinif', 1, 'Kudus Grubu - Imam Hatip 6. sinif', '[]', TRUE, '2025-09-01'),
(2, 'Medine Grubu', '7. Sinif', 1, 'Medine Grubu - Imam Hatip 7. sinif', '[]', TRUE, '2025-09-01'),
(3, 'Mekke Grubu', '5. Sinif', 2, 'Mekke Grubu - Ankara IHL 5. sinif', '[]', TRUE, '2025-09-01'),
(4, 'Aksa Grubu', '8. Sinif', 1, 'Aksa Grubu - Imam Hatip 8. sinif', '[]', TRUE, '2025-09-01');

-- Insert default courses
INSERT IGNORE INTO courses (id, name, description, active) VALUES
(1, 'Kuran', 'Kuran dersi', TRUE),
(2, 'Risale-i Nur', 'Risale-i Nur dersi', TRUE),
(3, 'Elif-ba', 'Elif-ba dersi', TRUE),
(4, 'Cuz', 'Cuz dersi', TRUE),
(5, 'Arapca', 'Arapca dersi', TRUE);

-- Insert default course schedules (ders gunu ve saati kursa ait)
INSERT IGNORE INTO course_schedules (id, course_id, day_of_week, start_time, end_time, active) VALUES
(1, 1, 'Pazartesi', '09:00', '10:30', TRUE),
(2, 2, 'Sali', '10:45', '12:00', TRUE),
(3, 3, 'Carsamba', '13:00', '14:30', TRUE),
(4, 4, 'Persembe', '09:00', '10:30', TRUE),
(5, 5, 'Cuma', '10:45', '12:00', TRUE);

-- Insert default class room courses
INSERT IGNORE INTO class_room_courses (class_room_id, course_id) VALUES
(1, 1), (1, 2), (1, 5),
(2, 2), (2, 3), (2, 4),
(3, 1), (3, 3),
(4, 1), (4, 2), (4, 4), (4, 5);

-- Insert default schools (medreseler)
INSERT IGNORE INTO schools (id, name, address, phone, principal_name, active, created_at) VALUES
(1, 'Istanbul Imam Hatip Lisesi', 'Istanbul, Fatih', '0212-555-0001', 'Ahmet Yilmaz', TRUE, '2025-09-01'),
(2, 'Ankara IHL', 'Ankara, Kecioren', '0312-555-0002', 'Mehmet Kaya', TRUE, '2025-09-01');

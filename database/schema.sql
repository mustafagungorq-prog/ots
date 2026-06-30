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
    email VARCHAR(100),
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

-- Lessons (Dersler)
CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    day_of_week VARCHAR(20),
    teacher_id INT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Class Rooms (Gruplar)
CREATE TABLE IF NOT EXISTS class_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    school_id INT NOT NULL,
    description TEXT,
    lesson_ids JSON,
    teacher_ids JSON,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
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
    lessons JSON,
    group_id INT,
    assigned_surveys JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
    FOREIGN KEY (group_id) REFERENCES class_rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Attendance (Yoklama)
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    lesson_id INT,
    date DATE NOT NULL,
    status ENUM('present','absent','excused','late') NOT NULL DEFAULT 'present',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Progress (Gelisim Takibi)
CREATE TABLE IF NOT EXISTS progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    kuran_current_page INT DEFAULT 0,
    kuran_target_page INT DEFAULT 0,
    risale_current_page INT DEFAULT 0,
    risale_target_page INT DEFAULT 0,
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
    lesson_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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

-- Curriculum Topics (Mufredat Konulari)
CREATE TABLE IF NOT EXISTS curriculum_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('ilmihal','adab','tecvid') NOT NULL,
    title VARCHAR(200) NOT NULL,
    sub_topics JSON,
    active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lesson Logs (Ders Isleme Kayitlari)
CREATE TABLE IF NOT EXISTS lesson_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    category ENUM('ilmihal','adab','tecvid') NOT NULL,
    topic VARCHAR(200) NOT NULL,
    sub_topic VARCHAR(200) NOT NULL,
    notes TEXT,
    author VARCHAR(100),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Teacher Lessons (Ogretmen-Ders Iliskisi)
CREATE TABLE IF NOT EXISTS teacher_lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    lesson_id INT NOT NULL,
    UNIQUE KEY unique_teacher_lesson (teacher_id, lesson_id),
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
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
INSERT IGNORE INTO class_rooms (id, name, grade, school_id, description, lesson_ids, teacher_ids, active, created_at) VALUES
(1, 'Kudus Grubu', '6. Sinif', 1, 'Kudus Grubu - Imam Hatip 6. sinif', '[1, 2, 5]', '[]', TRUE, '2025-09-01'),
(2, 'Medine Grubu', '7. Sinif', 1, 'Medine Grubu - Imam Hatip 7. sinif', '[2, 3, 4]', '[]', TRUE, '2025-09-01'),
(3, 'Mekke Grubu', '5. Sinif', 2, 'Mekke Grubu - Ankara IHL 5. sinif', '[1, 3]', '[]', TRUE, '2025-09-01'),
(4, 'Aksa Grubu', '8. Sinif', 1, 'Aksa Grubu - Imam Hatip 8. sinif', '[1, 2, 4, 5]', '[]', TRUE, '2025-09-01');

-- Insert default lessons
INSERT IGNORE INTO lessons (id, name, start_time, end_time, day_of_week, active, created_at) VALUES
(1, 'Kuran', '09:00', '10:30', 'Pazartesi', TRUE, '2025-09-01'),
(2, 'Risale-i Nur', '10:45', '12:00', 'Sali', TRUE, '2025-09-01'),
(3, 'Elif-ba', '13:00', '14:30', 'Carsamba', TRUE, '2025-09-01'),
(4, 'Cuz', '09:00', '10:30', 'Persembe', TRUE, '2025-09-01'),
(5, 'Arapca', '10:45', '12:00', 'Cuma', TRUE, '2025-09-01');

-- Insert default schools (medreseler)
INSERT IGNORE INTO schools (id, name, address, phone, principal_name, active, created_at) VALUES
(1, 'Istanbul Imam Hatip Lisesi', 'Istanbul, Fatih', '0212-555-0001', 'Ahmet Yilmaz', TRUE, '2025-09-01'),
(2, 'Ankara IHL', 'Ankara, Kecioren', '0312-555-0002', 'Mehmet Kaya', TRUE, '2025-09-01');

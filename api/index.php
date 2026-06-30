<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = '';
$apiPos = strpos($uri, '/api/');
if ($apiPos !== false) {
    // Support both /api/... and /<project>/api/... URL shapes.
    $path = substr($uri, $apiPos + strlen('/api/'));
} else {
    $path = trim($uri, '/');
}

// When requests go through /api/index.php/... keep only the route part.
$path = preg_replace('#^index\.php/?#', '', $path);
$path = trim($path, '/');
$parts = explode('/', $path);
$resource = $parts[0] ?? '';
$id = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;
$body = json_decode(file_get_contents('php://input'), true) ?: [];

// ===== AUTH =====
if ($resource === 'auth') {
    $action = $parts[1] ?? '';

    if ($action === 'login' && $method === 'POST') {
        $username = $body['username'] ?? '';
        $password = $body['password'] ?? '';
        $stmt = getDb()->prepare("SELECT * FROM users WHERE username = ? AND active = TRUE");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if (!$user) error('Invalid credentials', 401);
        // Check bcrypt or plain password (for demo)
        $valid = password_verify($password, $user['password']);
        if (!$valid && $user['password'] === $password) $valid = true;
        if (!$valid) error('Invalid credentials', 401);
        $token = JWT::encode(['sub' => $user['id'], 'username' => $user['username'], 'role' => $user['role']]);
        json(['token' => $token, 'user' => [
            'id' => $user['id'], 'username' => $user['username'],
            'fullName' => $user['full_name'], 'email' => $user['email'],
            'phone' => $user['phone'], 'role' => $user['role']
        ]]);
    }

    if ($action === 'me' && $method === 'GET') {
        $user = getAuthUser();
        json(['user' => $user]);
    }

    if ($action === 'logout' && $method === 'POST') {
        json(['message' => 'Logged out']);
    }
}

// ===== USERS =====
if ($resource === 'users') {
    $user = getAuthUser();

    if ($method === 'GET' && !$id) {
        if (in_array($user['role'], ['superadmin', 'admin'])) {
            $stmt = getDb()->query("SELECT id, username, full_name, email, phone, role, active, created_at FROM users ORDER BY id");
            json($stmt->fetchAll());
        }

        // Non-admin users can only see their own record.
        $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, active, created_at FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        json($stmt->fetchAll());
    }

    if ($method === 'GET' && $id) {
        if (!in_array($user['role'], ['superadmin', 'admin']) && (int)$user['id'] !== (int)$id) {
            error('Forbidden: only own user record is accessible', 403);
        }
        $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, active, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        json($stmt->fetch() ?: null);
    }

    requireRole(['superadmin', 'admin']);

    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO users (username, password, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)");
        $hash = password_hash($body['password'] ?? '123456', PASSWORD_BCRYPT);
        $stmt->execute([$body['username'], $hash, $body['fullName'], $body['email'] ?? null, $body['phone'] ?? null, $body['role'] ?? 'teacher']);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['full_name', 'email', 'phone', 'role', 'active'] as $f) {
            $key = $f === 'full_name' ? 'fullName' : ($f === 'active' ? 'active' : $f);
            if (isset($body[$key])) { $fields[] = "$f = ?"; $vals[] = $body[$key]; }
        }
        if (isset($body['password']) && $body['password']) {
            $fields[] = "password = ?"; $vals[] = password_hash($body['password'], PASSWORD_BCRYPT);
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        $stmt = getDb()->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== STUDENTS =====
if ($resource === 'students') {
    $user = getAuthUser();

    if ($method === 'GET' && !$id) {
        $sql = "SELECT s.*, sc.name as school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id ORDER BY s.id DESC";
        $stmt = getDb()->query($sql);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) { $row['lessons'] = json_decode($row['lessons'] ?? '[]', true) ?: []; $row['assigned_surveys'] = json_decode($row['assigned_surveys'] ?? '[]', true) ?: []; }
        json($rows);
    }
    if ($method === 'GET' && $id) {
        $stmt = getDb()->prepare("SELECT s.*, sc.name as school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id WHERE s.id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) { $row['lessons'] = json_decode($row['lessons'] ?? '[]', true) ?: []; $row['assigned_surveys'] = json_decode($row['assigned_surveys'] ?? '[]', true) ?: []; }
        json($row ?: null);
    }
    if ($method === 'POST' && !$id) {
        $firstName = trim((string)($body['firstName'] ?? ''));
        $lastName = trim((string)($body['lastName'] ?? ''));
        if ($firstName === '' || $lastName === '') error('First name and last name are required', 400);

        // Frontend may send temporary IDs (e.g. Date.now()) before related rows persist.
        // Resolve FK IDs defensively to avoid 500s from constraint/out-of-range errors.
        $schoolId = isset($body['schoolId']) && is_numeric($body['schoolId']) ? (int)$body['schoolId'] : null;
        if ($schoolId !== null) {
            $s = getDb()->prepare("SELECT id FROM schools WHERE id = ?");
            $s->execute([$schoolId]);
            if (!$s->fetch()) $schoolId = null;
        }

        $groupId = isset($body['groupId']) && is_numeric($body['groupId']) ? (int)$body['groupId'] : null;
        if ($groupId !== null) {
            $g = getDb()->prepare("SELECT id FROM class_rooms WHERE id = ?");
            $g->execute([$groupId]);
            if (!$g->fetch()) $groupId = null;
        }

        $stmt = getDb()->prepare("INSERT INTO students (tc_kimlik, first_name, last_name, birth_year, city, school_id, school_name, grade, phone, parent_name, parent_phone, email, lessons, group_id, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $lessons = json_encode($body['lessons'] ?? []);
        $birthYear = isset($body['birthYear']) && is_numeric($body['birthYear']) ? (int)$body['birthYear'] : null;
        $age = $birthYear ? (int)date('Y') - $birthYear : null;

        try {
            $stmt->execute([
                $body['tcKimlik'] ?? null, $firstName, $lastName,
                $birthYear, $body['city'] ?? '', $schoolId,
                $body['schoolName'] ?? null, $body['grade'] ?? '', $body['phone'] ?? '',
                $body['parentName'] ?? '', $body['parentPhone'] ?? '', $body['email'] ?? '',
                $lessons, $groupId, $age
            ]);
        } catch (PDOException $e) {
            error('Failed to create student: ' . $e->getMessage(), 400);
        }

        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        $map = [
            'tcKimlik' => 'tc_kimlik', 'firstName' => 'first_name', 'lastName' => 'last_name',
            'birthYear' => 'birth_year', 'city' => 'city', 'schoolId' => 'school_id',
            'schoolName' => 'school_name', 'grade' => 'grade', 'phone' => 'phone',
            'parentName' => 'parent_name', 'parentPhone' => 'parent_phone', 'email' => 'email',
            'groupId' => 'group_id'
        ];
        foreach ($map as $key => $col) {
            if (isset($body[$key])) { $fields[] = "$col = ?"; $vals[] = $body[$key]; }
        }
        if (isset($body['lessons'])) { $fields[] = "lessons = ?"; $vals[] = json_encode($body['lessons']); }
        if (isset($body['birthYear']) || isset($body['age'])) { $fields[] = "age = ?"; $vals[] = date('Y') - (int)($body['birthYear'] ?? 0); }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        $stmt = getDb()->prepare("UPDATE students SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM students WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== SCHOOLS =====
if ($resource === 'schools') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT * FROM schools ORDER BY id");
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO schools (name, address, phone, principal_name) VALUES (?, ?, ?, ?)");
        $stmt->execute([$body['name'], $body['address'] ?? '', $body['phone'] ?? '', $body['principalName'] ?? '']);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['name', 'address', 'phone', 'principal_name'] as $f) {
            $key = $f === 'principal_name' ? 'principalName' : $f;
            if (isset($body[$key])) { $fields[] = "$f = ?"; $vals[] = $body[$key]; }
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE schools SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM schools WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== LESSONS =====
if ($resource === 'lessons') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT l.*, u.full_name as teacher_name FROM lessons l LEFT JOIN users u ON l.teacher_id = u.id ORDER BY l.id");
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO lessons (name, start_time, end_time, day_of_week, teacher_id) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$body['name'], $body['startTime'] ?? '', $body['endTime'] ?? '', $body['dayOfWeek'] ?? '', $body['teacherId'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['name' => 'name', 'startTime' => 'start_time', 'endTime' => 'end_time', 'dayOfWeek' => 'day_of_week', 'teacherId' => 'teacher_id', 'active' => 'active'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE lessons SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM lessons WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== CLASS ROOMS (GROUPS) =====
if ($resource === 'class-rooms') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT cr.*, s.name as school_name FROM class_rooms cr LEFT JOIN schools s ON cr.school_id = s.id ORDER BY cr.id");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['lesson_ids'] = json_decode($row['lesson_ids'] ?? '[]', true) ?: [];
            $row['teacher_ids'] = json_decode($row['teacher_ids'] ?? '[]', true) ?: [];
        }
        json($rows);
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO class_rooms (name, grade, school_id, description, lesson_ids, teacher_ids, active) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$body['name'], $body['grade'], $body['schoolId'], $body['description'] ?? '', json_encode($body['lessonIds'] ?? []), json_encode($body['teacherIds'] ?? []), $body['active'] ?? true]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['name' => 'name', 'grade' => 'grade', 'schoolId' => 'school_id', 'description' => 'description', 'active' => 'active'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (isset($body['lessonIds'])) { $fields[] = "lesson_ids = ?"; $vals[] = json_encode($body['lessonIds']); }
        if (isset($body['teacherIds'])) { $fields[] = "teacher_ids = ?"; $vals[] = json_encode($body['teacherIds']); }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE class_rooms SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM class_rooms WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== ATTENDANCE =====
if ($resource === 'attendance') {
    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $date = $_GET['date'] ?? null;
        $sql = "SELECT a.*, s.first_name, s.last_name, l.name as lesson_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN lessons l ON a.lesson_id = l.id WHERE 1=1";
        $params = [];
        if ($studentId) { $sql .= " AND a.student_id = ?"; $params[] = $studentId; }
        if ($date) { $sql .= " AND a.date = ?"; $params[] = $date; }
        $sql .= " ORDER BY a.id DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO attendance (student_id, lesson_id, date, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([$body['studentId'], $body['lessonId'] ?? null, $body['date'], $body['status'] ?? 'present', $body['notes'] ?? '', $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['status' => 'status', 'notes' => 'notes'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE attendance SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM attendance WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== PROGRESS =====
if ($resource === 'progress') {
    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT p.*, s.first_name, s.last_name FROM progress p LEFT JOIN students s ON p.student_id = s.id WHERE 1=1";
        $params = [];
        if ($studentId) { $sql .= " AND p.student_id = ?"; $params[] = $studentId; }
        $sql .= " ORDER BY p.date DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO progress (student_id, date, kuran_current_page, kuran_target_page, risale_current_page, risale_target_page, elifba_current_page, elifba_target_page, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([
            $body['studentId'], $body['date'],
            $body['kuranCurrentPage'] ?? 0, $body['kuranTargetPage'] ?? 0,
            $body['risaleCurrentPage'] ?? 0, $body['risaleTargetPage'] ?? 0,
            $body['elifbaCurrentPage'] ?? 0, $body['elifbaTargetPage'] ?? 0,
            $body['notes'] ?? '', $user['id'] ?? null
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $map = ['kuranCurrentPage' => 'kuran_current_page', 'kuranTargetPage' => 'kuran_target_page', 'risaleCurrentPage' => 'risale_current_page', 'risaleTargetPage' => 'risale_target_page', 'elifbaCurrentPage' => 'elifba_current_page', 'elifbaTargetPage' => 'elifba_target_page', 'notes' => 'notes'];
        $fields = []; $vals = [];
        foreach ($map as $k => $c) { if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; } }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE progress SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM progress WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== COMMENTS =====
if ($resource === 'comments') {
    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT c.*, s.first_name, s.last_name FROM comments c LEFT JOIN students s ON c.student_id = s.id WHERE 1=1";
        $params = [];
        if ($studentId) { $sql .= " AND c.student_id = ?"; $params[] = $studentId; }
        $sql .= " ORDER BY c.created_at DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO comments (student_id, content, author, user_id) VALUES (?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([$body['studentId'], $body['content'], $user['full_name'] ?? $body['author'] ?? '', $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM comments WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== REPORTS =====
if ($resource === 'reports') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT * FROM reports ORDER BY created_at DESC, id DESC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['recipients'] = json_decode($row['recipients'] ?? '[]', true) ?: [];
        }
        json($rows);
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO reports (template_id, title, recipients, sent_via, status, created_by) VALUES (?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([
            $body['templateId'] ?? null,
            $body['title'] ?? '',
            json_encode($body['recipients'] ?? []),
            $body['sentVia'] ?? 'email',
            $body['status'] ?? 'draft',
            $user['id'] ?? null,
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['title' => 'title', 'templateId' => 'template_id', 'sentVia' => 'sent_via', 'status' => 'status'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (isset($body['recipients'])) { $fields[] = "recipients = ?"; $vals[] = json_encode($body['recipients']); }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE reports SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM reports WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== STUDENT REPORTS =====
if ($resource === 'student-reports') {
    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT sr.*, s.first_name, s.last_name FROM student_reports sr LEFT JOIN students s ON sr.student_id = s.id WHERE 1=1";
        $params = [];
        if ($studentId) { $sql .= " AND sr.student_id = ?"; $params[] = $studentId; }
        $sql .= " ORDER BY sr.created_at DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO student_reports (student_id, report_type, report_period, subject, strengths, improvements, recommendations, attendance_summary, lesson_data, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([
            $body['studentId'], $body['reportType'] ?? '', $body['reportPeriod'] ?? '',
            $body['subject'] ?? '', $body['strengths'] ?? '', $body['improvements'] ?? '',
            $body['recommendations'] ?? '', $body['attendanceSummary'] ?? '', $body['lessonData'] ?? '',
            $body['notes'] ?? '', $user['id'] ?? null
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM student_reports WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== SURVEYS =====
if ($resource === 'surveys') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT * FROM surveys ORDER BY id");
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO surveys (title, description, active) VALUES (?, ?, ?)");
        $stmt->execute([$body['title'], $body['description'] ?? '', $body['active'] ?? true]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM surveys WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== SURVEY QUESTIONS =====
if ($resource === 'survey-questions') {
    $surveyId = $_GET['surveyId'] ?? null;
    if ($method === 'GET') {
        $stmt = getDb()->prepare("SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order");
        $stmt->execute([$surveyId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) { $row['options'] = json_decode($row['options'] ?? '[]', true) ?: []; }
        json($rows);
    }
    if ($method === 'POST') {
        $stmt = getDb()->prepare("INSERT INTO survey_questions (survey_id, question, question_type, options, sort_order) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$body['surveyId'], $body['question'], $body['questionType'] ?? 'text', json_encode($body['options'] ?? []), $body['sortOrder'] ?? 0]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM survey_questions WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== SURVEY ANSWERS =====
if ($resource === 'survey-answers') {
    if ($method === 'GET') {
        $studentId = $_GET['studentId'] ?? null;
        $surveyId = $_GET['surveyId'] ?? null;
        $sql = "SELECT * FROM survey_answers WHERE 1=1"; $params = [];
        if ($studentId) { $sql .= " AND student_id = ?"; $params[] = $studentId; }
        if ($surveyId) { $sql .= " AND survey_id = ?"; $params[] = $surveyId; }
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO survey_answers (survey_id, question_id, student_id, answer) VALUES (?, ?, ?, ?)");
        $stmt->execute([$body['surveyId'], $body['questionId'], $body['studentId'], $body['answer']]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
}

// ===== HOMEWORK TEMPLATES =====
if ($resource === 'homework-templates') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT ht.*, l.name as lesson_name FROM homework_templates ht LEFT JOIN lessons l ON ht.lesson_id = l.id ORDER BY ht.id");
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO homework_templates (title, content, details, lesson_id, created_by) VALUES (?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([$body['title'], $body['content'] ?? '', $body['details'] ?? '', $body['lessonId'] ?? null, $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['title' => 'title', 'content' => 'content', 'details' => 'details', 'lessonId' => 'lesson_id'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE homework_templates SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM homework_templates WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== HOMEWORK ASSIGNMENTS =====
if ($resource === 'homework-assignments') {
    if ($method === 'GET') {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT ha.*, s.first_name, s.last_name FROM homework_assignments ha LEFT JOIN students s ON ha.student_id = s.id WHERE 1=1";
        $params = [];
        if ($studentId) { $sql .= " AND ha.student_id = ?"; $params[] = $studentId; }
        $sql .= " ORDER BY ha.created_at DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO homework_assignments (student_id, template_id, title, content, details, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([$body['studentId'], $body['templateId'] ?? null, $body['title'], $body['content'] ?? '', $body['details'] ?? '', $body['dueDate'] ?? null, $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        if (isset($body['completed'])) {
            getDb()->prepare("UPDATE homework_assignments SET completed = ?, completed_at = ? WHERE id = ?")
                ->execute([$body['completed'] ? 1 : 0, $body['completed'] ? date('Y-m-d H:i:s') : null, $id]);
        }
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM homework_assignments WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== CURRICULUM TOPICS =====
if ($resource === 'curriculum-topics') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT * FROM curriculum_topics ORDER BY id");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) { $row['sub_topics'] = json_decode($row['sub_topics'] ?? '[]', true) ?: []; }
        json($rows);
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO curriculum_topics (category, title, sub_topics) VALUES (?, ?, ?)");
        $stmt->execute([$body['category'], $body['title'], json_encode($body['subTopics'] ?? [])]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM curriculum_topics WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== LESSON LOGS =====
if ($resource === 'lesson-logs') {
    if ($method === 'GET') {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT ll.*, s.first_name, s.last_name FROM lesson_logs ll LEFT JOIN students s ON ll.student_id = s.id WHERE 1=1";
        $params = [];
        if ($studentId) { $sql .= " AND ll.student_id = ?"; $params[] = $studentId; }
        $sql .= " ORDER BY ll.date DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO lesson_logs (student_id, date, category, topic, sub_topic, notes, author, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([$body['studentId'], $body['date'], $body['category'], $body['topic'], $body['subTopic'], $body['notes'] ?? '', $body['author'] ?? $user['full_name'] ?? '', $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM lesson_logs WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== TEACHER LESSONS =====
if ($resource === 'teacher-lessons') {
    if ($method === 'GET') {
        $teacherId = $_GET['teacherId'] ?? null;
        $sql = "SELECT tl.*, l.name as lesson_name, u.full_name as teacher_name FROM teacher_lessons tl LEFT JOIN lessons l ON tl.lesson_id = l.id LEFT JOIN users u ON tl.teacher_id = u.id WHERE 1=1";
        $params = [];
        if ($teacherId) { $sql .= " AND tl.teacher_id = ?"; $params[] = $teacherId; }
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO teacher_lessons (teacher_id, lesson_id) VALUES (?, ?)");
        $stmt->execute([$body['teacherId'], $body['lessonId']]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM teacher_lessons WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== PERMISSION MATRIX =====
if ($resource === 'permission-matrix') {
    if ($method === 'GET') {
        $stmt = getDb()->query("SELECT * FROM permission_matrix ORDER BY id");
        json($stmt->fetchAll());
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'] as $role) {
            if (isset($body[$role])) { $fields[] = "$role = ?"; $vals[] = $body[$role] ? 1 : 0; }
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE permission_matrix SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
}

// ===== DASHBOARD STATS =====
if ($resource === 'dashboard') {
    $user = getAuthUser();
    $stats = [];
    $stats['totalStudents'] = (int)getDb()->query("SELECT COUNT(*) FROM students")->fetchColumn();
    $stats['totalSchools'] = (int)getDb()->query("SELECT COUNT(*) FROM schools WHERE active = TRUE")->fetchColumn();
    $stats['totalLessons'] = (int)getDb()->query("SELECT COUNT(*) FROM lessons WHERE active = TRUE")->fetchColumn();
    $stats['totalGroups'] = (int)getDb()->query("SELECT COUNT(*) FROM class_rooms WHERE active = TRUE")->fetchColumn();
    $stats['todayAttendance'] = (int)getDb()->prepare("SELECT COUNT(*) FROM attendance WHERE date = ? AND status = 'present'")->execute([date('Y-m-d')]) ? getDb()->query("SELECT COUNT(*) FROM attendance WHERE date = '".date('Y-m-d')."' AND status = 'present'")->fetchColumn() : 0;
    $stmt = getDb()->query("SELECT grade, COUNT(*) as count FROM students GROUP BY grade ORDER BY count DESC");
    $stats['gradeDistribution'] = $stmt->fetchAll();
    $stmt = getDb()->query("SELECT city, COUNT(*) as count FROM students GROUP BY city ORDER BY count DESC LIMIT 10");
    $stats['cityDistribution'] = $stmt->fetchAll();
    json($stats);
}

// ===== 404 =====
http_response_code(404);
json(['error' => 'Endpoint not found', 'resource' => $resource, 'method' => $method]);
?>

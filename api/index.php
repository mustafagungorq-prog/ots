
<?php

if (!function_exists('logApiError')) {
    function logApiError($message) {
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
        $logFile = $logDir . '/error.log';
        $line = date('Y-m-d H:i:s') . ' ' . $message . PHP_EOL;
        @file_put_contents($logFile, $line, FILE_APPEND);
    }
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/auth.php';

function columnExists($table, $column) {
    static $cache = [];
    $key = "$table.$column";
    if (array_key_exists($key, $cache)) return $cache[$key];
    try {
        $stmt = getDb()->prepare("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?");
        $stmt->execute([$table, $column]);
        $cache[$key] = (bool)$stmt->fetch();
    } catch (PDOException $e) {
        $cache[$key] = false;
    }
    return $cache[$key];
}

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

// Allow non-numeric sub-routes (e.g. memorization-tracking/summary).
if ($resource === 'memorization-tracking' && isset($parts[1]) && $parts[1] === 'summary') {
    $id = 'summary';
}

$debugMode = (env('APP_DEBUG') ?: 'false') === 'true';

// Keep production GET flows resilient when hosting DB schema/permissions differ.
set_exception_handler(function (Throwable $e) use ($method, $debugMode) {
    logApiError($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    if ($e instanceof PDOException && $method === 'GET') {
        http_response_code(200);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([]);
        exit;
    }

    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    $response = ['error' => 'Internal Server Error'];
    // DEBUG: always expose details until production issue is resolved
    $response['message'] = $e->getMessage();
    $response['file'] = $e->getFile();
    $response['line'] = $e->getLine();
    echo json_encode($response);
    exit;
});

function getParentLinkedStudentIds($parentUser) {
    ensureParentStudentLinksTable();
    $parentId = is_array($parentUser) ? (int)($parentUser['id'] ?? 0) : (int)$parentUser;
    if ($parentId <= 0) return [];

    // Preferred relation table.
    try {
        $stmt = getDb()->prepare("SELECT student_id FROM parent_student_links WHERE parent_user_id = ? ORDER BY id");
        $stmt->execute([$parentId]);
        $ids = array_map('intval', array_column($stmt->fetchAll(), 'student_id'));
        if (!empty($ids)) return array_values(array_unique($ids));
    } catch (PDOException $e) {
        // Ignore; fallback to heuristic match.
    }

    // Fallback: link by parent phone/email match if relation table is missing/empty.
    try {
        $u = getDb()->prepare("SELECT phone, email FROM users WHERE id = ?");
        $u->execute([$parentId]);
        $row = $u->fetch();
        if (!$row) return [];

        $conds = [];
        $params = [];
        $phone = trim((string)($row['phone'] ?? ''));
        $email = trim((string)($row['email'] ?? ''));

        if ($phone !== '') { $conds[] = "parent_phone = ?"; $params[] = $phone; }
        if ($email !== '') { $conds[] = "email = ?"; $params[] = $email; }
        if (empty($conds)) return [];

        $sql = "SELECT id FROM students WHERE " . implode(' OR ', $conds) . " ORDER BY id";
        $s = getDb()->prepare($sql);
        $s->execute($params);
        return array_map('intval', array_column($s->fetchAll(), 'id'));
    } catch (PDOException $e) {
        return [];
    }
}

function ensureParentStudentLinksTable() {
    static $ensured = false;
    if ($ensured) return;
    $ensured = true;
    try {
        getDb()->exec("CREATE TABLE IF NOT EXISTS parent_student_links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_user_id INT NOT NULL,
            student_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_parent_student (parent_user_id, student_id),
            UNIQUE KEY uniq_student (student_id),
            INDEX idx_parent_user_id (parent_user_id),
            INDEX idx_student_id (student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (PDOException $e) {
        // Keep runtime resilient even if CREATE privilege is not granted.
    }
}

function getSystemSetting($key, $default = null) {
    static $cache = [];
    if (array_key_exists($key, $cache)) return $cache[$key];
    try {
        $stmt = getDb()->prepare("SELECT `value` FROM system_settings WHERE `key` = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        $cache[$key] = $row ? $row['value'] : $default;
    } catch (PDOException $e) {
        $cache[$key] = $default;
    }
    return $cache[$key];
}

function setSystemSetting($key, $value) {
    static $cache = [];
    $stmt = getDb()->prepare("INSERT INTO system_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
    $stmt->execute([$key, $value]);
    $cache[$key] = $value;
}

function validateUserPayload($body, $isUpdate = false) {
    $username = isset($body['username']) ? trim((string)$body['username']) : '';
    $fullName = isset($body['fullName']) ? trim((string)$body['fullName']) : '';
    $email = isset($body['email']) ? trim((string)$body['email']) : '';
    $phone = isset($body['phone']) ? trim((string)$body['phone']) : '';
    $role = isset($body['role']) ? trim((string)$body['role']) : '';
    $password = isset($body['password']) ? (string)$body['password'] : '';
    $active = isset($body['active']) ? (bool)$body['active'] : true;

    $validRoles = ['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'];

    if (!$isUpdate) {
        if ($username === '') error('Username is required', 400);
        if ($fullName === '') error('Full name is required', 400);
        if ($role === '') error('Role is required', 400);
        if ($password === '') error('Password is required', 400);
        if (strlen($password) < 6) error('Password must be at least 6 characters', 400);
    }

    if ($username !== '' && strlen($username) < 3) error('Username must be at least 3 characters', 400);
    if ($username !== '' && !preg_match('/^[a-zA-Z0-9_]+$/', $username)) error('Username can only contain letters, numbers and underscores', 400);
    if ($fullName !== '' && strlen($fullName) < 2) error('Full name must be at least 2 characters', 400);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) error('Invalid email format', 400);
    if ($role !== '' && !in_array($role, $validRoles, true)) error('Invalid role', 400);

    return [
        'username' => $username,
        'fullName' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'role' => $role,
        'password' => $password,
        'active' => $active,
    ];
}

function ensureUserUnique($field, $value, $excludeId = null) {
    $allowed = ['username' => true, 'email' => true];
    if (!isset($allowed[$field])) return;
    if ($value === '') return;
    $db = getDb();
    $sql = "SELECT id FROM users WHERE {$field} = ?";
    $params = [$value];
    if ($excludeId) {
        $sql .= " AND id != ?";
        $params[] = (int)$excludeId;
    }
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    if ($stmt->fetch()) {
        error(ucfirst($field) . ' already exists', 409);
    }
}

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
        $linkedStudentIds = $user['role'] === 'parent' ? getParentLinkedStudentIds((int)$user['id']) : [];
        json(['token' => $token, 'user' => [
            'id' => $user['id'], 'username' => $user['username'],
            'fullName' => $user['full_name'], 'email' => $user['email'],
            'phone' => $user['phone'], 'role' => $user['role'],
            'linkedStudentIds' => $linkedStudentIds,
        ]]);
    }

    if ($action === 'me' && $method === 'GET') {
        $user = getAuthUser();
        if (($user['role'] ?? '') === 'parent') {
            $user['linkedStudentIds'] = getParentLinkedStudentIds($user);
        }
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
        $v = validateUserPayload($body);
        ensureUserUnique('username', $v['username']);
        ensureUserUnique('email', $v['email']);

        $hash = password_hash($v['password'], PASSWORD_BCRYPT);
        $stmt = getDb()->prepare("INSERT INTO users (username, password, full_name, email, phone, role, active) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $v['username'],
            $hash,
            $v['fullName'],
            $v['email'] !== '' ? $v['email'] : null,
            $v['phone'] !== '' ? $v['phone'] : null,
            $v['role'] !== '' ? $v['role'] : 'teacher',
            $v['active'] ? 1 : 0,
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $v = validateUserPayload($body, true);
        ensureUserUnique('username', $v['username'], $id);
        ensureUserUnique('email', $v['email'], $id);

        $fields = []; $vals = [];
        foreach (['full_name', 'email', 'phone', 'role', 'active'] as $f) {
            $key = $f === 'full_name' ? 'fullName' : ($f === 'active' ? 'active' : $f);
            if (isset($body[$key])) { $fields[] = "$f = ?"; $vals[] = $body[$key]; }
        }
        if ($v['username'] !== '') {
            $fields[] = "username = ?"; $vals[] = $v['username'];
        }
        if ($v['password'] !== '') {
            $fields[] = "password = ?"; $vals[] = password_hash($v['password'], PASSWORD_BCRYPT);
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

// ===== PARENT-STUDENT LINKS =====
if ($resource === 'parent-student-links') {
    $user = getAuthUser();
    ensureParentStudentLinksTable();

    if ($method === 'GET' && !$id) {
        if (($user['role'] ?? '') === 'parent') {
            $linkedIds = getParentLinkedStudentIds($user);
            json(array_map(function ($sid) use ($user) {
                return ['parent_user_id' => (int)$user['id'], 'student_id' => (int)$sid];
            }, $linkedIds));
        }

        requireRole(['superadmin', 'admin']);
        try {
            $stmt = getDb()->query("SELECT parent_user_id, student_id FROM parent_student_links ORDER BY id");
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            json([]);
        }
    }

    requireRole(['superadmin', 'admin']);

    if ($method === 'POST' && !$id) {
        $parentUserId = isset($body['parentUserId']) && is_numeric($body['parentUserId']) ? (int)$body['parentUserId'] : 0;
        $studentId = isset($body['studentId']) && is_numeric($body['studentId']) ? (int)$body['studentId'] : 0;
        if ($parentUserId <= 0 || $studentId <= 0) error('parentUserId and studentId are required', 400);

        // A student can only have one parent.
        $checkStmt = getDb()->prepare("SELECT parent_user_id FROM parent_student_links WHERE student_id = ?");
        $checkStmt->execute([$studentId]);
        if ($checkStmt->fetch()) {
            error('This student already has a parent', 409);
        }

        try {
            $stmt = getDb()->prepare("INSERT INTO parent_student_links (parent_user_id, student_id) VALUES (?, ?)");
            $stmt->execute([$parentUserId, $studentId]);
            json(['message' => 'Linked']);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                json(['message' => 'Already linked']);
            }
            error('Failed to create link: ' . $e->getMessage(), 400);
        }
    }

    if ($method === 'DELETE' && !$id) {
        $parentUserId = isset($_GET['parentUserId']) && is_numeric($_GET['parentUserId']) ? (int)$_GET['parentUserId'] : 0;
        $studentId = isset($_GET['studentId']) && is_numeric($_GET['studentId']) ? (int)$_GET['studentId'] : 0;
        if ($parentUserId <= 0 || $studentId <= 0) error('parentUserId and studentId are required', 400);

        try {
            $stmt = getDb()->prepare("DELETE FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?");
            $stmt->execute([$parentUserId, $studentId]);
            json(['message' => 'Unlinked']);
        } catch (PDOException $e) {
            error('Failed to delete link: ' . $e->getMessage(), 400);
        }
    }
}

// ===== STUDENTS =====
if ($resource === 'students') {
    $user = getAuthUser();
    $isParent = ($user['role'] ?? '') === 'parent';
    $parentStudentIds = $isParent ? getParentLinkedStudentIds($user) : [];

    function fetchStudentLessons($studentId) {
        try {
            $stmt = getDb()->prepare("SELECT course_id FROM student_courses WHERE student_id = ?");
            $stmt->execute([$studentId]);
            return array_map('intval', array_column($stmt->fetchAll(), 'course_id'));
        } catch (PDOException $e) {
            return [];
        }
    }

    if ($method === 'GET' && !$id) {
        if ($isParent && empty($parentStudentIds)) {
            json([]);
        }
        try {
            $sql = "SELECT s.*, sc.name as school_name_ref, COALESCE(NULLIF(s.school_name, ''), sc.name) as resolved_school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id ORDER BY s.id DESC";
            $stmt = getDb()->query($sql);
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            // Fallback for legacy schemas where related tables/columns may differ.
            try {
                $stmt = getDb()->query("SELECT s.*, NULL as school_name_ref, s.school_name as resolved_school_name, NULL as group_name FROM students s ORDER BY s.id DESC");
                $rows = $stmt->fetchAll();
            } catch (PDOException $fallbackError) {
                error('Failed to fetch students: ' . $fallbackError->getMessage(), 500);
            }
        }
        if ($isParent) {
            $allowed = array_flip($parentStudentIds);
            $rows = array_values(array_filter($rows, function ($r) use ($allowed) {
                return isset($allowed[(int)($r['id'] ?? 0)]);
            }));
        }
        foreach ($rows as &$row) { $row['lessons'] = fetchStudentLessons((int)$row['id']); $row['assigned_surveys'] = json_decode($row['assigned_surveys'] ?? '[]', true) ?: []; }
        json($rows);
    }
    if ($method === 'GET' && $id) {
        if ($isParent && !in_array((int)$id, $parentStudentIds, true)) {
            error('Forbidden', 403);
        }
        try {
            $stmt = getDb()->prepare("SELECT s.*, sc.name as school_name_ref, COALESCE(NULLIF(s.school_name, ''), sc.name) as resolved_school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id WHERE s.id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
        } catch (PDOException $e) {
            try {
                $stmt = getDb()->prepare("SELECT s.*, NULL as school_name_ref, s.school_name as resolved_school_name, NULL as group_name FROM students s WHERE s.id = ?");
                $stmt->execute([$id]);
                $row = $stmt->fetch();
            } catch (PDOException $fallbackError) {
                error('Failed to fetch student: ' . $fallbackError->getMessage(), 500);
            }
        }
        if ($row) { $row['lessons'] = fetchStudentLessons((int)$row['id']); $row['assigned_surveys'] = json_decode($row['assigned_surveys'] ?? '[]', true) ?: []; }
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

        $stmt = getDb()->prepare("INSERT INTO students (tc_kimlik, first_name, last_name, birth_year, city, school_id, school_name, grade, phone, parent_name, parent_phone, email, group_id, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $birthYear = isset($body['birthYear']) && is_numeric($body['birthYear']) ? (int)$body['birthYear'] : null;
        $age = $birthYear ? (int)date('Y') - $birthYear : null;

        try {
            $stmt->execute([
                $body['tcKimlik'] ?? null, $firstName, $lastName,
                $birthYear, $body['city'] ?? '', $schoolId,
                $body['schoolName'] ?? null, $body['grade'] ?? '', $body['phone'] ?? '',
                $body['parentName'] ?? '', $body['parentPhone'] ?? '', $body['email'] ?? '',
                $groupId, $age
            ]);
            $studentId = (int)getDb()->lastInsertId();
            if (!empty($body['lessons']) && is_array($body['lessons'])) {
                $ins = getDb()->prepare("INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)");
                foreach ($body['lessons'] as $courseId) {
                    $courseId = is_numeric($courseId) ? (int)$courseId : 0;
                    if ($courseId > 0) $ins->execute([$studentId, $courseId]);
                }
            }
        } catch (PDOException $e) {
            error('Failed to create student: ' . $e->getMessage(), 400);
        }

        json(['id' => $studentId]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        $map = [
            'tcKimlik' => 'tc_kimlik', 'firstName' => 'first_name', 'lastName' => 'last_name',
            'birthYear' => 'birth_year', 'city' => 'city',
            'schoolName' => 'school_name', 'grade' => 'grade', 'phone' => 'phone',
            'parentName' => 'parent_name', 'parentPhone' => 'parent_phone', 'email' => 'email'
        ];
        foreach ($map as $key => $col) {
            if (array_key_exists($key, $body)) {
                $value = $body[$key];
                if (in_array($key, ['firstName', 'lastName'], true)) {
                    $value = trim((string)$value);
                    if ($value === '') error('First name and last name are required', 400);
                }
                if ($key === 'birthYear') {
                    $value = is_numeric($value) ? (int)$value : null;
                }
                $fields[] = "$col = ?";
                $vals[] = $value;
            }
        }

        if (array_key_exists('schoolId', $body)) {
            $schoolId = null;
            if ($body['schoolId'] !== null && $body['schoolId'] !== '') {
                if (!is_numeric($body['schoolId'])) error('Invalid schoolId', 400);
                $schoolId = (int)$body['schoolId'];
                $s = getDb()->prepare("SELECT id FROM schools WHERE id = ?");
                $s->execute([$schoolId]);
                if (!$s->fetch()) $schoolId = null;
            }
            $fields[] = "school_id = ?";
            $vals[] = $schoolId;
        }

        if (array_key_exists('groupId', $body)) {
            $groupId = null;
            if ($body['groupId'] !== null && $body['groupId'] !== '') {
                if (!is_numeric($body['groupId'])) error('Invalid groupId', 400);
                $groupId = (int)$body['groupId'];
                $g = getDb()->prepare("SELECT id FROM class_rooms WHERE id = ?");
                $g->execute([$groupId]);
                if (!$g->fetch()) $groupId = null;
            }
            $fields[] = "group_id = ?";
            $vals[] = $groupId;
        }

        if (array_key_exists('birthYear', $body)) {
            $birthYear = is_numeric($body['birthYear']) ? (int)$body['birthYear'] : null;
            $fields[] = "age = ?";
            $vals[] = $birthYear ? (int)date('Y') - $birthYear : null;
        } elseif (array_key_exists('age', $body)) {
            $fields[] = "age = ?";
            $vals[] = is_numeric($body['age']) ? (int)$body['age'] : null;
        }

        $hasLessonUpdate = array_key_exists('lessons', $body);
        if (empty($fields) && !$hasLessonUpdate) error('No fields to update');
        $vals[] = $id;
        $stmt = getDb()->prepare("UPDATE students SET " . implode(', ', $fields) . " WHERE id = ?");
        try {
            $stmt->execute($vals);
            if ($hasLessonUpdate) {
                getDb()->prepare("DELETE FROM student_courses WHERE student_id = ?")->execute([$id]);
                $lessons = $body['lessons'] ?? [];
                if (is_array($lessons) && !empty($lessons)) {
                    $ins = getDb()->prepare("INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)");
                    foreach ($lessons as $courseId) {
                        $courseId = is_numeric($courseId) ? (int)$courseId : 0;
                        if ($courseId > 0) $ins->execute([$id, $courseId]);
                    }
                }
            }
        } catch (PDOException $e) {
            error('Failed to update student: ' . $e->getMessage(), 400);
        }
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM students WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== STUDENT COURSE ASSIGNMENTS =====
if ($resource === 'student-course-assignments') {
    $user = getAuthUser();
    if (!in_array($user['role'] ?? '', ['superadmin', 'admin', 'authorized_teacher'], true)) {
        error('Forbidden', 403);
    }

    if ($method === 'POST' && !$id) {
        $studentIds = $body['studentIds'] ?? [];
        $courseId = isset($body['courseId']) && is_numeric($body['courseId']) ? (int)$body['courseId'] : 0;
        if ($courseId <= 0 || !is_array($studentIds) || empty($studentIds)) {
            error('studentIds array and courseId are required', 400);
        }
        try {
            $stmt = getDb()->prepare("INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)");
            $assigned = 0;
            foreach ($studentIds as $sid) {
                if (!is_numeric($sid)) continue;
                $stmt->execute([(int)$sid, $courseId]);
                if ($stmt->rowCount() > 0) $assigned++;
            }
            json(['message' => 'Assigned', 'assigned' => $assigned]);
        } catch (PDOException $e) {
            error('Failed to assign course: ' . $e->getMessage(), 400);
        }
    }
}

// ===== SCHOOLS =====
if ($resource === 'schools') {
    if ($method === 'GET' && !$id) {
        try {
            $stmt = getDb()->query("SELECT * FROM schools ORDER BY id");
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            // Production fallback for legacy/incomplete schemas.
            try {
                $tableStmt = getDb()->query("SHOW TABLES LIKE 'schools'");
                if (!$tableStmt->fetch()) {
                    json([]);
                }

                $colStmt = getDb()->query("SHOW COLUMNS FROM schools");
                $columns = [];
                foreach ($colStmt->fetchAll() as $c) {
                    $columns[$c['Field']] = true;
                }

                $select = [];
                $select[] = isset($columns['id']) ? "id" : "NULL AS id";
                $select[] = isset($columns['name']) ? "name" : "'' AS name";
                $select[] = isset($columns['address']) ? "address" : "'' AS address";
                $select[] = isset($columns['phone']) ? "phone" : "'' AS phone";
                $select[] = isset($columns['principal_name']) ? "principal_name" : "'' AS principal_name";
                $select[] = isset($columns['active']) ? "active" : "1 AS active";
                $select[] = isset($columns['created_at']) ? "created_at" : "NULL AS created_at";

                $orderBy = isset($columns['id']) ? "id" : "name";
                $fallbackSql = "SELECT " . implode(', ', $select) . " FROM schools ORDER BY " . $orderBy;
                $stmt = getDb()->query($fallbackSql);
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                error('Failed to fetch schools: ' . $fallbackError->getMessage(), 500);
            }
        }
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

// ===== LESSONS (Course Schedules) =====
if ($resource === 'lessons') {
    if ($method === 'GET' && !$id) {
        try {
            $stmt = getDb()->query("SELECT cs.*, c.name, c.description, u.full_name as teacher_name FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN users u ON cs.teacher_id = u.id ORDER BY c.name, cs.day_of_week, cs.start_time");
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            try {
                $stmt = getDb()->query("SELECT cs.*, c.name, c.description, NULL as teacher_name FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id ORDER BY c.name, cs.day_of_week, cs.start_time");
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                error('Failed to fetch lessons: ' . $fallbackError->getMessage(), 500);
            }
        }
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin']);
        $courseName = trim($body['name'] ?? '');
        if ($courseName === '') error('Course name is required', 400);
        $teacherId = isset($body['teacherId']) && is_numeric($body['teacherId']) ? (int)$body['teacherId'] : null;
        $classRoomId = isset($body['classRoomId']) && is_numeric($body['classRoomId']) ? (int)$body['classRoomId'] : null;
        $dayOfWeek = $body['dayOfWeek'] ?? '';
        $startTime = $body['startTime'] ?? '';
        $endTime = $body['endTime'] ?? '';
        $active = isset($body['active']) ? (bool)$body['active'] : true;

        $courseStmt = getDb()->prepare("SELECT id FROM courses WHERE name = ?");
        $courseStmt->execute([$courseName]);
        $courseId = (int)$courseStmt->fetchColumn();
        if (!$courseId) {
            getDb()->prepare("INSERT INTO courses (name, description, active) VALUES (?, ?, ?)")
                ->execute([$courseName, $body['description'] ?? '', $active ? 1 : 0]);
            $courseId = (int)getDb()->lastInsertId();
        }
        getDb()->prepare("INSERT INTO course_schedules (course_id, teacher_id, class_room_id, day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([$courseId, $teacherId, $classRoomId, $dayOfWeek, $startTime, $endTime, $active ? 1 : 0]);
        json(['id' => (int)getDb()->lastInsertId(), 'courseId' => $courseId]);
    }
    if ($method === 'PUT' && $id) {
        requireRole(['superadmin', 'admin']);
        $scheduleStmt = getDb()->prepare("SELECT course_id FROM course_schedules WHERE id = ?");
        $scheduleStmt->execute([$id]);
        $courseId = (int)$scheduleStmt->fetchColumn();
        if (!$courseId) error('Schedule not found', 404);

        $courseFields = []; $courseVals = [];
        if (isset($body['name'])) { $courseFields[] = "name = ?"; $courseVals[] = $body['name']; }
        if (isset($body['description'])) { $courseFields[] = "description = ?"; $courseVals[] = $body['description']; }
        if (isset($body['active'])) { $courseFields[] = "active = ?"; $courseVals[] = $body['active'] ? 1 : 0; }
        if (!empty($courseFields)) {
            $courseVals[] = $courseId;
            getDb()->prepare("UPDATE courses SET " . implode(', ', $courseFields) . " WHERE id = ?")->execute($courseVals);
        }

        $scheduleFields = []; $scheduleVals = [];
        foreach (['teacherId' => 'teacher_id', 'classRoomId' => 'class_room_id', 'dayOfWeek' => 'day_of_week', 'startTime' => 'start_time', 'endTime' => 'end_time'] as $k => $c) {
            if (isset($body[$k])) { $scheduleFields[] = "$c = ?"; $scheduleVals[] = $body[$k]; }
        }
        if (isset($body['active'])) { $scheduleFields[] = "active = ?"; $scheduleVals[] = $body['active'] ? 1 : 0; }
        if (!empty($scheduleFields)) {
            $scheduleVals[] = $id;
            getDb()->prepare("UPDATE course_schedules SET " . implode(', ', $scheduleFields) . " WHERE id = ?")->execute($scheduleVals);
        }
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        requireRole(['superadmin', 'admin']);
        $scheduleStmt = getDb()->prepare("SELECT course_id FROM course_schedules WHERE id = ?");
        $scheduleStmt->execute([$id]);
        $courseId = (int)$scheduleStmt->fetchColumn();
        getDb()->prepare("DELETE FROM course_schedules WHERE id = ?")->execute([$id]);
        $remainingStmt = getDb()->prepare("SELECT COUNT(*) FROM course_schedules WHERE course_id = ?");
        $remainingStmt->execute([$courseId]);
        if ((int)$remainingStmt->fetchColumn() === 0) {
            getDb()->prepare("DELETE FROM courses WHERE id = ?")->execute([$courseId]);
        }
        json(['message' => 'Deleted']);
    }
}

// ===== COURSES =====
if ($resource === 'courses') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT * FROM courses ORDER BY name");
        json($stmt->fetchAll());
    }
    if ($method === 'GET' && $id) {
        $stmt = getDb()->prepare("SELECT * FROM courses WHERE id = ?");
        $stmt->execute([$id]);
        json($stmt->fetch() ?: null);
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin']);
        $name = trim($body['name'] ?? '');
        if ($name === '') error('Course name is required', 400);
        getDb()->prepare("INSERT INTO courses (name, description, active) VALUES (?, ?, ?)")
            ->execute([$name, $body['description'] ?? '', isset($body['active']) ? ($body['active'] ? 1 : 0) : 1]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireRole(['superadmin', 'admin']);
        $fields = []; $vals = [];
        if (isset($body['name'])) { $fields[] = "name = ?"; $vals[] = trim($body['name']); }
        if (isset($body['description'])) { $fields[] = "description = ?"; $vals[] = $body['description']; }
        if (isset($body['active'])) { $fields[] = "active = ?"; $vals[] = $body['active'] ? 1 : 0; }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE courses SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        requireRole(['superadmin', 'admin']);
        getDb()->prepare("DELETE FROM courses WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== COURSE SCHEDULES =====
if ($resource === 'course-schedules') {
    if ($method === 'GET' && !$id) {
        try {
            $stmt = getDb()->query("SELECT cs.*, c.name, c.description, u.full_name as teacher_name FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN users u ON cs.teacher_id = u.id ORDER BY c.name, cs.day_of_week, cs.start_time");
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            try {
                $stmt = getDb()->query("SELECT cs.*, c.name, c.description, NULL as teacher_name FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id ORDER BY c.name, cs.day_of_week, cs.start_time");
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                error('Failed to fetch course schedules: ' . $fallbackError->getMessage(), 500);
            }
        }
    }
    if ($method === 'GET' && $id) {
        $stmt = getDb()->prepare("SELECT cs.*, c.name, c.description, u.full_name as teacher_name FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN users u ON cs.teacher_id = u.id WHERE cs.id = ?");
        $stmt->execute([$id]);
        json($stmt->fetch() ?: null);
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin']);
        $courseId = isset($body['courseId']) && is_numeric($body['courseId']) ? (int)$body['courseId'] : 0;
        if ($courseId <= 0) error('courseId is required', 400);
        $teacherId = isset($body['teacherId']) && is_numeric($body['teacherId']) ? (int)$body['teacherId'] : null;
        $classRoomId = isset($body['classRoomId']) && is_numeric($body['classRoomId']) ? (int)$body['classRoomId'] : null;
        getDb()->prepare("INSERT INTO course_schedules (course_id, teacher_id, class_room_id, day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([$courseId, $teacherId, $classRoomId, $body['dayOfWeek'] ?? '', $body['startTime'] ?? '', $body['endTime'] ?? '', isset($body['active']) ? ($body['active'] ? 1 : 0) : 1]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireRole(['superadmin', 'admin']);
        $fields = []; $vals = [];
        foreach (['courseId' => 'course_id', 'teacherId' => 'teacher_id', 'classRoomId' => 'class_room_id', 'dayOfWeek' => 'day_of_week', 'startTime' => 'start_time', 'endTime' => 'end_time'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (isset($body['active'])) { $fields[] = "active = ?"; $vals[] = $body['active'] ? 1 : 0; }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE course_schedules SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        requireRole(['superadmin', 'admin']);
        getDb()->prepare("DELETE FROM course_schedules WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== CLASS ROOMS (GROUPS) =====
if ($resource === 'class-rooms') {
    function fetchClassRoomCourseIds($classRoomId) {
        try {
            $stmt = getDb()->prepare("SELECT course_id FROM class_room_courses WHERE class_room_id = ?");
            $stmt->execute([$classRoomId]);
            return array_map('intval', array_column($stmt->fetchAll(), 'course_id'));
        } catch (PDOException $e) {
            return [];
        }
    }

    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT cr.*, s.name as school_name FROM class_rooms cr LEFT JOIN schools s ON cr.school_id = s.id ORDER BY cr.id");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['lesson_ids'] = fetchClassRoomCourseIds((int)$row['id']);
            $row['teacher_ids'] = json_decode($row['teacher_ids'] ?? '[]', true) ?: [];
        }
        json($rows);
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO class_rooms (name, grade, school_id, description, teacher_ids, active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$body['name'], $body['grade'], $body['schoolId'], $body['description'] ?? '', json_encode($body['teacherIds'] ?? []), $body['active'] ?? true]);
        $classRoomId = (int)getDb()->lastInsertId();
        if (!empty($body['lessonIds']) && is_array($body['lessonIds'])) {
            $ins = getDb()->prepare("INSERT INTO class_room_courses (class_room_id, course_id) VALUES (?, ?)");
            foreach ($body['lessonIds'] as $courseId) {
                $courseId = is_numeric($courseId) ? (int)$courseId : 0;
                if ($courseId > 0) $ins->execute([$classRoomId, $courseId]);
            }
        }
        json(['id' => $classRoomId]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['name' => 'name', 'grade' => 'grade', 'schoolId' => 'school_id', 'description' => 'description', 'active' => 'active'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (isset($body['teacherIds'])) { $fields[] = "teacher_ids = ?"; $vals[] = json_encode($body['teacherIds']); }
        $hasLessonIds = isset($body['lessonIds']);
        if (empty($fields) && !$hasLessonIds) error('No fields to update');
        if (!empty($fields)) {
            $vals[] = $id;
            getDb()->prepare("UPDATE class_rooms SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        }
        if ($hasLessonIds) {
            getDb()->prepare("DELETE FROM class_room_courses WHERE class_room_id = ?")->execute([$id]);
            $lessonIds = $body['lessonIds'] ?? [];
            if (is_array($lessonIds) && !empty($lessonIds)) {
                $ins = getDb()->prepare("INSERT INTO class_room_courses (class_room_id, course_id) VALUES (?, ?)");
                foreach ($lessonIds as $courseId) {
                    $courseId = is_numeric($courseId) ? (int)$courseId : 0;
                    if ($courseId > 0) $ins->execute([$id, $courseId]);
                }
            }
        }
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
        $classRoomId = $_GET['classRoomId'] ?? null;
        $date = $_GET['date'] ?? null;
        $params = [];

        try {
            $sql = "SELECT a.*, s.first_name, s.last_name, cr.name as class_room_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN class_rooms cr ON a.class_room_id = cr.id WHERE 1=1";
            if ($studentId) { $sql .= " AND a.student_id = ?"; $params[] = $studentId; }
            if ($classRoomId) { $sql .= " AND a.class_room_id = ?"; $params[] = $classRoomId; }
            if ($date) { $sql .= " AND a.date = ?"; $params[] = $date; }
            $sql .= " ORDER BY a.id DESC";
            $stmt = getDb()->prepare($sql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            $params = [];
            $fallbackSql = "SELECT a.*, s.first_name, s.last_name, NULL as class_room_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id WHERE 1=1";
            if ($studentId) { $fallbackSql .= " AND a.student_id = ?"; $params[] = $studentId; }
            if ($classRoomId) { $fallbackSql .= " AND a.class_room_id = ?"; $params[] = $classRoomId; }
            if ($date) { $fallbackSql .= " AND a.date = ?"; $params[] = $date; }
            $fallbackSql .= " ORDER BY a.id DESC";
            $stmt = getDb()->prepare($fallbackSql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        }
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO attendance (student_id, class_room_id, date, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([$body['studentId'], $body['classRoomId'] ?? null, $body['date'], $body['status'] ?? 'present', $body['notes'] ?? '', $user['id'] ?? null]);
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
        $stmt = getDb()->prepare("INSERT INTO progress (student_id, date, kuran_current_page, kuran_target_page, kuran_pages, risale_current_page, risale_target_page, risale_pages, elifba_current_page, elifba_target_page, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([
            $body['studentId'], $body['date'],
            $body['kuranCurrentPage'] ?? 0, $body['kuranTargetPage'] ?? 0, $body['kuranPages'] ?? 0,
            $body['risaleCurrentPage'] ?? 0, $body['risaleTargetPage'] ?? 0, $body['risalePages'] ?? 0,
            $body['elifbaCurrentPage'] ?? 0, $body['elifbaTargetPage'] ?? 0,
            $body['notes'] ?? '', $user['id'] ?? null
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $map = ['kuranCurrentPage' => 'kuran_current_page', 'kuranTargetPage' => 'kuran_target_page', 'kuranPages' => 'kuran_pages', 'risaleCurrentPage' => 'risale_current_page', 'risaleTargetPage' => 'risale_target_page', 'risalePages' => 'risale_pages', 'elifbaCurrentPage' => 'elifba_current_page', 'elifbaTargetPage' => 'elifba_target_page', 'notes' => 'notes'];
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
        $rows = [];
        try {
            $stmt = getDb()->query("SELECT * FROM reports ORDER BY created_at DESC, id DESC");
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            // Production fallback for legacy schemas where some columns may be missing.
            try {
                $colStmt = getDb()->query("SHOW COLUMNS FROM reports");
                $columns = [];
                foreach ($colStmt->fetchAll() as $c) {
                    $columns[$c['Field']] = true;
                }

                $select = [];
                $select[] = isset($columns['id']) ? "id" : "NULL AS id";
                $select[] = isset($columns['template_id']) ? "template_id" : "NULL AS template_id";
                $select[] = isset($columns['title']) ? "title" : "'' AS title";
                $select[] = isset($columns['recipients']) ? "recipients" : "'[]' AS recipients";
                $select[] = isset($columns['sent_via']) ? "sent_via" : "'email' AS sent_via";
                $select[] = isset($columns['status']) ? "status" : "'draft' AS status";
                $select[] = isset($columns['created_by']) ? "created_by" : "NULL AS created_by";
                $select[] = isset($columns['created_at']) ? "created_at" : "NULL AS created_at";

                $orderBy = isset($columns['created_at']) ? "created_at DESC, id DESC" : "id DESC";
                $fallbackSql = "SELECT " . implode(', ', $select) . " FROM reports ORDER BY " . $orderBy;
                $stmt = getDb()->query($fallbackSql);
                $rows = $stmt->fetchAll();
            } catch (PDOException $fallbackError) {
                // Last-resort fallback for hosting environments with strict DB perms
                // or missing reports table: keep frontend alive with an empty list.
                $rows = [];
            }
        }

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

// ===== MAIL =====
if ($resource === 'mail') {
    $action = $parts[1] ?? '';

    if ($action === 'student-report' && $method === 'POST') {
        $user = getAuthUser();
        if (!in_array($user['role'], ['superadmin', 'admin', 'authorized_teacher', 'teacher'])) {
            error('Forbidden', 403);
        }
        require_once __DIR__ . '/config/mail.php';
        try {
            json(send_configured_mail($body, $user));
        } catch (InvalidArgumentException $e) {
            error($e->getMessage(), 400);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
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
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['title' => 'title', 'description' => 'description', 'active' => 'active'] as $k => $c) {
            if (array_key_exists($k, $body)) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE surveys SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM surveys WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== SURVEY QUESTIONS =====
if ($resource === 'survey-questions') {
    $surveyId = isset($_GET['surveyId']) && is_numeric($_GET['surveyId']) ? (int)$_GET['surveyId'] : null;
    if ($method === 'GET') {
        if ($surveyId) {
            $stmt = getDb()->prepare("SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order, id");
            $stmt->execute([$surveyId]);
        } else {
            $stmt = getDb()->query("SELECT * FROM survey_questions ORDER BY survey_id, sort_order, id");
        }
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) { $row['options'] = json_decode($row['options'] ?? '[]', true) ?: []; }
        json($rows);
    }
    if ($method === 'POST') {
        $surveyId = isset($body['surveyId']) && is_numeric($body['surveyId']) ? (int)$body['surveyId'] : 0;
        $question = trim((string)($body['question'] ?? ''));
        $questionType = (string)($body['questionType'] ?? 'text');
        $allowedTypes = ['text', 'single_choice', 'multiple_choice', 'rating'];
        $options = $body['options'] ?? [];
        $sortOrder = isset($body['sortOrder']) && is_numeric($body['sortOrder']) ? (int)$body['sortOrder'] : 0;

        if ($surveyId <= 0) error('surveyId is required', 400);
        if ($question === '') error('question is required', 400);
        if (!in_array($questionType, $allowedTypes, true)) error('Invalid questionType', 400);
        if (!is_array($options)) error('options must be an array', 400);

        $surveyStmt = getDb()->prepare("SELECT id FROM surveys WHERE id = ?");
        $surveyStmt->execute([$surveyId]);
        if (!$surveyStmt->fetch()) error('Survey not found', 404);

        $stmt = getDb()->prepare("INSERT INTO survey_questions (survey_id, question, question_type, `options`, sort_order) VALUES (?, ?, ?, ?, ?)");
        try {
            $stmt->execute([$surveyId, $question, $questionType, json_encode($options), $sortOrder]);
        } catch (PDOException $e) {
            error('Failed to create survey question: ' . $e->getMessage(), 400);
        }
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
        try {
            $stmt = getDb()->query("SELECT ht.*, c.name as course_name FROM homework_templates ht LEFT JOIN courses c ON ht.course_id = c.id ORDER BY ht.id");
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            // Fallback for legacy schemas where courses table/column may differ.
            try {
                $stmt = getDb()->query("SELECT * FROM homework_templates ORDER BY id");
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                error('Failed to fetch homework templates: ' . $fallbackError->getMessage(), 500);
            }
        }
    }
    if ($method === 'POST' && !$id) {
        $columns = ['title', 'content', 'details', 'course_id', 'created_by'];
        $values = [
            $body['title'] ?? '',
            $body['content'] ?? '',
            $body['details'] ?? '',
            $body['lessonId'] ?? null,
            $user['id'] ?? null,
        ];
        if (columnExists('homework_templates', 'active')) {
            $columns[] = 'active';
            $values[] = isset($body['active']) ? ($body['active'] ? 1 : 0) : 1;
        }
        if (columnExists('homework_templates', 'type')) {
            $columns[] = 'type';
            $values[] = $body['type'] ?? 'diger';
        }
        $stmt = getDb()->prepare("INSERT INTO homework_templates (" . implode(', ', $columns) . ") VALUES (" . implode(', ', array_fill(0, count($columns), '?')) . ")");
        $stmt->execute($values);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['title' => 'title', 'content' => 'content', 'details' => 'details', 'lessonId' => 'course_id'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (columnExists('homework_templates', 'active') && array_key_exists('active', $body)) {
            $fields[] = "active = ?"; $vals[] = $body['active'] ? 1 : 0;
        }
        if (columnExists('homework_templates', 'type') && array_key_exists('type', $body)) {
            $fields[] = "type = ?"; $vals[] = $body['type'];
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

// ===== MEMORIZATION TEXTS =====
if ($resource === 'memorization-texts') {
    $user = getAuthUser();

    if ($method === 'GET' && !$id) {
        $activeOnly = isset($_GET['active']) && $_GET['active'] === '1';
        $sql = "SELECT mt.*, u.full_name as created_by_name FROM memorization_texts mt LEFT JOIN users u ON mt.created_by = u.id";
        if ($activeOnly) $sql .= " WHERE mt.active = TRUE";
        $sql .= " ORDER BY mt.created_at DESC, mt.id DESC";
        $stmt = getDb()->query($sql);
        json($stmt->fetchAll());
    }

    if ($method === 'GET' && $id) {
        $stmt = getDb()->prepare("SELECT mt.*, u.full_name as created_by_name FROM memorization_texts mt LEFT JOIN users u ON mt.created_by = u.id WHERE mt.id = ?");
        $stmt->execute([$id]);
        json($stmt->fetch() ?: null);
    }

    requireRole(['superadmin', 'admin']);

    if ($method === 'POST' && !$id) {
        $title = trim((string)($body['title'] ?? ''));
        $content = trim((string)($body['content'] ?? ''));
        if ($title === '' || $content === '') error('Title and content are required', 400);

        $stmt = getDb()->prepare("INSERT INTO memorization_texts (title, content, active, created_by) VALUES (?, ?, ?, ?)");
        $stmt->execute([$title, $content, isset($body['active']) ? (bool)$body['active'] : true, $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }

    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['title' => 'title', 'content' => 'content', 'active' => 'active'] as $k => $c) {
            if (array_key_exists($k, $body)) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE memorization_texts SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }

    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM memorization_texts WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== MEMORIZATION TRACKING =====
if ($resource === 'memorization-tracking') {
    $user = getAuthUser();
        $isTeacherRestricted = in_array($user['role'], ['authorized_teacher', 'teacher'], true);
        $canAccessStudent = function ($studentId) use ($user, $isTeacherRestricted) {
                if (!$isTeacherRestricted) return true;
                if (!$studentId || !is_numeric($studentId)) return false;

                $sql = "SELECT COUNT(*)
                                FROM students s
                                LEFT JOIN class_rooms cr ON cr.id = s.group_id
                                WHERE s.id = ?
                                    AND (
                                        EXISTS (
                                            SELECT 1
                                            FROM course_schedules cs
                                            JOIN student_courses sc ON sc.course_id = cs.course_id
                                            WHERE cs.teacher_id = ?
                                                AND sc.student_id = s.id
                                        )
                                        OR (
                                            cr.id IS NOT NULL
                                            AND FIND_IN_SET(
                                                        CAST(? AS CHAR),
                                                        REPLACE(REPLACE(REPLACE(COALESCE(cr.teacher_ids, '[]'), '[', ''), ']', ''), ' ', '')
                                                    ) > 0
                                        )
                                    )";
                $stmt = getDb()->prepare($sql);
                $stmt->execute([(int)$studentId, (int)$user['id'], (int)$user['id']]);
                return (int)$stmt->fetchColumn() > 0;
        };

    if ($method === 'GET' && !$id) {
        $textId = isset($_GET['textId']) ? (int)$_GET['textId'] : null;
        $studentId = isset($_GET['studentId']) ? (int)$_GET['studentId'] : null;
        $status = $_GET['status'] ?? null;

        $sql = "SELECT mt.*, s.first_name, s.last_name, mtxt.title as text_title, u.full_name as checked_by_name
                FROM memorization_tracking mt
                LEFT JOIN students s ON mt.student_id = s.id
                LEFT JOIN memorization_texts mtxt ON mt.text_id = mtxt.id
                LEFT JOIN users u ON mt.checked_by = u.id
                WHERE 1=1";
        $params = [];

        if ($textId) { $sql .= " AND mt.text_id = ?"; $params[] = $textId; }
        if ($studentId) { $sql .= " AND mt.student_id = ?"; $params[] = $studentId; }
        if ($status) { $sql .= " AND mt.status = ?"; $params[] = $status; }
        if ($isTeacherRestricted) {
            $sql .= " AND (
                EXISTS (
                  SELECT 1
                  FROM teacher_lessons tl
                  JOIN students s2 ON s2.id = mt.student_id
                  WHERE tl.teacher_id = ?
                    AND FIND_IN_SET(
                      CAST(tl.lesson_id AS CHAR),
                      REPLACE(REPLACE(REPLACE(COALESCE(s2.lessons, '[]'), '[', ''), ']', ''), ' ', '')
                    ) > 0
                )
                OR EXISTS (
                  SELECT 1
                  FROM students s3
                  JOIN class_rooms cr ON cr.id = s3.group_id
                  WHERE s3.id = mt.student_id
                    AND FIND_IN_SET(
                      CAST(? AS CHAR),
                      REPLACE(REPLACE(REPLACE(COALESCE(cr.teacher_ids, '[]'), '[', ''), ']', ''), ' ', '')
                    ) > 0
                )
                  )";
            $params[] = (int)$user['id'];
            $params[] = (int)$user['id'];
        }

        $sql .= " ORDER BY mt.updated_at DESC, mt.id DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }

    if ($method === 'GET' && $id === 'summary') {
        $studentId = isset($_GET['studentId']) ? (int)$_GET['studentId'] : 0;
        if ($studentId <= 0) error('studentId is required', 400);
        if (!$canAccessStudent($studentId)) error('Forbidden', 403);

        $sql = "SELECT mt.id, mt.student_id, mt.text_id, mt.status, mt.scores, mt.teacher_note, mt.checked_at, mt.updated_at, mtxt.title as text_title, u.full_name as checked_by_name
                FROM memorization_tracking mt
                LEFT JOIN memorization_texts mtxt ON mt.text_id = mtxt.id
                LEFT JOIN users u ON mt.checked_by = u.id
                WHERE mt.student_id = ?
                ORDER BY mt.checked_at DESC, mt.updated_at DESC, mt.id DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute([$studentId]);
        $rows = $stmt->fetchAll();

        $counts = ['passed' => 0, 'failed' => 0, 'repeat_tecvid' => 0, 'repeat_harf' => 0];
        $recent = [];
        $needsRepeat = [];
        foreach ($rows as $r) {
            $status = $r['status'];
            if (array_key_exists($status, $counts)) $counts[$status]++;
            $item = [
                'id' => (int)$r['id'],
                'studentId' => (int)$r['student_id'],
                'textId' => (int)$r['text_id'],
                'textTitle' => $r['text_title'] ?: ('Metin #' . $r['text_id']),
                'status' => $status,
                'scores' => json_decode($r['scores'] ?? 'null', true),
                'teacherNote' => $r['teacher_note'] ?? '',
                'checkedAt' => $r['checked_at'] ?? '',
                'updatedAt' => $r['updated_at'] ?? '',
                'checkedByName' => $r['checked_by_name'] ?? '',
            ];
            $recent[] = $item;
            if (in_array($status, ['failed', 'repeat_tecvid', 'repeat_harf'], true)) {
                $needsRepeat[] = $item;
            }
        }
        $total = count($rows);
        $successRate = $total > 0 ? round(($counts['passed'] / $total) * 100, 2) : 0;
        json([
            'studentId' => $studentId,
            'total' => $total,
            'passed' => $counts['passed'],
            'failed' => $counts['failed'],
            'repeatTecvid' => $counts['repeat_tecvid'],
            'repeatHarf' => $counts['repeat_harf'],
            'successRate' => $successRate,
            'recent' => $recent,
            'needsRepeat' => $needsRepeat,
            'statusCounts' => $counts,
        ]);
    }

    if ($method === 'GET' && $id) {
        $stmt = getDb()->prepare("SELECT mt.*, s.first_name, s.last_name, mtxt.title as text_title, u.full_name as checked_by_name
                                  FROM memorization_tracking mt
                                  LEFT JOIN students s ON mt.student_id = s.id
                                  LEFT JOIN memorization_texts mtxt ON mt.text_id = mtxt.id
                                  LEFT JOIN users u ON mt.checked_by = u.id
                                  WHERE mt.id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch() ?: null;
        if ($row && !$canAccessStudent($row['student_id'])) error('Forbidden', 403);
        json($row);
    }

    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin', 'authorized_teacher', 'teacher']);

        $studentId = isset($body['studentId']) ? (int)$body['studentId'] : 0;
        $textId = isset($body['textId']) ? (int)$body['textId'] : 0;
        $status = $body['status'] ?? 'failed';
        $teacherNote = $body['teacherNote'] ?? '';
        $allowedStatuses = ['passed', 'failed', 'repeat_tecvid', 'repeat_harf'];

        if ($studentId <= 0 || $textId <= 0) error('studentId and textId are required', 400);
        if (!in_array($status, $allowedStatuses, true)) error('Invalid status', 400);
        if (!$canAccessStudent($studentId)) error('Forbidden', 403);

        $scores = array_key_exists('scores', $body) ? $body['scores'] : null;
        $scoresJson = $scores === null ? null : json_encode($scores);

        $sql = "INSERT INTO memorization_tracking (student_id, text_id, status, scores, teacher_note, checked_by, checked_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  status = VALUES(status),
                  scores = VALUES(scores),
                  teacher_note = VALUES(teacher_note),
                  checked_by = VALUES(checked_by),
                  checked_at = NOW()";
        $stmt = getDb()->prepare($sql);
        $stmt->execute([$studentId, $textId, $status, $scoresJson, $teacherNote, $user['id'] ?? null]);

        json(['message' => 'Saved']);
    }

    if ($method === 'PUT' && $id) {
        requireRole(['superadmin', 'admin', 'authorized_teacher', 'teacher']);

        $sidStmt = getDb()->prepare("SELECT student_id FROM memorization_tracking WHERE id = ?");
        $sidStmt->execute([$id]);
        $trackingStudentId = $sidStmt->fetchColumn();
        if (!$trackingStudentId) error('Tracking record not found', 404);
        if (!$canAccessStudent($trackingStudentId)) error('Forbidden', 403);

        $fields = []; $vals = [];
        if (array_key_exists('status', $body)) {
            $allowedStatuses = ['passed', 'failed', 'repeat_tecvid', 'repeat_harf'];
            if (!in_array($body['status'], $allowedStatuses, true)) error('Invalid status', 400);
            $fields[] = "status = ?"; $vals[] = $body['status'];
            $fields[] = "checked_at = NOW()";
            $fields[] = "checked_by = ?"; $vals[] = $user['id'] ?? null;
        }
        if (array_key_exists('teacherNote', $body)) { $fields[] = "teacher_note = ?"; $vals[] = $body['teacherNote']; }
        if (array_key_exists('scores', $body)) { $fields[] = "scores = ?"; $vals[] = $body['scores'] === null ? null : json_encode($body['scores']); }
        if (empty($fields)) error('No fields to update');

        $vals[] = $id;
        getDb()->prepare("UPDATE memorization_tracking SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }

    if ($method === 'DELETE' && $id) {
        requireRole(['superadmin', 'admin']);
        getDb()->prepare("DELETE FROM memorization_tracking WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== MEMORIZATION CRITERIA =====
if ($resource === 'memorization-criteria') {
    if ($method === 'GET' && !$id) {
        $stmt = getDb()->query("SELECT * FROM memorization_criteria ORDER BY sort_order, id");
        json($stmt->fetchAll());
    }
    if ($method === 'GET' && $id) {
        $stmt = getDb()->prepare("SELECT * FROM memorization_criteria WHERE id = ?");
        $stmt->execute([$id]);
        json($stmt->fetch() ?: null);
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin']);
        $code = trim($body['code'] ?? '');
        $label = trim($body['label'] ?? '');
        if ($code === '' || $label === '') error('code and label are required', 400);
        $maxScore = isset($body['maxScore']) ? (int)$body['maxScore'] : 100;
        $weight = isset($body['weight']) ? (int)$body['weight'] : 1;
        $sortOrder = isset($body['sortOrder']) ? (int)$body['sortOrder'] : 0;
        $active = isset($body['active']) ? (bool)$body['active'] : true;
        $stmt = getDb()->prepare("INSERT INTO memorization_criteria (code, label, max_score, weight, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$code, $label, $maxScore, $weight, $sortOrder, $active ? 1 : 0]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireRole(['superadmin', 'admin']);
        $fields = []; $vals = [];
        if (array_key_exists('code', $body)) { $fields[] = "code = ?"; $vals[] = trim($body['code']); }
        if (array_key_exists('label', $body)) { $fields[] = "label = ?"; $vals[] = trim($body['label']); }
        if (array_key_exists('maxScore', $body)) { $fields[] = "max_score = ?"; $vals[] = (int)$body['maxScore']; }
        if (array_key_exists('weight', $body)) { $fields[] = "weight = ?"; $vals[] = (int)$body['weight']; }
        if (array_key_exists('sortOrder', $body)) { $fields[] = "sort_order = ?"; $vals[] = (int)$body['sortOrder']; }
        if (array_key_exists('active', $body)) { $fields[] = "active = ?"; $vals[] = (bool)$body['active'] ? 1 : 0; }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE memorization_criteria SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        requireRole(['superadmin', 'admin']);
        getDb()->prepare("DELETE FROM memorization_criteria WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== CURRICULUM TOPICS =====
if ($resource === 'curriculum-topics') {
    if ($method === 'GET' && !$id) {
        try {
            $stmt = getDb()->query("SELECT * FROM curriculum_topics ORDER BY id");
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            // Production fallback for legacy/incomplete schemas.
            try {
                $tableStmt = getDb()->query("SHOW TABLES LIKE 'curriculum_topics'");
                if (!$tableStmt->fetch()) {
                    json([]);
                }

                $colStmt = getDb()->query("SHOW COLUMNS FROM curriculum_topics");
                $columns = [];
                foreach ($colStmt->fetchAll() as $c) {
                    $columns[$c['Field']] = true;
                }

                $select = [];
                $select[] = isset($columns['id']) ? "id" : "NULL AS id";
                $select[] = isset($columns['category']) ? "category" : "'ilmihal' AS category";
                $select[] = isset($columns['title']) ? "title" : "'' AS title";
                $select[] = isset($columns['sub_topics']) ? "sub_topics" : "'[]' AS sub_topics";
                $select[] = isset($columns['active']) ? "active" : "1 AS active";

                $orderBy = isset($columns['id']) ? "id" : "title";
                $fallbackSql = "SELECT " . implode(', ', $select) . " FROM curriculum_topics ORDER BY " . $orderBy;
                $stmt = getDb()->query($fallbackSql);
                $rows = $stmt->fetchAll();
            } catch (PDOException $fallbackError) {
                $rows = [];
            }
        }

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
        $subTopicRequired = strtolower((string)getSystemSetting('sub_topic_required', 'false')) === 'true';
        if ($subTopicRequired && empty($body['subTopic'])) {
            http_response_code(422);
            json(['error' => 'Alt konu zorunludur']);
        }
        $stmt = getDb()->prepare("INSERT INTO lesson_logs (student_id, date, category, topic, sub_topic, notes, author, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $user = getAuthUser();
        $stmt->execute([$body['studentId'], $body['date'], $body['category'], $body['topic'], $body['subTopic'] ?? null, $body['notes'] ?? '', $body['author'] ?? $user['full_name'] ?? '', $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM lesson_logs WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== SYSTEM SETTINGS =====
if ($resource === 'system-settings') {
    $settingKey = $parts[1] ?? null;
    if ($method === 'GET') {
        if ($settingKey) {
            json(['key' => $settingKey, 'value' => getSystemSetting($settingKey)]);
        } else {
            $stmt = getDb()->prepare("SELECT `key`, `value` FROM system_settings");
            $stmt->execute();
            json($stmt->fetchAll());
        }
    }
    if ($method === 'PUT' && $settingKey) {
        requireRole(['superadmin', 'admin']);
        setSystemSetting($settingKey, $body['value'] ?? '');
        json(['key' => $settingKey, 'value' => $body['value']]);
    }
}

// ===== TEACHER LESSONS (Course Schedules) =====
if ($resource === 'teacher-lessons') {
    if ($method === 'GET') {
        $teacherId = $_GET['teacherId'] ?? null;
        $params = [];
        try {
            $sql = "SELECT cs.id, cs.course_id as lesson_id, cs.teacher_id, c.name as lesson_name, u.full_name as teacher_name FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN users u ON cs.teacher_id = u.id WHERE 1=1";
            if ($teacherId) { $sql .= " AND cs.teacher_id = ?"; $params[] = $teacherId; }
            $stmt = getDb()->prepare($sql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            try {
                $params = [];
                $sql = "SELECT cs.id, cs.course_id as lesson_id, cs.teacher_id, c.name as lesson_name, NULL as teacher_name FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id WHERE 1=1";
                if ($teacherId) { $sql .= " AND cs.teacher_id = ?"; $params[] = $teacherId; }
                $stmt = getDb()->prepare($sql);
                $stmt->execute($params);
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                json([]);
            }
        }
    }
    if ($method === 'POST' && !$id) {
        $stmt = getDb()->prepare("INSERT INTO course_schedules (course_id, teacher_id) VALUES (?, ?)");
        $stmt->execute([$body['lessonId'], $body['teacherId']]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        getDb()->prepare("DELETE FROM course_schedules WHERE id = ?")->execute([$id]);
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

    $safeCount = function ($sql, $params = []) {
        try {
            $stmt = getDb()->prepare($sql);
            $stmt->execute($params);
            return (int)$stmt->fetchColumn();
        } catch (PDOException $e) {
            return 0;
        }
    };

    $safeRows = function ($sql, $params = []) {
        try {
            $stmt = getDb()->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    };

    $stats = [];
    $stats['totalStudents'] = $safeCount("SELECT COUNT(*) FROM students");
    $stats['totalSchools'] = $safeCount("SELECT COUNT(*) FROM schools WHERE active = TRUE");
    $stats['totalLessons'] = $safeCount("SELECT COUNT(*) FROM courses WHERE active = TRUE");
    $stats['totalGroups'] = $safeCount("SELECT COUNT(*) FROM class_rooms WHERE active = TRUE");
    $stats['todayAttendance'] = $safeCount("SELECT COUNT(*) FROM attendance WHERE date = ? AND status = 'present'", [date('Y-m-d')]);
    $stats['gradeDistribution'] = $safeRows("SELECT grade, COUNT(*) as count FROM students GROUP BY grade ORDER BY count DESC");
    $stats['cityDistribution'] = $safeRows("SELECT city, COUNT(*) as count FROM students GROUP BY city ORDER BY count DESC LIMIT 10");
    json($stats);
}

// ===== 404 =====
http_response_code(404);
json(['error' => 'Endpoint not found', 'resource' => $resource, 'method' => $method]);
?>

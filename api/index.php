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

// Keep production GET flows resilient when hosting DB schema/permissions differ.
set_exception_handler(function (Throwable $e) use ($method) {
    if ($e instanceof PDOException && $method === 'GET') {
        http_response_code(200);
        json([]);
    }

    http_response_code(500);
    json(['error' => 'Internal Server Error']);
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
            INDEX idx_parent_user_id (parent_user_id),
            INDEX idx_student_id (student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (PDOException $e) {
        // Keep runtime resilient even if CREATE privilege is not granted.
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
        $username = trim((string)($body['username'] ?? ''));
        $fullName = trim((string)($body['fullName'] ?? ''));
        if ($username === '' || $fullName === '') error('username and fullName are required', 400);

        $hash = password_hash($body['password'] ?? '123456', PASSWORD_BCRYPT);

        try {
            $stmt = getDb()->prepare("INSERT INTO users (username, password, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$username, $hash, $fullName, $body['email'] ?? null, $body['phone'] ?? null, $body['role'] ?? 'teacher']);
            json(['id' => (int)getDb()->lastInsertId()]);
        } catch (PDOException $e) {
            // Fallback for legacy schemas with fewer columns.
            try {
                $colStmt = getDb()->query("SHOW COLUMNS FROM users");
                $columns = [];
                foreach ($colStmt->fetchAll() as $c) {
                    $columns[$c['Field']] = true;
                }

                $insertCols = [];
                $insertVals = [];

                if (isset($columns['username'])) { $insertCols[] = 'username'; $insertVals[] = $username; }
                if (isset($columns['password'])) { $insertCols[] = 'password'; $insertVals[] = $hash; }
                if (isset($columns['full_name'])) { $insertCols[] = 'full_name'; $insertVals[] = $fullName; }
                if (isset($columns['email'])) { $insertCols[] = 'email'; $insertVals[] = $body['email'] ?? null; }
                if (isset($columns['phone'])) { $insertCols[] = 'phone'; $insertVals[] = $body['phone'] ?? null; }
                if (isset($columns['role'])) { $insertCols[] = 'role'; $insertVals[] = $body['role'] ?? 'teacher'; }
                if (isset($columns['active'])) { $insertCols[] = 'active'; $insertVals[] = 1; }

                if (count($insertCols) < 3) error('Users table is missing required columns', 500);

                $placeholders = implode(', ', array_fill(0, count($insertCols), '?'));
                $sql = "INSERT INTO users (" . implode(', ', $insertCols) . ") VALUES (" . $placeholders . ")";
                $stmt = getDb()->prepare($sql);
                $stmt->execute($insertVals);
                json(['id' => (int)getDb()->lastInsertId()]);
            } catch (PDOException $fallbackError) {
                if ($fallbackError->getCode() === '23000') {
                    error('Username already exists', 409);
                }
                error('Failed to create user: ' . $fallbackError->getMessage(), 400);
            }
        }
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
        foreach ($rows as &$row) { $row['lessons'] = json_decode($row['lessons'] ?? '[]', true) ?: []; $row['assigned_surveys'] = json_decode($row['assigned_surveys'] ?? '[]', true) ?: []; }
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

        if (array_key_exists('lessons', $body)) {
            $fields[] = "lessons = ?";
            $vals[] = json_encode($body['lessons'] ?? []);
        }

        if (array_key_exists('birthYear', $body)) {
            $birthYear = is_numeric($body['birthYear']) ? (int)$body['birthYear'] : null;
            $fields[] = "age = ?";
            $vals[] = $birthYear ? (int)date('Y') - $birthYear : null;
        } elseif (array_key_exists('age', $body)) {
            $fields[] = "age = ?";
            $vals[] = is_numeric($body['age']) ? (int)$body['age'] : null;
        }

        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        $stmt = getDb()->prepare("UPDATE students SET " . implode(', ', $fields) . " WHERE id = ?");
        try {
            $stmt->execute($vals);
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

// ===== LESSONS =====
if ($resource === 'lessons') {
    if ($method === 'GET' && !$id) {
        try {
            $stmt = getDb()->query("SELECT l.*, u.full_name as teacher_name FROM lessons l LEFT JOIN users u ON l.teacher_id = u.id ORDER BY l.id");
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            try {
                $stmt = getDb()->query("SELECT l.*, NULL as teacher_name FROM lessons l ORDER BY l.id");
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                error('Failed to fetch lessons: ' . $fallbackError->getMessage(), 500);
            }
        }
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
        $params = [];

        // Primary query includes lesson_name. Some older production schemas may not
        // have compatible lesson relation/columns yet; fallback keeps endpoint alive.
        try {
            $sql = "SELECT a.*, s.first_name, s.last_name, l.name as lesson_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN lessons l ON a.lesson_id = l.id WHERE 1=1";
            if ($studentId) { $sql .= " AND a.student_id = ?"; $params[] = $studentId; }
            if ($date) { $sql .= " AND a.date = ?"; $params[] = $date; }
            $sql .= " ORDER BY a.id DESC";
            $stmt = getDb()->prepare($sql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            $params = [];
            $fallbackSql = "SELECT a.*, s.first_name, s.last_name, NULL as lesson_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id WHERE 1=1";
            if ($studentId) { $fallbackSql .= " AND a.student_id = ?"; $params[] = $studentId; }
            if ($date) { $fallbackSql .= " AND a.date = ?"; $params[] = $date; }
            $fallbackSql .= " ORDER BY a.id DESC";
            $stmt = getDb()->prepare($fallbackSql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        }
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

                // MariaDB compatibility: compare JSON-array-like strings via FIND_IN_SET.
                $sql = "SELECT COUNT(*)
                                FROM students s
                                LEFT JOIN class_rooms cr ON cr.id = s.group_id
                                WHERE s.id = ?
                                    AND (
                                        EXISTS (
                                            SELECT 1
                                            FROM teacher_lessons tl
                                            WHERE tl.teacher_id = ?
                                                AND FIND_IN_SET(
                                                            CAST(tl.lesson_id AS CHAR),
                                                            REPLACE(REPLACE(REPLACE(COALESCE(s.lessons, '[]'), '[', ''), ']', ''), ' ', '')
                                                        ) > 0
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
        $status = $body['status'] ?? 'not_completed';
        $teacherNote = $body['teacherNote'] ?? '';
        $allowedStatuses = ['completed', 'repeat', 'not_completed'];

        if ($studentId <= 0 || $textId <= 0) error('studentId and textId are required', 400);
        if (!in_array($status, $allowedStatuses, true)) error('Invalid status', 400);
        if (!$canAccessStudent($studentId)) error('Forbidden', 403);

        $sql = "INSERT INTO memorization_tracking (student_id, text_id, status, teacher_note, checked_by, checked_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  status = VALUES(status),
                  teacher_note = VALUES(teacher_note),
                  checked_by = VALUES(checked_by),
                  checked_at = NOW()";
        $stmt = getDb()->prepare($sql);
        $stmt->execute([$studentId, $textId, $status, $teacherNote, $user['id'] ?? null]);

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
            $allowedStatuses = ['completed', 'repeat', 'not_completed'];
            if (!in_array($body['status'], $allowedStatuses, true)) error('Invalid status', 400);
            $fields[] = "status = ?"; $vals[] = $body['status'];
            $fields[] = "checked_at = NOW()";
            $fields[] = "checked_by = ?"; $vals[] = $user['id'] ?? null;
        }
        if (array_key_exists('teacherNote', $body)) { $fields[] = "teacher_note = ?"; $vals[] = $body['teacherNote']; }
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
        $params = [];
        try {
            $sql = "SELECT tl.*, l.name as lesson_name, u.full_name as teacher_name FROM teacher_lessons tl LEFT JOIN lessons l ON tl.lesson_id = l.id LEFT JOIN users u ON tl.teacher_id = u.id WHERE 1=1";
            if ($teacherId) { $sql .= " AND tl.teacher_id = ?"; $params[] = $teacherId; }
            $stmt = getDb()->prepare($sql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            try {
                $params = [];
                $sql = "SELECT tl.*, NULL as lesson_name, NULL as teacher_name FROM teacher_lessons tl WHERE 1=1";
                if ($teacherId) { $sql .= " AND tl.teacher_id = ?"; $params[] = $teacherId; }
                $stmt = getDb()->prepare($sql);
                $stmt->execute($params);
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                json([]);
            }
        }
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
    $stats['totalLessons'] = $safeCount("SELECT COUNT(*) FROM lessons WHERE active = TRUE");
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

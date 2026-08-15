
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
require_once __DIR__ . '/config/mail.php';

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

// Allow non-numeric sub-routes (e.g. memorization-tracking/summary, memorization-tracking/batch).
if ($resource === 'memorization-tracking' && isset($parts[1]) && in_array($parts[1], ['summary', 'batch'], true)) {
    $id = $parts[1];
}
if ($resource === 'student-reports' && isset($parts[1]) && $parts[1] === 'bulk-mail') {
    $id = 'bulk-mail';
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
    $schoolId = isset($body['schoolId']) && is_numeric($body['schoolId']) ? (int)$body['schoolId'] : null;
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
        'schoolId' => $schoolId,
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

function requireStudentInSchool($studentId, $user) {
    if (in_array($user['role'], ['superadmin', 'parent'], true)) {
        requireStudentNotArchived($studentId);
        return;
    }
    $schoolId = $user['school_id'] ?? null;
    if ($schoolId === null) error('Forbidden: no school assigned', 403);
    if (!$studentId || !is_numeric($studentId)) error('Invalid studentId', 400);
    $stmt = getDb()->prepare("SELECT id FROM students WHERE id = ? AND school_id = ?");
    $stmt->execute([(int)$studentId, $schoolId]);
    if (!$stmt->fetch()) error('Forbidden: student not in your school', 403);
    requireStudentNotArchived($studentId);
}

function requireStudentNotArchived($studentId) {
    if (!$studentId || !is_numeric($studentId)) return;
    $stmt = getDb()->prepare("SELECT archived FROM students WHERE id = ?");
    $stmt->execute([(int)$studentId]);
    $row = $stmt->fetch();
    if ($row && !empty($row['archived'])) {
        error('Student is archived', 403);
    }
}

function safeQuery($sql, $params = []) {
    try {
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        return [];
    }
}

function memorizationStatusLabel($status) {
    $labels = [
        'passed' => 'Geçti',
        'failed' => 'Kaldı',
        'repeat_tecvid' => 'Tekrar (Tecvid)',
        'repeat_harf' => 'Tekrar (Harf)',
        'not_appointment' => 'Randevulu Değil',
        'home_work' => 'Ev Çalışması',
    ];
    return $labels[$status] ?? $status;
}

function getPhoneEmailMatchedStudentIds($phone, $email) {
    $conds = [];
    $params = [];
    $phone = trim((string)$phone);
    $email = trim((string)$email);
    if ($phone !== '') { $conds[] = "parent_phone = ?"; $params[] = $phone; }
    if ($email !== '') { $conds[] = "email = ?"; $params[] = $email; }
    if (empty($conds)) return [];
    $stmt = getDb()->prepare("SELECT id FROM students WHERE (" . implode(' OR ', $conds) . ") AND archived = 0");
    $stmt->execute($params);
    return array_map('intval', array_column($stmt->fetchAll(), 'id'));
}

function getActiveParentStudentConflict($studentIds, $excludeUserId = null) {
    if (empty($studentIds)) return null;
    ensureParentStudentLinksTable();
    $placeholders = implode(',', array_fill(0, count($studentIds), '?'));
    $params = $studentIds;
    $sql = "SELECT psl.student_id, u.id as parent_id, u.full_name as parent_name, s.first_name, s.last_name 
            FROM parent_student_links psl 
            JOIN users u ON psl.parent_user_id = u.id 
            JOIN students s ON psl.student_id = s.id 
            WHERE psl.student_id IN ($placeholders) AND u.active = TRUE";
    if ($excludeUserId) { $sql .= " AND u.id != ?"; $params[] = (int)$excludeUserId; }
    $stmt = getDb()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch() ?: null;
}

function buildStudentReportMail($student, $groupName) {
    $db = getDb();
    $studentId = (int)$student['id'];
    $fullName = trim(($student['first_name'] ?? '') . ' ' . ($student['last_name'] ?? ''));
    $schoolName = $student['school_name'] ?? '-';
    $groupName = $groupName ?? ($student['group_name'] ?? '-');

    $lessonsRows = safeQuery("SELECT c.name FROM courses c JOIN student_courses sc ON c.id = sc.course_id WHERE sc.student_id = ?", [$studentId]);
    $lessons = $lessonsRows ? implode(', ', array_column($lessonsRows, 'name')) : '-';

    $progress = null;
    try {
        $stmt = $db->prepare("SELECT * FROM progress WHERE student_id = ? ORDER BY date DESC LIMIT 1");
        $stmt->execute([$studentId]);
        $progress = $stmt->fetch();
    } catch (PDOException $e) {
        $progress = null;
    }

    $attRows = safeQuery("SELECT status, COUNT(*) as cnt FROM attendance WHERE student_id = ? GROUP BY status", [$studentId]);
    $attCounts = [];
    foreach ($attRows as $r) { $attCounts[$r['status']] = (int)$r['cnt']; }
    $attTotal = array_sum($attCounts);
    $attPresent = $attCounts['present'] ?? 0;
    $attExcused = $attCounts['excused'] ?? 0;
    $attLate = $attCounts['late'] ?? 0;
    $attAbsent = $attCounts['absent'] ?? 0;

    $comments = safeQuery("SELECT created_at, content FROM comments WHERE student_id = ? ORDER BY created_at DESC LIMIT 3", [$studentId]);
    $homeworks = safeQuery("SELECT title, content, completed FROM homework_assignments WHERE student_id = ? ORDER BY created_at DESC", [$studentId]);
    $memorization = safeQuery("SELECT mt.status, mt.teacher_note, mtxt.title as text_title FROM memorization_tracking mt LEFT JOIN memorization_texts mtxt ON mt.text_id = mtxt.id WHERE mt.student_id = ? ORDER BY mt.checked_at DESC, mt.updated_at DESC LIMIT 10", [$studentId]);
    $lessonLogs = safeQuery("SELECT date, category, topic, sub_topic, notes FROM lesson_logs WHERE student_id = ? ORDER BY date DESC LIMIT 20", [$studentId]);
    $storedReport = null;
    try {
        $stmt = $db->prepare("SELECT * FROM student_reports WHERE student_id = ? ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$studentId]);
        $storedReport = $stmt->fetch();
    } catch (PDOException $e) {
        $storedReport = null;
    }

    $fmt = function ($v) { return $v !== null && $v !== '' ? $v : '-'; };
    $dateFmt = function ($d) { return $d ? date('d.m.Y', strtotime($d)) : '-'; };
    $esc = function ($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); };

    $textLines = [];
    $textLines[] = "Merhaba Sayın Velimiz,";
    $textLines[] = "";
    $textLines[] = "$fullName isimli öğrencimizin güncel durum raporu aşağıdadır.";
    $textLines[] = "";
    $textLines[] = "--- Öğrenci Bilgileri ---";
    $textLines[] = "Ad Soyad: $fullName";
    $textLines[] = "Okul: $schoolName";
    $textLines[] = "Sınıf / Grup: $groupName";
    $textLines[] = "Dersler: $lessons";
    $textLines[] = "";
    $textLines[] = "--- Öğrenim Durumu ---";
    if ($progress) {
        $textLines[] = "Kuran: Mevcut sayfa " . $fmt($progress['kuran_current_page']) . " / Hedef " . $fmt($progress['kuran_target_page']) . " (Çalışılan: " . $fmt($progress['kuran_pages']) . ")";
        $textLines[] = "Risale: Mevcut sayfa " . $fmt($progress['risale_current_page']) . " / Hedef " . $fmt($progress['risale_target_page']) . " (Çalışılan: " . $fmt($progress['risale_pages']) . ")";
        $textLines[] = "Elifba: Mevcut sayfa " . $fmt($progress['elifba_current_page']) . " / Hedef " . $fmt($progress['elifba_target_page']) . " (Çalışılan: " . $fmt($progress['elifba_pages']) . ")";
        if (!empty($progress['notes'])) {
            $textLines[] = "Not: " . $progress['notes'];
        }
    } else {
        $textLines[] = "Henüz öğrenim durumu kaydı bulunmamaktadır.";
    }
    $textLines[] = "";
    $textLines[] = "--- Yoklama Özeti ---";
    $textLines[] = "Toplam: $attTotal | Geldi: $attPresent | Mazeretli: $attExcused | Geç: $attLate | Gelmedi: $attAbsent";
    $textLines[] = "";
    $textLines[] = "--- Öğretmen Yorumları ---";
    if ($comments) {
        foreach ($comments as $c) {
            $textLines[] = "• " . $dateFmt($c['created_at']) . ": " . $c['content'];
        }
    } else {
        $textLines[] = "Henüz yorum eklenmemiş.";
    }
    $textLines[] = "";
    $textLines[] = "--- Ödevler ---";
    if ($homeworks) {
        foreach ($homeworks as $h) {
            $status = !empty($h['completed']) ? 'Tamamlandı' : 'Bekliyor';
            $line = "• " . $h['title'] . " [" . $status . "]";
            if (!empty($h['content'])) $line .= ": " . $h['content'];
            $textLines[] = $line;
        }
    } else {
        $textLines[] = "Aktif ödev bulunmamaktadır.";
    }
    $textLines[] = "";
    $textLines[] = "--- Ezber Durumu ---";
    if ($memorization) {
        foreach ($memorization as $m) {
            $line = "• " . ($m['text_title'] ?? 'Metin') . " [" . memorizationStatusLabel($m['status']) . "]";
            if (!empty($m['teacher_note'])) $line .= " - " . $m['teacher_note'];
            $textLines[] = $line;
        }
    } else {
        $textLines[] = "Henüz ezber kaydı bulunmamaktadır.";
    }
    $textLines[] = "";
    $textLines[] = "--- İşlenen Dersler ---";
    if ($lessonLogs) {
        foreach ($lessonLogs as $l) {
            $line = "• " . $dateFmt($l['date']) . " [" . $l['category'] . "] " . $l['topic'];
            if (!empty($l['sub_topic'])) $line .= " / " . $l['sub_topic'];
            if (!empty($l['notes'])) $line .= " - " . $l['notes'];
            $textLines[] = $line;
        }
    } else {
        $textLines[] = "Henüz ders işleme kaydı bulunmamaktadır.";
    }
    if ($storedReport) {
        $textLines[] = "";
        $textLines[] = "--- Son Rapor Bilgileri ---";
        $textLines[] = "Dönem: " . $fmt($storedReport['report_period']);
        $textLines[] = "Konu: " . $fmt($storedReport['subject']);
        if (!empty($storedReport['strengths'])) $textLines[] = "Güçlü Yönler: " . $storedReport['strengths'];
        if (!empty($storedReport['improvements'])) $textLines[] = "Gelişim Alanları: " . $storedReport['improvements'];
        if (!empty($storedReport['recommendations'])) $textLines[] = "Öneriler: " . $storedReport['recommendations'];
        if (!empty($storedReport['attendance_summary'])) $textLines[] = "Yoklama Özeti (Rapor): " . $storedReport['attendance_summary'];
        if (!empty($storedReport['lesson_data'])) $textLines[] = "Ders Verileri: " . $storedReport['lesson_data'];
        if (!empty($storedReport['notes'])) $textLines[] = "Rapor Notları: " . $storedReport['notes'];
    }
    $textLines[] = "";
    $textLines[] = "Saygılarımızla,";
    $textLines[] = "Mekteb Takip Sistemi";

    $text = implode("\n", $textLines);

    $html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>';
    $html .= 'body{font-family:Arial,sans-serif;line-height:1.5;color:#333}';
    $html .= 'h2{color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:4px}';
    $html .= 'h3{color:#1d4ed8;margin:16px 0 8px}';
    $html .= 'table{width:100%;border-collapse:collapse;margin-bottom:16px}';
    $html .= 'td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}';
    $html .= 'th{background:#eff6ff}';
    $html .= 'ul{margin:4px 0;padding-left:20px}';
    $html .= 'li{margin-bottom:4px}';
    $html .= '.muted{color:#64748b}';
    $html .= '</style></head><body>';
    $html .= '<h2>' . $esc($fullName) . ' - Gelişim Raporu</h2>';
    $html .= '<p>Sayın Velimiz,<br>' . $esc($fullName) . ' isimli öğrencimizin güncel durum raporu aşağıdadır.</p>';
    $html .= '<h3>Öğrenci Bilgileri</h3><table>';
    $html .= '<tr><th>Ad Soyad</th><td>' . $esc($fullName) . '</td></tr>';
    $html .= '<tr><th>Okul</th><td>' . $esc($schoolName) . '</td></tr>';
    $html .= '<tr><th>Sınıf / Grup</th><td>' . $esc($groupName) . '</td></tr>';
    $html .= '<tr><th>Dersler</th><td>' . $esc($lessons) . '</td></tr>';
    $html .= '</table>';
    $html .= '<h3>Öğrenim Durumu</h3>';
    if ($progress) {
        $html .= '<table><tr><th>Kuran</th><td>Mevcut ' . $esc($fmt($progress['kuran_current_page'])) . ' / Hedef ' . $esc($fmt($progress['kuran_target_page'])) . ' (Çalışılan ' . $esc($fmt($progress['kuran_pages'])) . ')</td></tr>';
        $html .= '<tr><th>Risale</th><td>Mevcut ' . $esc($fmt($progress['risale_current_page'])) . ' / Hedef ' . $esc($fmt($progress['risale_target_page'])) . ' (Çalışılan ' . $esc($fmt($progress['risale_pages'])) . ')</td></tr>';
        $html .= '<tr><th>Elifba</th><td>Mevcut ' . $esc($fmt($progress['elifba_current_page'])) . ' / Hedef ' . $esc($fmt($progress['elifba_target_page'])) . ' (Çalışılan ' . $esc($fmt($progress['elifba_pages'])) . ')</td></tr></table>';
        if (!empty($progress['notes'])) {
            $html .= '<p class="muted">Not: ' . nl2br($esc($progress['notes'])) . '</p>';
        }
    } else {
        $html .= '<p>Henüz öğrenim durumu kaydı bulunmamaktadır.</p>';
    }
    $html .= '<h3>Yoklama Özeti</h3><p>Toplam: <strong>' . $attTotal . '</strong> | Geldi: ' . $attPresent . ' | Mazeretli: ' . $attExcused . ' | Geç: ' . $attLate . ' | Gelmedi: ' . $attAbsent . '</p>';
    $html .= '<h3>Öğretmen Yorumları</h3>';
    if ($comments) {
        $html .= '<ul>';
        foreach ($comments as $c) {
            $html .= '<li><strong>' . $dateFmt($c['created_at']) . '</strong>: ' . nl2br($esc($c['content'])) . '</li>';
        }
        $html .= '</ul>';
    } else {
        $html .= '<p>Henüz yorum eklenmemiş.</p>';
    }
    $html .= '<h3>Ödevler</h3>';
    if ($homeworks) {
        $html .= '<ul>';
        foreach ($homeworks as $h) {
            $status = !empty($h['completed']) ? 'Tamamlandı' : 'Bekliyor';
            $html .= '<li><strong>' . $esc($h['title']) . '</strong> <span class="muted">[' . $status . ']</span>';
            if (!empty($h['content'])) $html .= '<br>' . nl2br($esc($h['content']));
            $html .= '</li>';
        }
        $html .= '</ul>';
    } else {
        $html .= '<p>Aktif ödev bulunmamaktadır.</p>';
    }
    $html .= '<h3>Ezber Durumu</h3>';
    if ($memorization) {
        $html .= '<ul>';
        foreach ($memorization as $m) {
            $html .= '<li><strong>' . $esc($m['text_title'] ?? 'Metin') . '</strong> <span class="muted">[' . memorizationStatusLabel($m['status']) . ']</span>';
            if (!empty($m['teacher_note'])) $html .= '<br>' . nl2br($esc($m['teacher_note']));
            $html .= '</li>';
        }
        $html .= '</ul>';
    } else {
        $html .= '<p>Henüz ezber kaydı bulunmamaktadır.</p>';
    }
    $html .= '<h3>İşlenen Dersler</h3>';
    if ($lessonLogs) {
        $html .= '<ul>';
        foreach ($lessonLogs as $l) {
            $html .= '<li><strong>' . $dateFmt($l['date']) . '</strong> <span class="muted">[' . $esc($l['category']) . ']</span> ' . $esc($l['topic']);
            if (!empty($l['sub_topic'])) $html .= ' / ' . $esc($l['sub_topic']);
            if (!empty($l['notes'])) $html .= '<br>' . nl2br($esc($l['notes']));
            $html .= '</li>';
        }
        $html .= '</ul>';
    } else {
        $html .= '<p>Henüz ders işleme kaydı bulunmamaktadır.</p>';
    }
    if ($storedReport) {
        $html .= '<h3>Son Rapor Bilgileri</h3><table>';
        $html .= '<tr><th>Dönem</th><td>' . $esc($fmt($storedReport['report_period'])) . '</td></tr>';
        $html .= '<tr><th>Konu</th><td>' . $esc($fmt($storedReport['subject'])) . '</td></tr>';
        if (!empty($storedReport['strengths'])) $html .= '<tr><th>Güçlü Yönler</th><td>' . nl2br($esc($storedReport['strengths'])) . '</td></tr>';
        if (!empty($storedReport['improvements'])) $html .= '<tr><th>Gelişim Alanları</th><td>' . nl2br($esc($storedReport['improvements'])) . '</td></tr>';
        if (!empty($storedReport['recommendations'])) $html .= '<tr><th>Öneriler</th><td>' . nl2br($esc($storedReport['recommendations'])) . '</td></tr>';
        if (!empty($storedReport['attendance_summary'])) $html .= '<tr><th>Yoklama Özeti</th><td>' . nl2br($esc($storedReport['attendance_summary'])) . '</td></tr>';
        if (!empty($storedReport['lesson_data'])) $html .= '<tr><th>Ders Verileri</th><td>' . nl2br($esc($storedReport['lesson_data'])) . '</td></tr>';
        if (!empty($storedReport['notes'])) $html .= '<tr><th>Rapor Notları</th><td>' . nl2br($esc($storedReport['notes'])) . '</td></tr>';
        $html .= '</table>';
    }
    $html .= '<p class="muted">Saygılarımızla,<br>Mekteb Takip Sistemi</p>';
    $html .= '</body></html>';

    return [$text, $html];
}

// ===== AUTH =====
if ($resource === 'auth') {
    $action = $parts[1] ?? '';

    if ($action === 'login' && $method === 'POST') {
        $identifier = $body['username'] ?? $body['identifier'] ?? '';
        $password = $body['password'] ?? '';
        $approvalWhere = usersApprovalWhereSql();
        $stmt = getDb()->prepare("SELECT * FROM users WHERE (username = ? OR email = ? OR phone = ?) AND active = TRUE{$approvalWhere} LIMIT 1");
        $stmt->execute([$identifier, $identifier, $identifier]);
        $user = $stmt->fetch();
        if (!$user) error('Invalid credentials', 401);
        // Check bcrypt or plain password (for demo)
        $valid = password_verify($password, $user['password']);
        if (!$valid && $user['password'] === $password) $valid = true;
        if (!$valid) error('Invalid credentials', 401);

        // Prevent a parent from logging in if any phone-matched student is already linked to another active parent.
        if ($user['role'] === 'parent') {
            $matchedIds = getPhoneEmailMatchedStudentIds($user['phone'], '');
            $conflict = getActiveParentStudentConflict($matchedIds, (int)$user['id']);
            if ($conflict) {
                $studentName = trim(($conflict['first_name'] ?? '') . ' ' . ($conflict['last_name'] ?? ''));
                error("{$studentName} isimli öğrenci başka bir aktif veliye ({$conflict['parent_name']}) atanmış. Lütfen yönetici ile iletişime geçin.", 403);
            }
        }

        $token = JWT::encode(['sub' => $user['id'], 'username' => $user['username'], 'role' => $user['role'], 'schoolId' => $user['school_id']]);
        $linkedStudentIds = $user['role'] === 'parent' ? getParentLinkedStudentIds((int)$user['id']) : [];
        json(['token' => $token, 'user' => [
            'id' => $user['id'], 'username' => $user['username'],
            'fullName' => $user['full_name'], 'email' => $user['email'],
            'phone' => $user['phone'], 'role' => $user['role'],
            'schoolId' => $user['school_id'] ? (int)$user['school_id'] : null,
            'linkedStudentIds' => $linkedStudentIds,
            'active' => (bool)$user['active'],
            'approved' => isset($user['approved']) ? (bool)$user['approved'] : true,
        ]]);
    }

    if ($action === 'register-parent' && $method === 'POST') {
        $username = trim((string)($body['username'] ?? ''));
        $fullName = trim((string)($body['fullName'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($username === '' || strlen($username) < 3) error('Kullanıcı adı en az 3 karakter olmalıdır', 400);
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) error('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir', 400);
        if ($fullName === '') error('Ad soyad gereklidir', 400);
        if ($phone === '') error('Telefon numarası gereklidir', 400);
        if ($password === '' || strlen($password) < 6) error('Şifre en az 6 karakter olmalıdır', 400);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) error('Geçersiz e-posta adresi', 400);

        ensureUserUnique('username', $username);
        if ($email !== '') {
            ensureUserUnique('email', $email);
        }

        ensureParentStudentLinksTable();

        $autoActivate = false;
        $matchedStudents = [];
        if ($phone !== '') {
            $stmt = getDb()->prepare("SELECT id FROM students WHERE parent_phone = ? AND archived = 0");
            $stmt->execute([$phone]);
            $matchedStudents = $stmt->fetchAll();
            if (!empty($matchedStudents)) {
                $matchedIds = array_map('intval', array_column($matchedStudents, 'id'));
                $conflict = getActiveParentStudentConflict($matchedIds);
                $autoActivate = $conflict === null;
            }
        }

        $approvedColumn = usersApprovedColumnExists();
        $columns = "username, password, full_name, email, phone, role, school_id, active";
        $placeholders = "?, ?, ?, ?, ?, ?, ?, ?";
        $values = [
            $username,
            password_hash($password, PASSWORD_BCRYPT),
            $fullName,
            $email !== '' ? $email : null,
            $phone,
            'parent',
            null,
            $autoActivate ? 1 : 0,
        ];
        if ($approvedColumn) {
            $columns .= ", approved";
            $placeholders .= ", ?";
            $values[] = $autoActivate ? 1 : 0;
        }

        $insert = getDb()->prepare("INSERT INTO users ({$columns}) VALUES ({$placeholders})");
        $insert->execute($values);
        $userId = (int)getDb()->lastInsertId();

        if ($autoActivate && !empty($matchedStudents)) {
            $linkStmt = getDb()->prepare("INSERT IGNORE INTO parent_student_links (parent_user_id, student_id) VALUES (?, ?)");
            foreach ($matchedStudents as $st) {
                $linkStmt->execute([$userId, $st['id']]);
            }
        }

        if ($autoActivate) {
            $newUser = ['id' => $userId, 'username' => $username, 'full_name' => $fullName, 'email' => $email, 'phone' => $phone, 'role' => 'parent', 'school_id' => null, 'active' => true];
            if ($approvedColumn) $newUser['approved'] = true;
            $token = JWT::encode(['sub' => $userId, 'username' => $username, 'role' => 'parent', 'schoolId' => null]);
            $linkedStudentIds = getParentLinkedStudentIds($userId);
            json(['token' => $token, 'user' => [
                'id' => $userId, 'username' => $username,
                'fullName' => $fullName, 'email' => $email,
                'phone' => $phone, 'role' => 'parent',
                'schoolId' => null,
                'linkedStudentIds' => $linkedStudentIds,
                'active' => true,
                'approved' => $approvedColumn ? true : null,
            ]]);
        }

        json(['message' => 'Üyeliğiniz onay için alındı. Onaylandıktan sonra giriş yapabilirsiniz.', 'pending' => true, 'matchedStudents' => count($matchedStudents)]);
    }

    if ($action === 'forgot-password' && $method === 'POST') {
        $username = trim((string)($body['username'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        logApiError("Forgot password request: username={$username} email={$email}");
        if ($username === '' || $email === '') {
            error('Kullanıcı adı ve e-posta adresi gereklidir', 400);
        }
        $stmt = getDb()->prepare("SELECT * FROM users WHERE username = ? AND active = TRUE");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            try {
                send_configured_mail([
                    'to' => 'info@mektebtakip.com',
                    'subject' => 'Şifre Sıfırlama Talebi - Kullanıcı Bulunamadı',
                    'text' => "Kullanıcı adı: {$username}\nGirilen e-posta: {$email}\n\nSistemde bu kullanıcı adıyla aktif bir kayıt bulunamadı.",
                    'replyTo' => $email,
                ], null);
                logApiError("Forgot password admin mail sent (user not found): username={$username}");
            } catch (Throwable $e) {
                logApiError('Forgot password admin mail failed (user not found): ' . $e->getMessage());
            }
            json(['message' => 'Bilgileriniz inceleniyor. Uygun durumda size dönüş yapılacaktır.']);
        }

        logApiError("Forgot password user found: id={$user['id']} storedEmail={$user['email']}");

        if (strcasecmp((string)$user['email'], $email) === 0) {
            $newPassword = bin2hex(random_bytes(4));
            try {
                send_configured_mail([
                    'to' => $user['email'],
                    'subject' => 'Yeni Şifreniz',
                    'text' => "Merhaba {$user['full_name']},\n\nYeni şifreniz: {$newPassword}\n\nGiriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.\n\n365 Kuran Kuran Mektebi",
                    'replyTo' => $user['email'],
                ], null);
                $hash = password_hash($newPassword, PASSWORD_BCRYPT);
                $upd = getDb()->prepare("UPDATE users SET password = ? WHERE id = ?");
                $upd->execute([$hash, $user['id']]);
                logApiError("Forgot password user mail sent and password updated: id={$user['id']} recipient={$user['email']}");
                json(['message' => "Yeni şifre {$user['email']} adresine gönderildi."]);
            } catch (Throwable $e) {
                logApiError('Forgot password user mail failed: ' . $e->getMessage());
                error('Şifre sıfırlama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.', 500);
            }
        } else {
            try {
                send_configured_mail([
                    'to' => 'info@mektebtakip.com',
                    'subject' => 'Şifre Sıfırlama Talebi - E-posta Eşleşmedi',
                    'text' => "Kullanıcı adı: {$username}\nGirilen e-posta: {$email}\nSistemdeki e-posta: {$user['email']}\n\nBu bilgiler uyuşmadığı için kullanıcıya şifre gönderilemedi.",
                    'replyTo' => $email,
                ], null);
                logApiError("Forgot password admin mail sent (email mismatch): username={$username}");
            } catch (Throwable $e) {
                logApiError('Forgot password admin mail failed (email mismatch): ' . $e->getMessage());
            }
            json(['message' => 'Bilgileriniz inceleniyor. Uygun durumda size dönüş yapılacaktır.']);
        }
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
        $approvalSelect = usersApprovalSelectSql();
        $pendingOnly = isset($_GET['pending']) && $_GET['pending'] === '1';
        $pendingWhere = '';
        if ($pendingOnly && usersApprovedColumnExists()) {
            $pendingWhere = ' AND approved = FALSE';
        } elseif ($pendingOnly) {
            $pendingWhere = ' AND active = FALSE';
        }

        if ($user['role'] === 'superadmin') {
            $stmt = getDb()->query("SELECT id, username, full_name, email, phone, role, school_id, active, created_at{$approvalSelect} FROM users WHERE 1=1{$pendingWhere} ORDER BY id");
            json($stmt->fetchAll());
        }
        if (in_array($user['role'], ['admin', 'authorized_teacher'], true)) {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) {
                $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, school_id, active, created_at{$approvalSelect} FROM users WHERE id = ?{$pendingWhere} ORDER BY id");
                $stmt->execute([$user['id']]);
            } else {
                $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, school_id, active, created_at{$approvalSelect} FROM users WHERE (school_id = ? OR id = ? OR role = 'parent'){$pendingWhere} ORDER BY id");
                $stmt->execute([$schoolId, $user['id']]);
            }
            json($stmt->fetchAll());
        }

        // Non-manager users can only see their own record.
        $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, school_id, active, created_at{$approvalSelect} FROM users WHERE id = ?{$pendingWhere}");
        $stmt->execute([$user['id']]);
        json($stmt->fetchAll());
    }

    if ($method === 'GET' && $id) {
        $isOwn = (int)$user['id'] === (int)$id;
        if (!in_array($user['role'], ['superadmin', 'admin', 'authorized_teacher'], true) && !$isOwn) {
            error('Forbidden: only own user record is accessible', 403);
        }
        if (in_array($user['role'], ['admin', 'authorized_teacher'], true) && !$isOwn) {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, school_id, active, created_at FROM users WHERE id = ? AND school_id = ?");
            $stmt->execute([$id, $schoolId]);
            json($stmt->fetch() ?: null);
        } else {
            $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, school_id, active, created_at FROM users WHERE id = ?");
            $stmt->execute([$id]);
            json($stmt->fetch() ?: null);
        }
    }

    requireRole(['superadmin', 'admin', 'authorized_teacher']);

    if ($method === 'POST' && !$id) {
        $v = validateUserPayload($body);
        if (!in_array($user['role'], ['superadmin'], true) && $v['role'] === 'superadmin') {
            error('Forbidden: only superadmin can create superadmin', 403);
        }
        ensureUserUnique('username', $v['username']);
        ensureUserUnique('email', $v['email']);

        $hash = password_hash($v['password'], PASSWORD_BCRYPT);
        $schoolId = $v['schoolId'];
        if (in_array($user['role'], ['admin', 'authorized_teacher'], true)) {
            $schoolId = $user['school_id'];
        }
        $stmt = getDb()->prepare("INSERT INTO users (username, password, full_name, email, phone, role, school_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $v['username'],
            $hash,
            $v['fullName'],
            $v['email'] !== '' ? $v['email'] : null,
            $v['phone'] !== '' ? $v['phone'] : null,
            $v['role'] !== '' ? $v['role'] : 'teacher',
            $schoolId,
            $v['active'] ? 1 : 0,
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $v = validateUserPayload($body, true);
        ensureUserUnique('username', $v['username'], $id);
        ensureUserUnique('email', $v['email'], $id);

        // Managers can only update users within their own school.
        if (in_array($user['role'], ['admin', 'authorized_teacher'], true)) {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $check = getDb()->prepare("SELECT id FROM users WHERE id = ? AND school_id = ?");
            $check->execute([$id, $schoolId]);
            if (!$check->fetch()) error('Forbidden: user not in your school', 403);
            if (isset($body['role']) && $body['role'] === 'superadmin') {
                error('Forbidden: only superadmin can promote to superadmin', 403);
            }
        }

        $fields = []; $vals = [];
        foreach (['full_name', 'email', 'phone', 'role', 'active'] as $f) {
            $key = $f === 'full_name' ? 'fullName' : ($f === 'active' ? 'active' : $f);
            if (isset($body[$key])) { $fields[] = "$f = ?"; $vals[] = $body[$key]; }
        }
        if (isset($body['schoolId'])) {
            $schoolId = $body['schoolId'];
            if (in_array($user['role'], ['admin', 'authorized_teacher'], true)) {
                $schoolId = $user['school_id'];
            }
            $fields[] = "school_id = ?"; $vals[] = $schoolId;
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
        if (in_array($user['role'], ['admin', 'authorized_teacher'], true)) {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $check = getDb()->prepare("SELECT id FROM users WHERE id = ? AND school_id = ?");
            $check->execute([$id, $schoolId]);
            if (!$check->fetch()) error('Forbidden: user not in your school', 403);
        }
        getDb()->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }

    if ($method === 'POST' && $id && isset($parts[2]) && $parts[2] === 'approve') {
        requireRole(['superadmin']);
        ensureParentStudentLinksTable();
        $approvalColumn = usersApprovedColumnExists();

        $selSql = "SELECT id, username, full_name, email, phone, role, school_id, active" . ($approvalColumn ? ", approved" : "") . " FROM users WHERE id = ?";
        $userStmt = getDb()->prepare($selSql);
        $userStmt->execute([$id]);
        $approvedUser = $userStmt->fetch();
        if (!$approvedUser) error('User not found', 404);

        $matchedIds = getPhoneEmailMatchedStudentIds($approvedUser['phone'], $approvedUser['email']);
        $conflict = getActiveParentStudentConflict($matchedIds, (int)$approvedUser['id']);
        if ($conflict) {
            $studentName = trim(($conflict['first_name'] ?? '') . ' ' . ($conflict['last_name'] ?? ''));
            error("{$studentName} isimli öğrenci başka bir aktif veliye ({$conflict['parent_name']}) atanmış. Önce mevcut velinin bağlantısını kaldırın.", 409);
        }

        $updSql = "UPDATE users SET active = TRUE" . ($approvalColumn ? ", approved = TRUE" : "") . " WHERE id = ?";
        getDb()->prepare($updSql)->execute([$id]);
        $approvedUser['active'] = true;
        if ($approvalColumn) $approvedUser['approved'] = true;

        if (!empty($matchedIds)) {
            $linkStmt = getDb()->prepare("INSERT IGNORE INTO parent_student_links (parent_user_id, student_id) VALUES (?, ?)");
            foreach ($matchedIds as $studentId) {
                $linkStmt->execute([$id, $studentId]);
            }
        }

        json(['message' => 'Kullanıcı onaylandı', 'user' => [
            'id' => (int)$approvedUser['id'],
            'username' => $approvedUser['username'],
            'fullName' => $approvedUser['full_name'],
            'email' => $approvedUser['email'],
            'phone' => $approvedUser['phone'],
            'role' => $approvedUser['role'],
            'schoolId' => $approvedUser['school_id'] ? (int)$approvedUser['school_id'] : null,
            'active' => (bool)$approvedUser['active'],
            'approved' => $approvalColumn ? (bool)$approvedUser['approved'] : true,
        ]]);
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
            if ($user['role'] === 'superadmin') {
                $stmt = getDb()->query("SELECT psl.parent_user_id, psl.student_id FROM parent_student_links psl JOIN students s ON psl.student_id = s.id WHERE s.archived = 0 ORDER BY psl.id");
                json($stmt->fetchAll());
            }
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) json([]);
            $stmt = getDb()->prepare("SELECT psl.parent_user_id, psl.student_id FROM parent_student_links psl JOIN students s ON psl.student_id = s.id WHERE s.school_id = ? AND s.archived = 0 ORDER BY psl.id");
            $stmt->execute([$schoolId]);
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

        if ($user['role'] === 'admin') {
            $check = getDb()->prepare("SELECT id FROM students WHERE id = ? AND school_id = ?");
            $check->execute([$studentId, $user['school_id']]);
            if (!$check->fetch()) error('Forbidden: student not in your school', 403);
            $parentCheck = getDb()->prepare("SELECT id FROM users WHERE id = ? AND (school_id = ? OR role = 'parent')");
            $parentCheck->execute([$parentUserId, $user['school_id']]);
            if (!$parentCheck->fetch()) error('Forbidden: parent not in your school', 403);
        }

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

        if ($user['role'] === 'admin') {
            $check = getDb()->prepare("SELECT id FROM students WHERE id = ? AND school_id = ?");
            $check->execute([$studentId, $user['school_id']]);
            if (!$check->fetch()) error('Forbidden: student not in your school', 403);
        }

        try {
            $stmt = getDb()->prepare("DELETE FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?");
            $stmt->execute([$parentUserId, $studentId]);
            json(['message' => 'Unlinked']);
        } catch (PDOException $e) {
            error('Failed to delete link: ' . $e->getMessage(), 400);
        }
    }
}

// ===== GRID COLUMN PERMISSIONS =====
if ($resource === 'grid-column-permissions') {
    $user = getAuthUser();
    $validRoles = ['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'];

    if ($method === 'GET') {
        try {
            $stmt = getDb()->query("SELECT id, grid_id, column_key, column_label, allowed_roles FROM grid_column_permissions ORDER BY grid_id, column_key");
            $rows = $stmt->fetchAll();
            foreach ($rows as &$row) {
                $row['allowed_roles'] = json_decode($row['allowed_roles'], true) ?: [];
            }
            json($rows);
        } catch (PDOException $e) {
            json([]);
        }
    }

    if ($method === 'PUT' && !$id) {
        requireRole(['superadmin']);
        $gridId = trim((string)($body['gridId'] ?? ''));
        $columnKey = trim((string)($body['columnKey'] ?? ''));
        $columnLabel = trim((string)($body['columnLabel'] ?? $columnKey));
        $allowedRoles = $body['allowedRoles'] ?? null;
        if ($gridId === '' || $columnKey === '') error('gridId and columnKey are required', 400);
        if (!is_array($allowedRoles)) error('allowedRoles array required', 400);
        $filtered = array_values(array_filter($allowedRoles, function ($r) use ($validRoles) { return in_array($r, $validRoles, true); }));
        try {
            $stmt = getDb()->prepare("INSERT INTO grid_column_permissions (grid_id, column_key, column_label, allowed_roles) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE allowed_roles = VALUES(allowed_roles), column_label = VALUES(column_label)");
            $stmt->execute([$gridId, $columnKey, $columnLabel, json_encode($filtered)]);
            json(['message' => 'Updated']);
        } catch (PDOException $e) {
            error('Failed to update grid column permission: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'DELETE' && !$id) {
        requireRole(['superadmin']);
        try {
            getDb()->exec("DELETE FROM grid_column_permissions");
            json(['message' => 'Reset']);
        } catch (PDOException $e) {
            error('Failed to reset grid column permissions: ' . $e->getMessage(), 500);
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

    $archivedFilter = isset($_GET['archived']) ? (int)$_GET['archived'] : 0;
    if ($archivedFilter && !in_array($user['role'] ?? '', ['superadmin', 'admin'], true)) {
        error('Forbidden', 403);
    }

    if ($method === 'GET' && !$id) {
        if ($isParent && empty($parentStudentIds)) {
            json([]);
        }
        $scopedSchoolId = null;
        if (!in_array($user['role'], ['superadmin', 'parent'], true)) {
            $scopedSchoolId = $user['school_id'] ?? null;
            if ($scopedSchoolId === null) json([]);
        }
        try {
            if ($scopedSchoolId !== null) {
                $sql = "SELECT s.*, sc.name as school_name_ref, COALESCE(NULLIF(s.school_name, ''), sc.name) as resolved_school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id WHERE s.school_id = ? AND s.archived = ? ORDER BY s.id DESC";
                $stmt = getDb()->prepare($sql);
                $stmt->execute([$scopedSchoolId, $archivedFilter]);
            } else {
                $sql = "SELECT s.*, sc.name as school_name_ref, COALESCE(NULLIF(s.school_name, ''), sc.name) as resolved_school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id WHERE s.archived = ? ORDER BY s.id DESC";
                $stmt = getDb()->prepare($sql);
                $stmt->execute([$archivedFilter]);
            }
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            // Fallback for legacy schemas where related tables/columns may differ.
            try {
                if ($scopedSchoolId !== null) {
                    $stmt = getDb()->prepare("SELECT s.*, NULL as school_name_ref, s.school_name as resolved_school_name, NULL as group_name FROM students s WHERE s.school_id = ? AND s.archived = ? ORDER BY s.id DESC");
                    $stmt->execute([$scopedSchoolId, $archivedFilter]);
                } else {
                    $stmt = getDb()->prepare("SELECT s.*, NULL as school_name_ref, s.school_name as resolved_school_name, NULL as group_name FROM students s WHERE s.archived = ? ORDER BY s.id DESC");
                    $stmt->execute([$archivedFilter]);
                }
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
        $scopedSchoolId = null;
        if (!in_array($user['role'], ['superadmin', 'parent'], true)) {
            $scopedSchoolId = $user['school_id'] ?? null;
            if ($scopedSchoolId === null) error('Forbidden: no school assigned', 403);
        }
        try {
            if ($scopedSchoolId !== null) {
                $stmt = getDb()->prepare("SELECT s.*, sc.name as school_name_ref, COALESCE(NULLIF(s.school_name, ''), sc.name) as resolved_school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id WHERE s.id = ? AND s.school_id = ?");
                $stmt->execute([$id, $scopedSchoolId]);
            } else {
                $stmt = getDb()->prepare("SELECT s.*, sc.name as school_name_ref, COALESCE(NULLIF(s.school_name, ''), sc.name) as resolved_school_name, cr.name as group_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN class_rooms cr ON s.group_id = cr.id WHERE s.id = ?");
                $stmt->execute([$id]);
            }
            $row = $stmt->fetch();
        } catch (PDOException $e) {
            try {
                if ($scopedSchoolId !== null) {
                    $stmt = getDb()->prepare("SELECT s.*, NULL as school_name_ref, s.school_name as resolved_school_name, NULL as group_name FROM students s WHERE s.id = ? AND s.school_id = ?");
                    $stmt->execute([$id, $scopedSchoolId]);
                } else {
                    $stmt = getDb()->prepare("SELECT s.*, NULL as school_name_ref, s.school_name as resolved_school_name, NULL as group_name FROM students s WHERE s.id = ?");
                    $stmt->execute([$id]);
                }
                $row = $stmt->fetch();
            } catch (PDOException $fallbackError) {
                error('Failed to fetch student: ' . $fallbackError->getMessage(), 500);
            }
        }
        if ($row) { $row['lessons'] = fetchStudentLessons((int)$row['id']); $row['assigned_surveys'] = json_decode($row['assigned_surveys'] ?? '[]', true) ?: []; }
        json($row ?: null);
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin', 'authorized_teacher']);
        $isSuperadmin = ($user['role'] ?? '') === 'superadmin';

        $firstName = trim((string)($body['firstName'] ?? ''));
        $lastName = trim((string)($body['lastName'] ?? ''));
        if ($firstName === '' || $lastName === '') error('First name and last name are required', 400);

        if ($isSuperadmin) {
            $schoolId = isset($body['schoolId']) && is_numeric($body['schoolId']) ? (int)$body['schoolId'] : null;
            if ($schoolId !== null) {
                $s = getDb()->prepare("SELECT id FROM schools WHERE id = ?");
                $s->execute([$schoolId]);
                if (!$s->fetch()) $schoolId = null;
            }
        } else {
            $schoolId = $user['school_id'] ?? null;
        }
        if ($schoolId === null) error('Medrese bilgisi belirlenemedi', 400);

        $groupId = isset($body['groupId']) && is_numeric($body['groupId']) ? (int)$body['groupId'] : null;
        if ($groupId !== null) {
            $g = getDb()->prepare("SELECT id FROM class_rooms WHERE id = ? AND school_id = ?");
            $g->execute([$groupId, $schoolId]);
            if (!$g->fetch()) $groupId = null;
        }

        $validCourseIds = [];
        if (!empty($body['lessons']) && is_array($body['lessons'])) {
            foreach ($body['lessons'] as $courseId) {
                $courseId = is_numeric($courseId) ? (int)$courseId : 0;
                if ($courseId <= 0) continue;
                $c = getDb()->prepare("SELECT id FROM courses WHERE id = ? AND school_id = ?");
                $c->execute([$courseId, $schoolId]);
                if ($c->fetch()) $validCourseIds[] = $courseId;
            }
        }

        $schoolName = '';
        $sNameStmt = getDb()->prepare("SELECT name FROM schools WHERE id = ?");
        $sNameStmt->execute([$schoolId]);
        $schoolRow = $sNameStmt->fetch();
        if ($schoolRow) $schoolName = $schoolRow['name'];

        $stmt = getDb()->prepare("INSERT INTO students (tc_kimlik, first_name, last_name, birth_year, city, school_id, school_name, grade, phone, parent_name, parent_phone, email, group_id, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $birthYear = isset($body['birthYear']) && is_numeric($body['birthYear']) ? (int)$body['birthYear'] : null;
        $age = $birthYear ? (int)date('Y') - $birthYear : null;

        try {
            $stmt->execute([
                $body['tcKimlik'] ?? null, $firstName, $lastName,
                $birthYear, $body['city'] ?? '', $schoolId,
                $schoolName, $body['grade'] ?? '', $body['phone'] ?? '',
                $body['parentName'] ?? '', $body['parentPhone'] ?? '', $body['email'] ?? '',
                $groupId, $age
            ]);
            $studentId = (int)getDb()->lastInsertId();
            if (!empty($validCourseIds)) {
                $ins = getDb()->prepare("INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)");
                foreach ($validCourseIds as $courseId) {
                    $ins->execute([$studentId, $courseId]);
                }
            }
        } catch (PDOException $e) {
            error('Failed to create student: ' . $e->getMessage(), 400);
        }

        json(['id' => $studentId]);
    }
    if ($method === 'PUT' && $id) {
        requireRole(['superadmin', 'admin', 'authorized_teacher']);
        $isSuperadmin = ($user['role'] ?? '') === 'superadmin';

        $existingStmt = getDb()->prepare("SELECT school_id FROM students WHERE id = ?");
        $existingStmt->execute([$id]);
        $existing = $existingStmt->fetch();
        if (!$existing) error('Student not found', 404);
        $currentSchoolId = $existing['school_id'] ?? null;

        if ($isSuperadmin) {
            if (array_key_exists('schoolId', $body)) {
                $schoolId = null;
                if ($body['schoolId'] !== null && $body['schoolId'] !== '') {
                    if (!is_numeric($body['schoolId'])) error('Invalid schoolId', 400);
                    $schoolId = (int)$body['schoolId'];
                    $s = getDb()->prepare("SELECT id FROM schools WHERE id = ?");
                    $s->execute([$schoolId]);
                    if (!$s->fetch()) $schoolId = null;
                }
                if ($schoolId === null) error('Medrese bilgisi belirlenemedi', 400);
            } else {
                $schoolId = $currentSchoolId;
            }
        } else {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null || (int)$currentSchoolId !== (int)$schoolId) {
                error('Forbidden', 403);
            }
        }

        $fields = []; $vals = [];
        $map = [
            'tcKimlik' => 'tc_kimlik', 'firstName' => 'first_name', 'lastName' => 'last_name',
            'birthYear' => 'birth_year', 'city' => 'city',
            'grade' => 'grade', 'phone' => 'phone',
            'parentName' => 'parent_name', 'parentPhone' => 'parent_phone', 'email' => 'email',
            'archived' => 'archived'
        ];
        if (array_key_exists('archived', $body) && !in_array($user['role'] ?? '', ['superadmin', 'admin'], true)) {
            error('Forbidden', 403);
        }
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

        $fields[] = "school_id = ?"; $vals[] = $schoolId;
        $schoolName = '';
        $sNameStmt = getDb()->prepare("SELECT name FROM schools WHERE id = ?");
        $sNameStmt->execute([$schoolId]);
        $schoolRow = $sNameStmt->fetch();
        if ($schoolRow) $schoolName = $schoolRow['name'];
        if ($schoolName !== '') { $fields[] = "school_name = ?"; $vals[] = $schoolName; }

        if (array_key_exists('groupId', $body)) {
            $groupId = null;
            if ($body['groupId'] !== null && $body['groupId'] !== '') {
                if (!is_numeric($body['groupId'])) error('Invalid groupId', 400);
                $groupId = (int)$body['groupId'];
                $g = getDb()->prepare("SELECT id FROM class_rooms WHERE id = ? AND school_id = ?");
                $g->execute([$groupId, $schoolId]);
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
                        if ($courseId <= 0) continue;
                        $c = getDb()->prepare("SELECT id FROM courses WHERE id = ? AND school_id = ?");
                        $c->execute([$courseId, $schoolId]);
                        if ($c->fetch()) $ins->execute([$id, $courseId]);
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
        // Non-superadmin can only assign courses from their own school.
        if ($user['role'] !== 'superadmin') {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $cStmt = getDb()->prepare("SELECT id FROM courses WHERE id = ? AND school_id = ?");
            $cStmt->execute([$courseId, $schoolId]);
            if (!$cStmt->fetch()) error('Forbidden: course not in your school', 403);
        }
        foreach ($studentIds as $sid) {
            requireStudentInSchool($sid, $user);
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
    $user = getAuthUser();
    if ($method === 'GET' && !$id) {
        try {
            if ($user['role'] === 'superadmin') {
                $stmt = getDb()->query("SELECT * FROM schools ORDER BY id");
                json($stmt->fetchAll());
            }
            $allowedSchoolIds = [];
            if (!empty($user['school_id'])) {
                $allowedSchoolIds[] = (int)$user['school_id'];
            }
            if (($user['role'] ?? '') === 'parent') {
                $linkedIds = getParentLinkedStudentIds($user);
                if (!empty($linkedIds)) {
                    $placeholders = implode(',', array_fill(0, count($linkedIds), '?'));
                    $sStmt = getDb()->prepare("SELECT DISTINCT school_id FROM students WHERE id IN ($placeholders) AND school_id IS NOT NULL");
                    $sStmt->execute($linkedIds);
                    foreach ($sStmt->fetchAll() as $r) {
                        $allowedSchoolIds[] = (int)$r['school_id'];
                    }
                }
            }
            $allowedSchoolIds = array_values(array_unique($allowedSchoolIds));
            if (empty($allowedSchoolIds)) {
                json([]);
            }
            $placeholders = implode(',', array_fill(0, count($allowedSchoolIds), '?'));
            $stmt = getDb()->prepare("SELECT * FROM schools WHERE id IN ($placeholders) ORDER BY id");
            $stmt->execute($allowedSchoolIds);
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
        requireRole(['superadmin']);
        $stmt = getDb()->prepare("INSERT INTO schools (name, address, phone, principal_name) VALUES (?, ?, ?, ?)");
        $stmt->execute([$body['name'], $body['address'] ?? '', $body['phone'] ?? '', $body['principalName'] ?? '']);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        if ($user['role'] !== 'superadmin' && (int)$user['school_id'] !== (int)$id) {
            error('Forbidden: can only update your own school', 403);
        }
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
        requireRole(['superadmin']);
        getDb()->prepare("DELETE FROM schools WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== COURSES =====
if ($resource === 'courses') {
    $user = getAuthUser();

    if ($method === 'GET' && !$id) {
        try {
            if ($user['role'] === 'superadmin') {
                $stmt = getDb()->query("SELECT c.*, s.name as school_name FROM courses c LEFT JOIN schools s ON c.school_id = s.id ORDER BY c.name");
            } else {
                $schoolId = $user['school_id'] ?? null;
                if ($schoolId === null) json([]);
                $stmt = getDb()->prepare("SELECT c.*, s.name as school_name FROM courses c LEFT JOIN schools s ON c.school_id = s.id WHERE c.school_id = ? ORDER BY c.name");
                $stmt->execute([$schoolId]);
            }
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            // Fallback for legacy schemas.
            if ($user['role'] === 'superadmin') {
                $stmt = getDb()->query("SELECT * FROM courses ORDER BY name");
            } else {
                $schoolId = $user['school_id'] ?? null;
                if ($schoolId === null) json([]);
                $stmt = getDb()->prepare("SELECT * FROM courses WHERE school_id = ? ORDER BY name");
                $stmt->execute([$schoolId]);
            }
            json($stmt->fetchAll());
        }
    }
    if ($method === 'GET' && $id) {
        if ($user['role'] === 'superadmin') {
            $stmt = getDb()->prepare("SELECT c.*, s.name as school_name FROM courses c LEFT JOIN schools s ON c.school_id = s.id WHERE c.id = ?");
            $stmt->execute([$id]);
        } else {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $stmt = getDb()->prepare("SELECT c.*, s.name as school_name FROM courses c LEFT JOIN schools s ON c.school_id = s.id WHERE c.id = ? AND c.school_id = ?");
            $stmt->execute([$id, $schoolId]);
        }
        json($stmt->fetch() ?: null);
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin']);
        $name = trim($body['name'] ?? '');
        $schoolId = isset($body['schoolId']) && is_numeric($body['schoolId']) ? (int)$body['schoolId'] : null;
        if ($name === '') error('Course name is required', 400);
        if ($schoolId === null) error('schoolId is required', 400);
        getDb()->prepare("INSERT INTO courses (name, description, school_id, active) VALUES (?, ?, ?, ?)")
            ->execute([$name, $body['description'] ?? '', $schoolId, isset($body['active']) ? ($body['active'] ? 1 : 0) : 1]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireRole(['superadmin']);
        $fields = []; $vals = [];
        if (isset($body['name'])) { $fields[] = "name = ?"; $vals[] = trim($body['name']); }
        if (isset($body['description'])) { $fields[] = "description = ?"; $vals[] = $body['description']; }
        if (isset($body['schoolId'])) { $fields[] = "school_id = ?"; $vals[] = is_numeric($body['schoolId']) ? (int)$body['schoolId'] : null; }
        if (isset($body['active'])) { $fields[] = "active = ?"; $vals[] = $body['active'] ? 1 : 0; }
        if (empty($fields)) error('No fields to update');
        $vals[] = $id;
        getDb()->prepare("UPDATE courses SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        requireRole(['superadmin']);
        getDb()->prepare("DELETE FROM courses WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== COURSE SCHEDULES =====
if ($resource === 'course-schedules') {
    $user = getAuthUser();
    if ($method === 'GET' && !$id) {
        try {
            if ($user['role'] === 'superadmin') {
                $stmt = getDb()->query("SELECT cs.*, c.name, c.description FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id ORDER BY c.name, cs.day_of_week, cs.start_time");
            } else {
                $schoolId = $user['school_id'] ?? null;
                if ($schoolId === null) json([]);
                $stmt = getDb()->prepare("SELECT cs.*, c.name, c.description FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN class_rooms cr ON cs.class_room_id = cr.id  WHERE (cr.school_id = ? OR c.school_id = ?) ORDER BY c.name, cs.day_of_week, cs.start_time");
                $stmt->execute([$schoolId, $schoolId]);
            }
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            try {
                if ($user['role'] === 'superadmin') {
                    $stmt = getDb()->query("SELECT cs.*, c.name, c.description FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id ORDER BY c.name, cs.day_of_week, cs.start_time");
                } else {
                    $schoolId = $user['school_id'] ?? null;
                    if ($schoolId === null) json([]);
                    $stmt = getDb()->prepare("SELECT cs.*, c.name, c.description FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN class_rooms cr ON cs.class_room_id = cr.id WHERE (cr.school_id = ? OR c.school_id = ?) ORDER BY c.name, cs.day_of_week, cs.start_time");
                    $stmt->execute([$schoolId, $schoolId]);
                }
                json($stmt->fetchAll());
            } catch (PDOException $fallbackError) {
                error('Failed to fetch course schedules: ' . $fallbackError->getMessage(), 500);
            }
        }
    }
    if ($method === 'GET' && $id) {
        if ($user['role'] === 'superadmin') {
            $stmt = getDb()->prepare("SELECT cs.*, c.name, c.description FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id WHERE cs.id = ?");
            $stmt->execute([$id]);
        } else {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $stmt = getDb()->prepare("SELECT cs.*, c.name, c.description FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN class_rooms cr ON cs.class_room_id = cr.id  WHERE cs.id = ? AND (cr.school_id = ? OR c.school_id = ?)");
            $stmt->execute([$id, $schoolId, $schoolId]);
        }
        json($stmt->fetch() ?: null);
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin']);
        $courseId = isset($body['courseId']) && is_numeric($body['courseId']) ? (int)$body['courseId'] : 0;
        if ($courseId <= 0) error('courseId is required', 400);
        $classRoomId = isset($body['classRoomId']) && is_numeric($body['classRoomId']) ? (int)$body['classRoomId'] : null;

        if ($user['role'] !== 'superadmin') {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $cCheck = getDb()->prepare("SELECT id FROM courses WHERE id = ? AND school_id = ?");
            $cCheck->execute([$courseId, $schoolId]);
            if (!$cCheck->fetch()) error('Forbidden: course not in your school', 403);
            if ($classRoomId !== null) {
                $crCheck = getDb()->prepare("SELECT id FROM class_rooms WHERE id = ? AND school_id = ?");
                $crCheck->execute([$classRoomId, $schoolId]);
                if (!$crCheck->fetch()) error('Forbidden: classroom not in your school', 403);
            }
        }

        getDb()->prepare("INSERT INTO course_schedules (course_id, class_room_id, day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$courseId, $classRoomId, $body['dayOfWeek'] ?? '', $body['startTime'] ?? '', $body['endTime'] ?? '', isset($body['active']) ? ($body['active'] ? 1 : 0) : 1]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireRole(['superadmin', 'admin']);
        if ($user['role'] !== 'superadmin') {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $ownerCheck = getDb()->prepare("SELECT cs.id FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN class_rooms cr ON cs.class_room_id = cr.id WHERE cs.id = ? AND (c.school_id = ? OR c.school_id IS NULL) AND (cr.school_id = ? OR cr.school_id IS NULL)");
            $ownerCheck->execute([$id, $schoolId, $schoolId]);
            if (!$ownerCheck->fetch()) error('Forbidden: schedule not in your school', 403);
        }
        $fields = []; $vals = [];
        foreach (['courseId' => 'course_id', 'classRoomId' => 'class_room_id', 'dayOfWeek' => 'day_of_week', 'startTime' => 'start_time', 'endTime' => 'end_time'] as $k => $c) {
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
        if ($user['role'] !== 'superadmin') {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $ownerCheck = getDb()->prepare("SELECT cs.id FROM course_schedules cs LEFT JOIN courses c ON cs.course_id = c.id LEFT JOIN class_rooms cr ON cs.class_room_id = cr.id WHERE cs.id = ? AND (c.school_id = ? OR c.school_id IS NULL) AND (cr.school_id = ? OR cr.school_id IS NULL)");
            $ownerCheck->execute([$id, $schoolId, $schoolId]);
            if (!$ownerCheck->fetch()) error('Forbidden: schedule not in your school', 403);
        }
        getDb()->prepare("DELETE FROM course_schedules WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== CLASS ROOMS (GROUPS) =====
if ($resource === 'class-rooms') {
    $user = getAuthUser();
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
        if ($user['role'] === 'superadmin') {
            $stmt = getDb()->query("SELECT cr.*, s.name as school_name FROM class_rooms cr LEFT JOIN schools s ON cr.school_id = s.id ORDER BY cr.id");
        } else {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) json([]);
            $stmt = getDb()->prepare("SELECT cr.*, s.name as school_name FROM class_rooms cr LEFT JOIN schools s ON cr.school_id = s.id WHERE cr.school_id = ? ORDER BY cr.id");
            $stmt->execute([$schoolId]);
        }
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['lesson_ids'] = fetchClassRoomCourseIds((int)$row['id']);
            $row['teacher_ids'] = json_decode($row['teacher_ids'] ?? '[]', true) ?: [];
        }
        json($rows);
    }
    if ($method === 'GET' && $id) {
        if ($user['role'] !== 'superadmin') {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: no school assigned', 403);
            $stmt = getDb()->prepare("SELECT cr.*, s.name as school_name FROM class_rooms cr LEFT JOIN schools s ON cr.school_id = s.id WHERE cr.id = ? AND cr.school_id = ?");
            $stmt->execute([$id, $schoolId]);
        } else {
            $stmt = getDb()->prepare("SELECT cr.*, s.name as school_name FROM class_rooms cr LEFT JOIN schools s ON cr.school_id = s.id WHERE cr.id = ?");
            $stmt->execute([$id]);
        }
        $row = $stmt->fetch();
        if ($row) {
            $row['lesson_ids'] = fetchClassRoomCourseIds((int)$row['id']);
            $row['teacher_ids'] = json_decode($row['teacher_ids'] ?? '[]', true) ?: [];
        }
        json($row ?: null);
    }
    if ($method === 'POST' && !$id) {
        requireRole(['superadmin', 'admin']);
        $schoolId = isset($body['schoolId']) && is_numeric($body['schoolId']) ? (int)$body['schoolId'] : null;
        if ($user['role'] === 'admin') {
            $schoolId = $user['school_id'] ?? null;
            if ($schoolId === null) error('Forbidden: admin must have a school assigned', 403);
        }
        $stmt = getDb()->prepare("INSERT INTO class_rooms (name, grade, school_id, description, teacher_ids, active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$body['name'], $body['grade'], $schoolId, $body['description'] ?? '', json_encode($body['teacherIds'] ?? []), $body['active'] ?? true]);
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
        requireRole(['superadmin', 'admin']);
        if ($user['role'] === 'admin') {
            $check = getDb()->prepare("SELECT id FROM class_rooms WHERE id = ? AND school_id = ?");
            $check->execute([$id, $user['school_id']]);
            if (!$check->fetch()) error('Forbidden: classroom not in your school', 403);
            if (isset($body['schoolId'])) {
                unset($body['schoolId']);
            }
        }
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
        requireRole(['superadmin', 'admin']);
        if ($user['role'] === 'admin') {
            $check = getDb()->prepare("SELECT id FROM class_rooms WHERE id = ? AND school_id = ?");
            $check->execute([$id, $user['school_id']]);
            if (!$check->fetch()) error('Forbidden: classroom not in your school', 403);
        }
        getDb()->prepare("DELETE FROM class_rooms WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== ATTENDANCE =====
if ($resource === 'attendance') {
    $user = getAuthUser();
    $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;

    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $classRoomId = $_GET['classRoomId'] ?? null;
        $date = $_GET['date'] ?? null;
        $params = [];

        try {
            $sql = "SELECT a.*, s.first_name, s.last_name, cr.name as class_room_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN class_rooms cr ON a.class_room_id = cr.id WHERE 1=1 AND s.archived = 0";
            if ($studentId) { $sql .= " AND a.student_id = ?"; $params[] = $studentId; }
            if ($classRoomId) { $sql .= " AND a.class_room_id = ?"; $params[] = $classRoomId; }
            if ($date) { $sql .= " AND a.date = ?"; $params[] = $date; }
            if ($scopedSchoolId !== null) { $sql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
            $sql .= " ORDER BY a.id DESC";
            $stmt = getDb()->prepare($sql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        } catch (PDOException $e) {
            $params = [];
            $fallbackSql = "SELECT a.*, s.first_name, s.last_name, NULL as class_room_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id WHERE 1=1 AND s.archived = 0";
            if ($studentId) { $fallbackSql .= " AND a.student_id = ?"; $params[] = $studentId; }
            if ($classRoomId) { $fallbackSql .= " AND a.class_room_id = ?"; $params[] = $classRoomId; }
            if ($date) { $fallbackSql .= " AND a.date = ?"; $params[] = $date; }
            if ($scopedSchoolId !== null) { $fallbackSql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
            $fallbackSql .= " ORDER BY a.id DESC";
            $stmt = getDb()->prepare($fallbackSql);
            $stmt->execute($params);
            json($stmt->fetchAll());
        }
    }
    if ($method === 'POST' && !$id) {
        $user = getAuthUser();
        requireStudentInSchool($body['studentId'] ?? null, $user);
        $stmt = getDb()->prepare("INSERT INTO attendance (student_id, class_room_id, date, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$body['studentId'], $body['classRoomId'] ?? null, $body['date'], $body['status'] ?? 'present', $body['notes'] ?? '', $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $fields = []; $vals = [];
        foreach (['status' => 'status', 'notes' => 'notes'] as $k => $c) {
            if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; }
        }
        if (empty($fields)) error('No fields to update');
        $check = getDb()->prepare("SELECT student_id FROM attendance WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if (!$row) error('Not found', 404);
        requireStudentInSchool($row['student_id'], $user);
        $vals[] = $id;
        getDb()->prepare("UPDATE attendance SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        $check = getDb()->prepare("SELECT student_id FROM attendance WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if ($row) requireStudentInSchool($row['student_id'], $user);
        getDb()->prepare("DELETE FROM attendance WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== PROGRESS =====
if ($resource === 'progress') {
    $user = getAuthUser();
    $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;

    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT p.*, s.first_name, s.last_name FROM progress p LEFT JOIN students s ON p.student_id = s.id WHERE 1=1 AND s.archived = 0";
        $params = [];
        if ($studentId) { $sql .= " AND p.student_id = ?"; $params[] = $studentId; }
        if ($scopedSchoolId !== null) { $sql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
        $sql .= " ORDER BY p.date DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $user = getAuthUser();
        requireStudentInSchool($body['studentId'] ?? null, $user);
        $stmt = getDb()->prepare("INSERT INTO progress (student_id, date, kuran_current_page, kuran_target_page, kuran_pages, risale_current_page, risale_target_page, risale_pages, elifba_current_page, elifba_target_page, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $body['studentId'], $body['date'],
            $body['kuranCurrentPage'] ?? 0, 
            $body['kuranTargetPage'] ?? 0, 
            $body['kuranPages'] ?? 0,
            $body['risaleCurrentPage'] ?? 0, 
            $body['risaleTargetPage'] ?? 0, 
            $body['risalePages'] ?? 0,
            $body['elifbaCurrentPage'] ?? 0, 
            $body['elifbaTargetPage'] ?? 0,
            $body['notes'] ?? '', $user['id'] ?? null
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $map = ['kuranCurrentPage' => 'kuran_current_page', 'kuranTargetPage' => 'kuran_target_page', 'kuranPages' => 'kuran_pages', 'risaleCurrentPage' => 'risale_current_page', 'risaleTargetPage' => 'risale_target_page', 'risalePages' => 'risale_pages', 'elifbaCurrentPage' => 'elifba_current_page', 'elifbaTargetPage' => 'elifba_target_page', 'notes' => 'notes'];
        $fields = []; $vals = [];
        foreach ($map as $k => $c) { if (isset($body[$k])) { $fields[] = "$c = ?"; $vals[] = $body[$k]; } }
        if (empty($fields)) error('No fields to update');
        $check = getDb()->prepare("SELECT student_id FROM progress WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if (!$row) error('Not found', 404);
        requireStudentInSchool($row['student_id'], $user);
        $vals[] = $id;
        getDb()->prepare("UPDATE progress SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        $check = getDb()->prepare("SELECT student_id FROM progress WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if ($row) requireStudentInSchool($row['student_id'], $user);
        getDb()->prepare("DELETE FROM progress WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
}

// ===== COMMENTS =====
if ($resource === 'comments') {
    $user = getAuthUser();
    $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;

    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT c.*, s.first_name, s.last_name FROM comments c LEFT JOIN students s ON c.student_id = s.id WHERE 1=1 AND s.archived = 0";
        $params = [];
        if ($studentId) { $sql .= " AND c.student_id = ?"; $params[] = $studentId; }
        if ($scopedSchoolId !== null) { $sql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
        $sql .= " ORDER BY c.created_at DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $user = getAuthUser();
        requireStudentInSchool($body['studentId'] ?? null, $user);
        $stmt = getDb()->prepare("INSERT INTO comments (student_id, content, author, user_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$body['studentId'], $body['content'], $user['full_name'] ?? $body['author'] ?? '', $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        $check = getDb()->prepare("SELECT student_id FROM comments WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if ($row) requireStudentInSchool($row['student_id'], $user);
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
    $user = getAuthUser();
    $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;

    if ($method === 'GET' && !$id) {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT sr.*, s.first_name, s.last_name FROM student_reports sr LEFT JOIN students s ON sr.student_id = s.id WHERE 1=1 AND s.archived = 0";
        $params = [];
        if ($studentId) { $sql .= " AND sr.student_id = ?"; $params[] = $studentId; }
        if ($scopedSchoolId !== null) { $sql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
        $sql .= " ORDER BY sr.created_at DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $user = getAuthUser();
        requireStudentInSchool($body['studentId'] ?? null, $user);
        $stmt = getDb()->prepare("INSERT INTO student_reports (student_id, report_type, report_period, subject, strengths, improvements, recommendations, attendance_summary, lesson_data, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $body['studentId'], $body['reportType'] ?? '', $body['reportPeriod'] ?? '',
            $body['subject'] ?? '', $body['strengths'] ?? '', $body['improvements'] ?? '',
            $body['recommendations'] ?? '', $body['attendanceSummary'] ?? '', $body['lessonData'] ?? '',
            $body['notes'] ?? '', $user['id'] ?? null
        ]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        $check = getDb()->prepare("SELECT student_id FROM student_reports WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if ($row) requireStudentInSchool($row['student_id'], $user);
        getDb()->prepare("DELETE FROM student_reports WHERE id = ?")->execute([$id]);
        json(['message' => 'Deleted']);
    }
    if ($method === 'POST' && $id === 'bulk-mail') {
        $allowedRoles = ['superadmin', 'admin', 'authorized_teacher', 'teacher'];
        if (!in_array($user['role'], $allowedRoles, true)) {
            error('Forbidden', 403);
        }
        $groupId = isset($body['groupId']) && is_numeric($body['groupId']) ? (int)$body['groupId'] : 0;
        if ($groupId <= 0) error('groupId is required', 400);

        $groupStmt = getDb()->prepare("SELECT cr.*, s.name as school_name FROM class_rooms cr LEFT JOIN schools s ON cr.school_id = s.id WHERE cr.id = ?");
        $groupStmt->execute([$groupId]);
        $group = $groupStmt->fetch();
        if (!$group) error('Group not found', 404);
        if ($scopedSchoolId !== null && (int)($group['school_id'] ?? 0) !== (int)$scopedSchoolId) {
            error('Forbidden: group not in your school', 403);
        }
        $groupName = ($group['grade'] ?? '') . ' ' . ($group['name'] ?? '');
        $groupName = trim($groupName) ?: ($group['name'] ?? '-');

        $studentsStmt = getDb()->prepare("SELECT s.*, sc.name as school_name FROM students s LEFT JOIN schools sc ON s.school_id = sc.id WHERE s.group_id = ? AND s.archived = 0 ORDER BY s.first_name, s.last_name");
        $studentsStmt->execute([$groupId]);
        $students = $studentsStmt->fetchAll();

        $total = count($students);
        $sent = 0;
        $skipped = 0;
        $failed = 0;
        $results = [];

        if ($total === 0) {
            json(['total' => 0, 'sent' => 0, 'skipped' => 0, 'failed' => 0, 'results' => []]);
        }

        foreach ($students as $st) {
            $fullName = trim(($st['first_name'] ?? '') . ' ' . ($st['last_name'] ?? ''));
            $email = trim((string)($st['email'] ?? ''));
            if ($email === '') {
                $skipped++;
                $results[] = [
                    'studentId' => (int)$st['id'],
                    'name' => $fullName,
                    'status' => 'skipped',
                    'reason' => 'E-posta adresi tanımlı değil',
                ];
                continue;
            }
            $subject = "$fullName - Gelişim Raporu";
            try {
                list($text, $html) = buildStudentReportMail($st, $groupName);
                send_configured_mail([
                    'to' => $email,
                    'subject' => $subject,
                    'text' => $text,
                    'html' => $html,
                ], $user);
                $sent++;
                $results[] = [
                    'studentId' => (int)$st['id'],
                    'name' => $fullName,
                    'status' => 'sent',
                    'email' => $email,
                ];
            } catch (Throwable $e) {
                $failed++;
                $results[] = [
                    'studentId' => (int)$st['id'],
                    'name' => $fullName,
                    'status' => 'failed',
                    'reason' => $e->getMessage(),
                ];
            }
        }

        json(['total' => $total, 'sent' => $sent, 'skipped' => $skipped, 'failed' => $failed, 'results' => $results]);
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
    $user = getAuthUser();
    $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;

    if ($method === 'GET') {
        $studentId = $_GET['studentId'] ?? null;
        $surveyId = $_GET['surveyId'] ?? null;
        $sql = "SELECT sa.* FROM survey_answers sa LEFT JOIN students s ON sa.student_id = s.id WHERE 1=1 AND s.archived = 0"; $params = [];
        if ($studentId) { $sql .= " AND sa.student_id = ?"; $params[] = $studentId; }
        if ($surveyId) { $sql .= " AND sa.survey_id = ?"; $params[] = $surveyId; }
        if ($scopedSchoolId !== null) { $sql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $user = getAuthUser();
        requireStudentInSchool($body['studentId'] ?? null, $user);
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
    $user = getAuthUser();
    $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;

    if ($method === 'GET') {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT ha.*, s.first_name, s.last_name FROM homework_assignments ha LEFT JOIN students s ON ha.student_id = s.id WHERE 1=1 AND s.archived = 0";
        $params = [];
        if ($studentId) { $sql .= " AND ha.student_id = ?"; $params[] = $studentId; }
        if ($scopedSchoolId !== null) { $sql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
        $sql .= " ORDER BY ha.created_at DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $user = getAuthUser();
        requireStudentInSchool($body['studentId'] ?? null, $user);
        $stmt = getDb()->prepare("INSERT INTO homework_assignments (student_id, template_id, title, content, details, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$body['studentId'], $body['templateId'] ?? null, $body['title'], $body['content'] ?? '', $body['details'] ?? '', $body['dueDate'] ?? null, $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        $check = getDb()->prepare("SELECT student_id FROM homework_assignments WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if (!$row) error('Not found', 404);
        requireStudentInSchool($row['student_id'], $user);
        if (isset($body['completed'])) {
            getDb()->prepare("UPDATE homework_assignments SET completed = ?, completed_at = ? WHERE id = ?")
                ->execute([$body['completed'] ? 1 : 0, $body['completed'] ? date('Y-m-d H:i:s') : null, $id]);
        }
        json(['message' => 'Updated']);
    }
    if ($method === 'DELETE' && $id) {
        $check = getDb()->prepare("SELECT student_id FROM homework_assignments WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if ($row) requireStudentInSchool($row['student_id'], $user);
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
        $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;
        $canAccessStudent = function ($studentId) use ($scopedSchoolId) {
                if (!$studentId || !is_numeric($studentId)) return false;
                $check = getDb()->prepare("SELECT school_id, archived FROM students WHERE id = ?");
                $check->execute([(int)$studentId]);
                $row = $check->fetch();
                if (!$row || !empty($row['archived'])) return false;
                if ($scopedSchoolId !== null && (int)$row['school_id'] !== (int)$scopedSchoolId) return false;
                return true;
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
                WHERE 1=1 AND s.archived = 0";
        $params = [];

        if ($textId) { $sql .= " AND mt.text_id = ?"; $params[] = $textId; }
        if ($studentId) { $sql .= " AND mt.student_id = ?"; $params[] = $studentId; }
        if ($status) { $sql .= " AND mt.status = ?"; $params[] = $status; }
        if ($scopedSchoolId !== null) {
            $sql .= " AND s.school_id = ?";
            $params[] = $scopedSchoolId;
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

    if ($method === 'POST' && $id === 'batch') {
        requireRole(['superadmin', 'admin', 'authorized_teacher', 'teacher']);

        $studentId = isset($body['studentId']) ? (int)$body['studentId'] : 0;
        $items = $body['items'] ?? [];
        $allowedStatuses = ['passed', 'failed', 'repeat_tecvid', 'repeat_harf', 'not_appointment', 'home_work'];

        if ($studentId <= 0) error('studentId is required', 400);
        if (!is_array($items) || empty($items)) error('items are required', 400);
        if (!$canAccessStudent($studentId)) error('Forbidden', 403);

        $db = getDb();
        try {
            $db->beginTransaction();
            foreach ($items as $item) {
                $textId = isset($item['textId']) ? (int)$item['textId'] : 0;
                $status = $item['status'] ?? 'not_appointment';
                $teacherNote = $item['teacherNote'] ?? '';
                $scores = array_key_exists('scores', $item) ? $item['scores'] : null;
                $scoresJson = $scores === null ? '{}' : json_encode($scores);

                if ($textId <= 0) continue;
                if (!in_array($status, $allowedStatuses, true)) continue;

                $existing = $db->prepare("SELECT id FROM memorization_tracking WHERE student_id = ? AND text_id = ?");
                $existing->execute([$studentId, $textId]);
                $existingId = $existing->fetchColumn();

                if ($existingId) {
                    $stmt = $db->prepare("UPDATE memorization_tracking SET status = ?, scores = ?, teacher_note = ?, checked_by = ?, checked_at = NOW() WHERE id = ?");
                    $stmt->execute([$status, $scoresJson, $teacherNote, $user['id'] ?? null, $existingId]);
                } else {
                    $stmt = $db->prepare("INSERT INTO memorization_tracking (student_id, text_id, status, scores, teacher_note, checked_by, checked_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
                    $stmt->execute([$studentId, $textId, $status, $scoresJson, $teacherNote, $user['id'] ?? null]);
                }
            }
            $db->commit();
        } catch (PDOException $e) {
            $db->rollBack();
            error('Batch save failed: ' . $e->getMessage(), 500);
        }
        json(['message' => 'Saved']);
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
        $status = $body['status'] ?? 'not_appointment';
        $teacherNote = $body['teacherNote'] ?? '';
        $allowedStatuses = ['passed', 'failed', 'repeat_tecvid', 'repeat_harf', 'not_appointment', 'home_work'];

        if ($studentId <= 0 || $textId <= 0) error('studentId and textId are required', 400);
        if (!in_array($status, $allowedStatuses, true)) error('Invalid status', 400);
        if (!$canAccessStudent($studentId)) error('Forbidden', 403);

        $scores = array_key_exists('scores', $body) ? $body['scores'] : null;
        $scoresJson = $scores === null ? '{}' : json_encode($scores);

        $existing = getDb()->prepare("SELECT id FROM memorization_tracking WHERE student_id = ? AND text_id = ?");
        $existing->execute([$studentId, $textId]);
        $existingId = $existing->fetchColumn();

        if ($existingId) {
            $stmt = getDb()->prepare("UPDATE memorization_tracking SET status = ?, scores = ?, teacher_note = ?, checked_by = ?, checked_at = NOW() WHERE id = ?");
            $stmt->execute([$status, $scoresJson, $teacherNote, $user['id'] ?? null, $existingId]);
        } else {
            $stmt = getDb()->prepare("INSERT INTO memorization_tracking (student_id, text_id, status, scores, teacher_note, checked_by, checked_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$studentId, $textId, $status, $scoresJson, $teacherNote, $user['id'] ?? null]);
        }

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
            $allowedStatuses = ['passed', 'failed', 'repeat_tecvid', 'repeat_harf', 'not_appointment', 'home_work'];
            if (!in_array($body['status'], $allowedStatuses, true)) error('Invalid status', 400);
            $fields[] = "status = ?"; $vals[] = $body['status'];
            $fields[] = "checked_at = NOW()";
            $fields[] = "checked_by = ?"; $vals[] = $user['id'] ?? null;
        }
        if (array_key_exists('teacherNote', $body)) { $fields[] = "teacher_note = ?"; $vals[] = $body['teacherNote']; }
        if (array_key_exists('scores', $body)) { $fields[] = "scores = ?"; $vals[] = $body['scores'] === null ? '{}' : json_encode($body['scores']); }
        if (empty($fields)) error('No fields to update');

        $vals[] = $id;
        getDb()->prepare("UPDATE memorization_tracking SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        json(['message' => 'Updated']);
    }

    if ($method === 'DELETE' && $id) {
        requireRole(['superadmin', 'admin']);
        $sidStmt = getDb()->prepare("SELECT student_id FROM memorization_tracking WHERE id = ?");
        $sidStmt->execute([$id]);
        $trackingStudentId = $sidStmt->fetchColumn();
        if ($trackingStudentId) requireStudentInSchool($trackingStudentId, $user);
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
    $user = getAuthUser();
    $scopedSchoolId = !in_array($user['role'], ['superadmin', 'parent'], true) ? ($user['school_id'] ?? null) : null;

    if ($method === 'GET') {
        $studentId = $_GET['studentId'] ?? null;
        $sql = "SELECT ll.*, s.first_name, s.last_name FROM lesson_logs ll LEFT JOIN students s ON ll.student_id = s.id WHERE 1=1 AND s.archived = 0";
        $params = [];
        if ($studentId) { $sql .= " AND ll.student_id = ?"; $params[] = $studentId; }
        if ($scopedSchoolId !== null) { $sql .= " AND s.school_id = ?"; $params[] = $scopedSchoolId; }
        $sql .= " ORDER BY ll.date DESC";
        $stmt = getDb()->prepare($sql);
        $stmt->execute($params);
        json($stmt->fetchAll());
    }
    if ($method === 'POST' && !$id) {
        $user = getAuthUser();
        requireStudentInSchool($body['studentId'] ?? null, $user);
        $subTopicRequired = strtolower((string)getSystemSetting('sub_topic_required', 'false')) === 'true';
        if ($subTopicRequired && empty($body['subTopic'])) {
            http_response_code(422);
            json(['error' => 'Alt konu zorunludur']);
        }
        $stmt = getDb()->prepare("INSERT INTO lesson_logs (student_id, date, category, topic, sub_topic, notes, author, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$body['studentId'], $body['date'], $body['category'], $body['topic'], $body['subTopic'] ?? null, $body['notes'] ?? '', $body['author'] ?? $user['full_name'] ?? '', $user['id'] ?? null]);
        json(['id' => (int)getDb()->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        $check = getDb()->prepare("SELECT student_id FROM lesson_logs WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if ($row) requireStudentInSchool($row['student_id'], $user);
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
    $scopedSchoolId = !in_array($user['role'], ['superadmin'], true) ? ($user['school_id'] ?? null) : null;

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
    if ($scopedSchoolId !== null) {
        $stats['totalStudents'] = $safeCount("SELECT COUNT(*) FROM students WHERE school_id = ? AND archived = 0", [$scopedSchoolId]);
        $stats['totalSchools'] = 1;
        $stats['totalLessons'] = $safeCount("SELECT COUNT(*) FROM courses WHERE active = TRUE");
        $stats['totalGroups'] = $safeCount("SELECT COUNT(*) FROM class_rooms WHERE active = TRUE AND school_id = ?", [$scopedSchoolId]);
        $stats['todayAttendance'] = $safeCount("SELECT COUNT(*) FROM attendance a LEFT JOIN students s ON a.student_id = s.id WHERE a.date = ? AND a.status = 'present' AND s.school_id = ? AND s.archived = 0", [date('Y-m-d'), $scopedSchoolId]);
        $stats['gradeDistribution'] = $safeRows("SELECT grade, COUNT(*) as count FROM students WHERE school_id = ? AND archived = 0 GROUP BY grade ORDER BY count DESC", [$scopedSchoolId]);
        $stats['cityDistribution'] = $safeRows("SELECT city, COUNT(*) as count FROM students WHERE school_id = ? AND archived = 0 GROUP BY city ORDER BY count DESC LIMIT 10", [$scopedSchoolId]);
    } else {
        $stats['totalStudents'] = $safeCount("SELECT COUNT(*) FROM students WHERE archived = 0");
        $stats['totalSchools'] = $safeCount("SELECT COUNT(*) FROM schools WHERE active = TRUE");
        $stats['totalLessons'] = $safeCount("SELECT COUNT(*) FROM courses WHERE active = TRUE");
        $stats['totalGroups'] = $safeCount("SELECT COUNT(*) FROM class_rooms WHERE active = TRUE");
        $stats['todayAttendance'] = $safeCount("SELECT COUNT(*) FROM attendance a LEFT JOIN students s ON a.student_id = s.id WHERE a.date = ? AND a.status = 'present' AND s.archived = 0", [date('Y-m-d')]);
        $stats['gradeDistribution'] = $safeRows("SELECT grade, COUNT(*) as count FROM students WHERE archived = 0 GROUP BY grade ORDER BY count DESC");
        $stats['cityDistribution'] = $safeRows("SELECT city, COUNT(*) as count FROM students WHERE archived = 0 GROUP BY city ORDER BY count DESC LIMIT 10");
    }
    json($stats);
}

// ===== PARENT CONSENTS =====
if ($resource === 'parent-consents') {
    $user = getAuthUser();
    if (($user['role'] ?? '') !== 'parent') {
        error('Forbidden', 403);
    }
    $userId = (int)$user['id'];

    if ($method === 'GET') {
        $stmt = getDb()->prepare("SELECT * FROM parent_consents WHERE user_id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            json([
                'userId' => $userId,
                'illuminationConsent' => false,
                'kvkkConsent' => false,
                'illuminationConsentedAt' => null,
                'kvkkConsentedAt' => null,
            ]);
        } else {
            json([
                'userId' => (int)$row['user_id'],
                'illuminationConsent' => (bool)$row['illumination_consent'],
                'kvkkConsent' => (bool)$row['kvkk_consent'],
                'illuminationConsentedAt' => $row['illumination_consented_at'],
                'kvkkConsentedAt' => $row['kvkk_consented_at'],
            ]);
        }
    }
    if ($method === 'POST' || $method === 'PUT') {
        $illumination = isset($body['illuminationConsent']) ? (bool)$body['illuminationConsent'] : false;
        $kvkk = isset($body['kvkkConsent']) ? (bool)$body['kvkkConsent'] : false;

        $existingStmt = getDb()->prepare("SELECT id FROM parent_consents WHERE user_id = ?");
        $existingStmt->execute([$userId]);
        $existingId = $existingStmt->fetchColumn();

        $illuminationAt = $illumination ? date('Y-m-d H:i:s') : null;
        $kvkkAt = $kvkk ? date('Y-m-d H:i:s') : null;

        if ($existingId) {
            $stmt = getDb()->prepare("UPDATE parent_consents SET illumination_consent = ?, kvkk_consent = ?, illumination_consented_at = COALESCE(?, illumination_consented_at), kvkk_consented_at = COALESCE(?, kvkk_consented_at) WHERE id = ?");
            $stmt->execute([$illumination ? 1 : 0, $kvkk ? 1 : 0, $illuminationAt, $kvkkAt, $existingId]);
        } else {
            $stmt = getDb()->prepare("INSERT INTO parent_consents (user_id, illumination_consent, kvkk_consent, illumination_consented_at, kvkk_consented_at) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $illumination ? 1 : 0, $kvkk ? 1 : 0, $illuminationAt, $kvkkAt]);
        }
        json(['message' => 'Saved']);
    }
}

// ===== 404 =====
http_response_code(404);
json(['error' => 'Endpoint not found', 'resource' => $resource, 'method' => $method]);
?>

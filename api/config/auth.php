<?php
require_once __DIR__ . '/database.php';

// Simple JWT implementation
class JWT {
    private static $secret = 'kuran-mektebi-secret-key-2025';

    public static function encode($payload, $exp = 86400) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + $exp;
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", self::$secret, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        return "$base64Header.$base64Payload.$base64Signature";
    }

    public static function decode($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) return null;
        $signature = hash_hmac('sha256', "$parts[0].$parts[1]", self::$secret, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        if (!hash_equals($base64Signature, $parts[2])) return null;
        return $payload;
    }
}

function getAuthUser() {
    $auth = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    }
    if (!$auth && isset($_SERVER['HTTP_AUTHORIZATION'])) $auth = $_SERVER['HTTP_AUTHORIZATION'];
    if (!$auth && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    if (!$auth) { http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit; }
    $token = str_replace('Bearer ', '', $auth);
    $payload = JWT::decode($token);
    if (!$payload) { http_response_code(401); echo json_encode(['error' => 'Invalid token']); exit; }
    $stmt = getDb()->prepare("SELECT id, username, full_name, email, phone, role, active FROM users WHERE id = ? AND active = TRUE");
    $stmt->execute([$payload['sub']]);
    $user = $stmt->fetch();
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'User not found']); exit; }
    return $user;
}

function requireRole($roles) {
    $user = getAuthUser();
    if (!in_array($user['role'], $roles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden: requires ' . implode(', ', $roles)]);
        exit;
    }
    return $user;
}

function json($data) { echo json_encode($data); exit; }
function error($msg, $code = 400) { http_response_code($code); json(['error' => $msg]); }
?>

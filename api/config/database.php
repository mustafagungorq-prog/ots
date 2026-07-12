<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

if (!function_exists('loadEnvFile')) {
    function loadEnvFile($path) {
        if (!file_exists($path)) return;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            $value = trim($value, '"\'');
            if (!array_key_exists($key, $_ENV)) {
                $_ENV[$key] = $value;
            }
        }
    }
}

if (!function_exists('env')) {
    function env($key, $default = '') {
        if (isset($_ENV[$key])) return $_ENV[$key];
        $val = getenv($key);
        return $val !== false ? $val : $default;
    }
}

// Try multiple common locations for .env (web-root is least secure)
$candidates = [
    dirname(__DIR__, 3) . '/.env',          // outside web root (best)
    dirname(__DIR__, 2) . '/.env',          // project root
    __DIR__ . '/../../.env',                // project root (legacy)
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/../.env', // outside document root
];
$envLoaded = false;
foreach ($candidates as $candidate) {
    if (file_exists($candidate)) {
        loadEnvFile($candidate);
        $envLoaded = true;
        break;
    }
}

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $host = env('DB_HOST', '127.0.0.1');
        $db   = env('DB_NAME', 'kuran_mektebi');
        $user = env('DB_USER', 'root');
        $pass = env('DB_PASS', '');
        if (function_exists('logApiError')) {
            logApiError("DB CONFIG: host=$host db=$db user=$user");
        }
        $charset = 'utf8mb4';
        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            if (function_exists('logApiError')) {
                logApiError('DB ERROR: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            }
            http_response_code(500);
            // DEBUG: always expose details until production issue is resolved
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }

    public static function getInstance() {
        if (self::$instance === null) self::$instance = new self();
        return self::$instance;
    }

    public function getPdo() { return $this->pdo; }
}

function getDb() { return Database::getInstance()->getPdo(); }

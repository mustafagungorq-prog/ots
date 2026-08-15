<?php
header('Content-Type: text/plain; charset=utf-8');

echo "DOCUMENT_ROOT: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'N/A') . "\n";
echo "HOME: " . ($_SERVER['HOME'] ?? 'N/A') . "\n";
echo "SCRIPT_FILENAME: " . ($_SERVER['SCRIPT_FILENAME'] ?? 'N/A') . "\n\n";

$filesToFind = [
    'vendor/autoload.php',
    'autoload.php',
    'PHPMailer/src/PHPMailer.php',
    'PHPMailer/PHPMailer.php',
    'PHPMailer/class.phpmailer.php',
];

$roots = array_unique(array_filter([
    __DIR__,
    dirname(__DIR__),
    $_SERVER['DOCUMENT_ROOT'] ?? '',
    $_SERVER['HOME'] ?? '',
    dirname($_SERVER['DOCUMENT_ROOT'] ?? __DIR__),
]));

foreach ($roots as $root) {
    $root = rtrim($root, '/');
    if (!is_dir($root)) continue;
    echo "Searching under: {$root}\n";
    foreach ($filesToFind as $file) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        $found = false;
        foreach ($iterator as $path => $info) {
            if (substr($path, -strlen($file)) === $file) {
                echo "  FOUND: {$path}\n";
                $found = true;
                break;
            }
        }
        if (!$found) {
            echo "  NOT FOUND: {$file}\n";
        }
    }
    echo "\n";
}

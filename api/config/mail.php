<?php
require_once __DIR__ . '/auth.php';

if (!function_exists('mail_json_response')) {
    function mail_json_response($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data);
        exit;
    }
}

if (!function_exists('mail_error_response')) {
    function mail_error_response($message, $statusCode = 400) {
        mail_json_response(['error' => $message], $statusCode);
    }
}

if (!function_exists('mail_build_html_from_text')) {
    function mail_build_html_from_text($text) {
        $escaped = htmlspecialchars((string)$text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return '<html><body style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;">' . nl2br($escaped) . '</body></html>';
    }
}

if (!function_exists('mail_send_native')) {
    function mail_send_native($to, $subject, $html, $text, $replyTo, $fromAddress, $fromName) {
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$fromAddress}>\r\n";
        if ($replyTo !== '') {
            $headers .= "Reply-To: {$replyTo}\r\n";
        }
        return @mail($to, $encodedSubject, $html, $headers);
    }
}

if (!function_exists('mail_send_phpmailer')) {
    function mail_send_phpmailer($to, $subject, $html, $text, $replyTo, $fromAddress, $fromName) {
        $autoloadCandidates = [
            dirname(__DIR__) . '/vendor/autoload.php',
            dirname(__DIR__, 2) . '/vendor/autoload.php',
        ];

        $autoloadPath = null;
        foreach ($autoloadCandidates as $candidate) {
            if (file_exists($candidate)) {
                $autoloadPath = $candidate;
                break;
            }
        }

        if ($autoloadPath === null) {
            return false;
        }

        require_once $autoloadPath;
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            return false;
        }

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = env('MAIL_HOST') ?: 'smtp.hostinger.com';
        $mail->SMTPAuth = true;
        $mail->Username = env('MAIL_USERNAME') ?: 'info@mektebtakip.com';
        $mail->Password = env('MAIL_PASSWORD') ?: '';
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = (int)(env('MAIL_PORT') ?: 465);
        $mail->CharSet = 'UTF-8';

        $mail->setFrom($fromAddress, $fromName);
        $mail->addAddress($to);
        if ($replyTo !== '') {
            $mail->addReplyTo($replyTo);
        }
        $mail->Subject = $subject;
        $mail->isHTML(true);
        $mail->Body = $html;
        $mail->AltBody = $text;
        $mail->send();

        return true;
    }
}

if (!function_exists('send_configured_mail')) {
    function send_configured_mail($payload, $user = null) {
        $to = trim((string)($payload['to'] ?? ''));
        $subject = trim((string)($payload['subject'] ?? ''));
        $html = (string)($payload['html'] ?? '');
        $text = (string)($payload['text'] ?? '');

        if ($to === '' || $subject === '') {
            throw new InvalidArgumentException('to and subject are required');
        }

        if ($html === '' && $text === '') {
            throw new InvalidArgumentException('html or text is required');
        }

        if ($html === '') {
            $html = mail_build_html_from_text($text);
        }
        if ($text === '') {
            $text = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $html)));
        }

        $fromAddress = trim((string)(env('MAIL_FROM') ?: 'info@mektebtakip.com'));
        $fromName = trim((string)(env('MAIL_FROM_NAME') ?: '365 Kuran Kuran Mektebi'));
        $replyTo = trim((string)($payload['replyTo'] ?? ($user['email'] ?? '')));

        $sent = false;
        try {
            $sent = mail_send_phpmailer($to, $subject, $html, $text, $replyTo, $fromAddress, $fromName);
        } catch (Throwable $e) {
            $sent = false;
        }

        if (!$sent) {
            $sent = mail_send_native($to, $subject, $html, $text, $replyTo, $fromAddress, $fromName);
        }

        if (!$sent) {
            throw new RuntimeException('Mail servisiyle gönderim başarısız oldu');
        }

        return ['message' => 'Mail gönderildi'];
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    header('Content-Type: application/json; charset=UTF-8');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        mail_error_response('Method not allowed', 405);
    }

    $user = getAuthUser();
    if (!in_array($user['role'], ['superadmin', 'admin', 'authorized_teacher', 'teacher'])) {
        mail_error_response('Forbidden', 403);
    }

    $payload = json_decode(file_get_contents('php://input'), true) ?: [];

    try {
        mail_json_response(send_configured_mail($payload, $user));
    } catch (InvalidArgumentException $e) {
        mail_error_response($e->getMessage(), 400);
    } catch (Throwable $e) {
        mail_error_response($e->getMessage(), 500);
    }
}
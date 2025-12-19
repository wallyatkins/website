<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

// Load .env variables globally
// Load .env variables globally
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->safeLoad();
} catch (Exception $e) {
    error_log("Dotenv Load Failed: " . $e->getMessage());
}

// Helper to get ENV safely
function getEnvVar($key, $default = null)
{
    if (isset($_ENV[$key]))
        return $_ENV[$key];
    if (isset($_SERVER[$key]))
        return $_SERVER[$key];
    $val = getenv($key);
    if ($val !== false)
        return $val;
    return $default;
}

// DEBUG: Log Chat Key Hash to verify consistency across scripts
$k = getEnvVar('CHAT_KEY', '');
error_log("Utils loaded. Script: " . $_SERVER['SCRIPT_NAME'] . " | KeyHash: " . md5($k));

// --- ENCRYPTION HELPERS ---

function encryptData($data, $key)
{
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    $encrypted = openssl_encrypt(json_encode($data), 'aes-256-cbc', $key, 0, $iv);
    return base64_encode($iv) . '::' . $encrypted;
}

function decryptData($content, $key)
{
    list($iv, $encrypted_data) = explode('::', $content, 2);
    return json_decode(openssl_decrypt($encrypted_data, 'aes-256-cbc', $key, 0, base64_decode($iv)), true);
}

// --- EMAIL HELPERS ---

function sendChatInvite($recipientEmail, $userName, $userMessage, $chatId, $adminToken, $resend = false)
{
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = $_ENV['SMTP_HOST'];
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['SMTP_USER'];
        $mail->Password = $_ENV['SMTP_PASS'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $_ENV['SMTP_PORT'] ?? 587;

        // Recipients
        $mail->setFrom($_ENV['FROM_EMAIL'], $_ENV['FROM_NAME']); // Ensure FROM_EMAIL/NAME are also set? pine.php uses them.
        $mail->addAddress($_ENV['TO_EMAIL']);
        if (!empty($_ENV['TO_TEXT_EMAIL'])) {
            $mail->addAddress($_ENV['TO_TEXT_EMAIL']);
        }

        // Content
        $mail->isHTML(true);

        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
        $host = $_SERVER['HTTP_HOST'];
        $admin_url = "$protocol://$host/?chat_id=$chatId&token=$adminToken";

        $subjectPrefix = $resend ? "[REMINDER] " : "";
        $mail->Subject = $subjectPrefix . "[Website Chat Request] " . $userName;

        $bodyIntro = $resend
            ? "<h2 style='color: red;'>Chat Request REMINDER!</h2><p>The user is still waiting...</p>"
            : "<h2>New Chat Request!</h2>";

        $mail->Body = "
            $bodyIntro
            <p><strong>Name:</strong> {$userName}</p>
            <p><strong>Email:</strong> $recipientEmail</p>
            <p><strong>Message:</strong><br>$userMessage</p>
            <p><a href='$admin_url' style='font-size: 18px; font-weight: bold; color: blue;'>CLICK HERE TO JOIN CHAT</a></p>
            <hr>
            <small>If you do not reply, the session will expire.</small>
        ";

        $mail->AltBody = ($resend ? "REMINDER: " : "") . "Chat Request from {$userName}.\nLink: $admin_url";

        $mail->send();
        return true;
    } catch (Exception $e) {
        return false;
    }
}
?>
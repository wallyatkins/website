<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

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
        $mail->setFrom($_ENV['SMTP_USER'], 'Wally Atkins Website');
        $mail->addAddress($_ENV['ADMIN_EMAIL']);

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
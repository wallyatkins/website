<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Ensure vendor is loaded if not already (though usually loaded by entry point)
require_once __DIR__ . '/vendor/autoload.php';

function sendIRCPine($recipientPine, $userName, $userMessage, $ircId, $adminToken, $resend = false)
{
    $pine = new PHPMailer(true);

    try {
        // Server settings
        $pine->isSMTP();
        // Use global $_ENV which should be populated by utils.php or pine.php
        $pine->Host = $_ENV['SMTP_HOST'];
        $pine->SMTPAuth = true;
        $pine->Username = $_ENV['SMTP_USER'];
        $pine->Password = $_ENV['SMTP_PASS'];
        $pine->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $pine->Port = $_ENV['SMTP_PORT'] ?? 587;

        // Recipients
        $pine->setFrom($_ENV['FROM_EMAIL'], $_ENV['FROM_NAME']);
        $pine->addAddress($_ENV['TO_EMAIL']);
        if (!empty($_ENV['TO_TEXT_EMAIL'])) {
            $pine->addAddress($_ENV['TO_TEXT_EMAIL']);
        }

        // Content
        $pine->isHTML(true);

        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $admin_url = "$protocol://$host/?irc_id=$ircId&token=$adminToken";

        $subjectPrefix = $resend ? "[REMINDER] " : "";
        $pine->Subject = $subjectPrefix . "[Website IRC Request] " . $userName;

        $bodyIntro = $resend
            ? "<h2 style='color: red;'>IRC Request REMINDER!</h2><p>The user is still waiting...</p>"
            : "<h2>New IRC Request!</h2>";

        $pine->Body = "
            $bodyIntro
            <p><strong>Name:</strong> {$userName}</p>
            <p><strong>Pine Address:</strong> $recipientPine</p>
            <p><strong>Message:</strong><br>$userMessage</p>
            <p><a href='$admin_url' style='font-size: 18px; font-weight: bold; color: blue;'>CLICK HERE TO JOIN IRC</a></p>
            <hr>
            <small>If you do not reply, the session will expire.</small>
        ";

        $pine->AltBody = ($resend ? "REMINDER: " : "") . "IRC Request from {$userName}.\nLink: $admin_url";

        $pine->send();
        return true;
    } catch (Exception $e) {
        error_log("IRC Pine Send Error: " . $e->getMessage());
        return false;
    }
}
?>

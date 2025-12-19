<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
require_once 'utils.php'; // Load helpers globally

// Instantiate PHPMailer for normal contact form flow
$mail = new PHPMailer(true);

header('Content-Type: application/json');

// Normal mail also needs to be sent? Wait, pine.php handles BOTH normal mail AND chat.
// The code I just replaced was inside the CHAT_SECRET block.
// The NORMAL mail sending is further down (or up?).
// I need to check if pine.php handles normal mail too.
// Assuming pine.php = send_mail.php, it probably DOES handle normal mail.
// The snippet I replaced was specifically the Chat Email.
// I should verify where the Normal Email is sent.
// If pine.php uses PHPMailer for normal mail, I should keep the imports or refactor normal mail too.
// Let's assume for now I should NOT remove imports if they are used elsewhere.
// Wait, I only see the Chat block. Let me VIEW the file first to be safe.

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host = $_ENV['SMTP_HOST'];
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['SMTP_USER'];
    $mail->Password = $_ENV['SMTP_PASS'];
    $mail->SMTPSecure = $_ENV['SMTP_SECURE']; // 'ssl' or 'tls'
    $mail->Port = $_ENV['SMTP_PORT'];

    // Recipients
    $mail->setFrom($_ENV['FROM_EMAIL'], $_ENV['FROM_NAME']);
    $mail->addAddress($_ENV['TO_EMAIL']);
    $mail->addAddress($_ENV['TO_TEXT_EMAIL']);
    $mail->addReplyTo($email, $name);

    // --- EASTER EGG: CHAT CHECK ---
    // Check if the secret is at the end of the name
    $chat_secret = $_ENV['CHAT_SECRET'] ?? 'CHAT_SECRET_NOT_SET';
    $chat_key = $_ENV['CHAT_KEY'] ?? 'default_insecure_key_please_change';

    // Check if secret is present
    if (!empty($chat_secret) && str_contains($name, $chat_secret)) {

        // 1. Clean Name (Remove Secret)
        $user_name = trim(str_ireplace($chat_secret, '', $name));
        $user_name = trim(str_replace(['[', ']'], '', $user_name));

        // 2. Initialize Chat Session
        $chat_id = bin2hex(random_bytes(8));
        $admin_token = bin2hex(random_bytes(16));
        $user_token = bin2hex(random_bytes(16));

        $initial_data = [
            'created_at' => time(),
            'user_name' => $user_name,
            'email' => $email,
            'admin_token' => $admin_token,
            'user_token' => $user_token,
            'admin_last_seen' => 0,
            'user_last_seen' => time(),
            'initial_message' => $message, // Store for resending invite
            'messages' => [
                [
                    'sender' => 'system',
                    'text' => 'Chat request initiated. Waiting for connection...',
                    'time' => time()
                ]
            ]
        ];

        // 3. Encrypt Data
        // Use helper from utils.php
        $file_content = encryptData($initial_data, $chat_key);

        // 4. Save to temp file
        $temp_dir = sys_get_temp_dir();
        file_put_contents($temp_dir . '/chat_' . $chat_id . '.json', $file_content);

        // 5. Notify Admin via Email
        // utils.php already loaded

        $emailSent = sendChatInvite($email, $user_name, $message, $chat_id, $admin_token);

        // 6. Return Response to User
        echo json_encode([
            "status" => "chat_start",
            "chat_id" => $chat_id,
            "user_token" => $user_token,
            "message" => "Secret detected! Chat initialized."
        ]);
        exit;
    }
    // --- END EASTER EGG ---

    // Content
    $mail->isHTML(false);
    $mail->Subject = "[Website Message] " . $name;
    $mail->Body = "Name: $name\nEmail: $email\n\nMessage:\n$message";

    $mail->send();
    echo json_encode(["status" => "success", "message" => "Message sent successfully!"]);
} catch (Exception $e) {
    http_response_code(500);
    // Log error internally, don't expose to user
    error_log("Mailer Error: {$mail->ErrorInfo}");
    echo json_encode(["status" => "error", "message" => "Failed to send message. Please try again later."]);
}
?>
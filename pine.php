<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
require_once 'utils.php'; // Load helpers globally (Encrypt/Decrypt/Env)

// Instantiate PHPMailer for normal contact form flow
$mail = new PHPMailer(true);

header('Content-Type: application/json');

// 1. Check Request Method
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
    exit;
}

// 2. Security: Honeypot (Should be empty)
if (!empty($_POST['website_url'])) {
    echo json_encode(["status" => "success", "message" => "Message sent successfully."]);
    exit;
}

// 3. Security: Time Trap
$timestamp = isset($_POST['form_timestamp']) ? intval($_POST['form_timestamp']) : 0;
if ((time() - $timestamp) < 3) {
    echo json_encode(["status" => "error", "message" => "Submission too fast. Are you human?"]);
    exit;
}

// 4. Input Sanitization
$name = filter_var(trim($_POST["name"] ?? ''), FILTER_SANITIZE_STRING);
$email = filter_var(trim($_POST["email"] ?? ''), FILTER_SANITIZE_EMAIL);
$message = filter_var(trim($_POST["message"] ?? ''), FILTER_SANITIZE_STRING);

if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please fill in all fields correctly."]);
    exit;
}

try {
    // 5. Configure PHPMailer (moved after input sanitization so $email/$name are defined)
    $mail->isSMTP();
    $mail->Host = $_ENV['SMTP_HOST'];
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['SMTP_USER'];
    $mail->Password = $_ENV['SMTP_PASS'];
    $mail->SMTPSecure = $_ENV['SMTP_SECURE'] ?? 'tls';
    $mail->Port = $_ENV['SMTP_PORT'] ?? 587;

    // Recipients
    $mail->setFrom($_ENV['FROM_EMAIL'], $_ENV['FROM_NAME']);
    $mail->addAddress($_ENV['TO_EMAIL']);
    if (!empty($_ENV['TO_TEXT_EMAIL'])) {
        $mail->addAddress($_ENV['TO_TEXT_EMAIL']);
    }
    $mail->addReplyTo($email, $name);

    // --- EASTER EGG: IRC CHECK ---
    // Check if the secret is at the end of the name
    $irc_secret = $_ENV['IRC_SECRET'] ?? 'IRC_SECRET_NOT_SET';
    $irc_key = $_ENV['IRC_KEY'] ?? 'default_insecure_key_please_change';

    if (!empty($irc_secret) && str_contains($name, $irc_secret)) {
        // 1. Clean Name (Remove Secret)
        $user_name = trim(str_ireplace($irc_secret, '', $name));
        $user_name = trim(str_replace(['[', ']'], '', $user_name));

        // 2. Initialize IRC Session
        $irc_id = bin2hex(random_bytes(8));
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
            'initial_message' => $message,
            'messages' => [
                [
                    'sender' => 'system',
                    'text' => 'IRC request initiated. Waiting for connection...',
                    'time' => time()
                ]
            ]
        ];

        // 3. Encrypt & Save
        $file_content = encryptData($initial_data, $irc_key);
        $temp_dir = sys_get_temp_dir();
        file_put_contents($temp_dir . '/irc_' . $irc_id . '.json', $file_content);

        // 4. Notify Admin (using utils.php)
        sendIRCInvite($email, $user_name, $message, $irc_id, $admin_token);

        // 5. Response
        echo json_encode([
            "status" => "irc_start",
            "irc_id" => $irc_id,
            "user_token" => $user_token,
            "message" => "Secret detected! IRC initialized."
        ]);
        exit;
    }
    // --- END EASTER EGG ---

    // 6. Send Normal Email
    $mail->isHTML(false);
    $mail->Subject = "[Website Message] " . $name;
    $mail->Body = "Name: $name\nEmail: $email\n\nMessage:\n$message";

    $mail->send();
    echo json_encode(["status" => "success", "message" => "Message sent successfully!"]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Mailer Error: {$mail->ErrorInfo}");
    echo json_encode(["status" => "error", "message" => "Failed to send message. Please try again later."]);
}
?>
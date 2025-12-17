<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

header('Content-Type: application/json');

// Load .env variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

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
$name = filter_var(trim($_POST["name"]), FILTER_SANITIZE_STRING);
$email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
$message = filter_var(trim($_POST["message"]), FILTER_SANITIZE_STRING);

if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please fill in all fields correctly."]);
    exit;
}

// 5. Send Email via PHPMailer
$mail = new PHPMailer(true);

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

    // Check if name ends with " [SECRET]" or just "SECRET" depending on preference.
    // Let's assume the user types "Wally Atkins [SECRET]"
    if (!empty($chat_secret) && str_ends_with($name, $chat_secret)) {

        // 1. Initialize Chat Session
        $chat_id = bin2hex(random_bytes(8));
        $admin_token = bin2hex(random_bytes(16));
        $user_token = bin2hex(random_bytes(16));

        $initial_data = [
            'created_at' => time(),
            'user_name' => str_replace($chat_secret, '', $name), // Clean name
            'email' => $email,
            'admin_token' => $admin_token,
            'user_token' => $user_token,
            'admin_last_seen' => 0,
            'user_last_seen' => time(),
            'messages' => [
                [
                    'sender' => 'system',
                    'text' => 'Chat request initiated. Waiting for connection...',
                    'time' => time()
                ]
            ]
        ];

        // Save to temp file
        $temp_dir = sys_get_temp_dir();
        file_put_contents($temp_dir . '/chat_' . $chat_id . '.json', json_encode($initial_data));

        // 2. Notify Admin via Email
        $mail->isHTML(true); // Switch to HTML for the link
        $mail->Subject = "[Website Chat Request] " . $initial_data['user_name'];

        // Build the Admin Link (assuming site runs on web root or current domain)
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
        $host = $_SERVER['HTTP_HOST'];
        // remove send_mail.php from path if specific, otherwise just /?
        // simple approach: link to root with params
        $admin_url = "$protocol://$host/?chat_id=$chat_id&token=$admin_token";

        $mail->Body = "
            <h2>New Chat Request!</h2>
            <p><strong>Name:</strong> {$initial_data['user_name']}</p>
            <p><strong>Email:</strong> $email</p>
            <p><strong>Message:</strong><br>$message</p>
            <p><a href='$admin_url' style='font-size: 18px; font-weight: bold; color: blue;'>CLICK HERE TO JOIN CHAT</a></p>
        ";
        // Plain text fallback
        $mail->AltBody = "Chat Request from {$initial_data['user_name']}.\nLink: $admin_url";

        $mail->send();

        // 3. Return Response to User
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
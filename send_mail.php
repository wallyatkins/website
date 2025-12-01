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
    $mail->Host       = $_ENV['SMTP_HOST'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $_ENV['SMTP_USER'];
    $mail->Password   = $_ENV['SMTP_PASS'];
    $mail->SMTPSecure = $_ENV['SMTP_SECURE']; // 'ssl' or 'tls'
    $mail->Port       = $_ENV['SMTP_PORT'];

    // Recipients
    $mail->setFrom($_ENV['FROM_EMAIL'], $_ENV['FROM_NAME']);
    $mail->addAddress($_ENV['TO_EMAIL']);
    $mail->addReplyTo($email, $name);

    // Content
    $mail->isHTML(false);
    $mail->Subject = "[Website Message] " . $name;
    $mail->Body    = "Name: $name\nEmail: $email\n\nMessage:\n$message";

    $mail->send();
    echo json_encode(["status" => "success", "message" => "Message sent successfully!"]);
} catch (Exception $e) {
    http_response_code(500);
    // Log error internally, don't expose to user
    error_log("Mailer Error: {$mail->ErrorInfo}");
    echo json_encode(["status" => "error", "message" => "Failed to send message. Please try again later."]);
}
?>

<?php
header('Content-Type: application/json');

// Configuration
$to_email = 'wallyatkins@gmail.com'; // Replace with your actual email
$subject_prefix = '[Personal Website Message] ';

// 1. Check Request Method
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
    exit;
}

// 2. Security: Honeypot (Should be empty)
if (!empty($_POST['website_url'])) {
    // Silent failure for bots
    echo json_encode(["status" => "success", "message" => "Message sent successfully."]);
    exit;
}

// 3. Security: Time Trap (Check submission speed)
$timestamp = isset($_POST['form_timestamp']) ? intval($_POST['form_timestamp']) : 0;
$current_time = time();
$min_seconds = 3;

if (($current_time - $timestamp) < $min_seconds) {
    // Too fast, likely a bot
    echo json_encode(["status" => "error", "message" => "Submission too fast. Are you human?"]);
    exit;
}

// 4. Input Sanitization & Validation
$name = filter_var(trim($_POST["name"]), FILTER_SANITIZE_STRING);
$email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
$message = filter_var(trim($_POST["message"]), FILTER_SANITIZE_STRING);

if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please fill in all fields correctly."]);
    exit;
}

// 5. Construct Email
$subject = $subject_prefix . $name;
$email_content = "Name: $name\n";
$email_content .= "Email: $email\n\n";
$email_content .= "Message:\n$message\n";

$headers = "From: $name <$email>\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// 6. Send Email
if (mail($to_email, $subject, $email_content, $headers)) {
    echo json_encode(["status" => "success", "message" => "Message sent successfully!"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to send message. Please try again later."]);
}
?>

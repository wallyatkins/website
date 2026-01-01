<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
require_once 'utils.php'; // Load helpers globally (Encrypt/Decrypt/Env)

// Instantiate PHPMailer for normal contact form flow
$pine = new PHPMailer(true);

header('Content-Type: application/json');

// 1. Check Request Method
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
    exit;
}

// Load Logic
require_once 'pine_logic.php';

// Prepare Env
$envVars = $_ENV; 
// Ensure Env is loaded (utils.php does it, but let's be safe)
if (empty($envVars['SMTP_HOST'])) {
    // If $_ENV is empty (some configs), try getenv or $_SERVER or reloading dotenv?
    // utils.php handles loading. Let's assume it's there or use a helper to hydrate an array.
    $keys = ['IRC_SECRET', 'IRC_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'SMTP_PORT', 'FROM_EMAIL', 'FROM_NAME', 'TO_EMAIL', 'TO_TEXT_EMAIL'];
    foreach ($keys as $key) {
        $envVars[$key] = getEnvVar($key);
    }
}

// Process
$result = processContactForm($_POST, $envVars, $pine);

// Response
if ($result['status'] === 'error') {
    http_response_code(400); // Or 500 depending on error? processContactForm could allow distinct codes.
    // For now, default to 400 for input errors, or just 200 with error status if that's what frontend expects?
    // Frontend expects 200 usually unless network error.
    // But original code used http_response_code(400) for validation and 500 for mailer.
    // Let's preserve 400 if message like "Please fill..." and 500 if "Failed to send".
    if (strpos($result['message'], 'Please fill') !== false || strpos($result['message'], 'Submission too fast') !== false) {
        http_response_code(400);
    } elseif (strpos($result['message'], 'Failed to send') !== false) {
        http_response_code(500);
    }
}

echo json_encode($result);
?>
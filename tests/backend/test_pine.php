<?php
// Mock Environment
$_ENV['IRC_SECRET'] = '--secret';
$_ENV['IRC_KEY'] = 'test_key';
$_ENV['SMTP_HOST'] = 'localhost';
$_ENV['SMTP_USER'] = 'test';
$_ENV['SMTP_PASS'] = 'test';
$_ENV['TO_EMAIL'] = 'admin@example.com';
$_ENV['FROM_EMAIL'] = 'admin@src.com';
$_ENV['FROM_NAME'] = 'Sender';

$is_test_mode = true; // Prevent actual email sending

require_once __DIR__ . '/../../pine_logic.php';

// Mock Input
$post = [
    'name' => 'Wally Atkins --secret',
    'email' => 'wally@example.com',
    'message' => 'Hello World'
];

$env = $_ENV;

echo "Running PHP Logic Test...\n";

// Test 1: IRC Trigger
$result = processContactForm($post, $env);
if ($result['status'] === 'irc_start') {
    echo "PASS: IRC Start Triggered\n";
    if (isset($result['irc_id']) && isset($result['user_token'])) {
        echo "PASS: Payload contains ID and Token\n";
    } else {
        echo "FAIL: Payload missing ID/Token\n";
    }
} else {
    echo "FAIL: Expected irc_start, got " . $result['status'] . "\n";
    echo "Message: " . $result['message'] . "\n";
}

// Test 2: Standard Message
$post_normal = [
    'name' => 'John Doe',
    'email' => 'john@example.com',
    'message' => 'Regular message'
];

$result_normal = processContactForm($post_normal, $env);
// Fails sending because no mailer, but should attempt normal flow.
// Logic returns "success" if mailer sends, or "error" if mailer fails.
// Since we pass no mailer and environment is mock, PHPMailer will fail connection or succeed if we mock it?
// We didn't mock PHPMailer inside logic fully, it instantiates new PHPMailer(true).
// Connection to localhost:587 likely fails.
// But we just want to verify it didn't return 'irc_start'.

if ($result_normal['status'] !== 'irc_start') {
    echo "PASS: Normal message did not trigger IRC\n";
} else {
    echo "FAIL: Normal message triggered IRC\n";
}

?>

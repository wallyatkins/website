<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once 'utils.php';
require_once 'pine_transport.php';

function processContactForm($inputInfo, $envVars, $pine = null) {
    // 1. Security: Honeypot (Should be empty)
    if (!empty($inputInfo['website_url'])) {
        return ["status" => "success", "message" => "Message sent successfully."];
    }

    // 2. Security: Time Trap
    $timestamp = isset($inputInfo['form_timestamp']) ? intval($inputInfo['form_timestamp']) : 0;
    if ((time() - $timestamp) < 3) {
        return ["status" => "error", "message" => "Submission too fast. Are you human?"];
    }

    // 3. Input Sanitization
    // Use FILTER_SANITIZE_FULL_SPECIAL_CHARS instead of STRING to preserve more characters but safely?
    // User issue: 'fhqwhgads' or secret code might be stripped.
    // 'FILTER_SANITIZE_STRING' strips tags. If secret is '--secret', it should be fine.
    // Let's use logic similar to pine.php but cleaner.
    
    $name = trim($inputInfo["name"] ?? '');
    $email = trim($inputInfo["email"] ?? '');
    $message = trim($inputInfo["message"] ?? '');

    // Sanitize
    $clean_name = filter_var($name, FILTER_SANITIZE_SPECIAL_CHARS);
    $clean_email = filter_var($email, FILTER_SANITIZE_EMAIL);
    $clean_message = filter_var($message, FILTER_SANITIZE_SPECIAL_CHARS);

    if (empty($clean_name) || empty($clean_message) || !filter_var($clean_email, FILTER_VALIDATE_EMAIL)) {
         return ["status" => "error", "message" => "Please fill in all fields correctly."];
    }

    // --- EASTER EGG: IRC CHECK ---
    // Check RAW name for secret before aggressive cleaning? 
    // Or check sanitized name?
    // If secret is '--secret', special chars might encode it to &#45;&#45;secret
    // Let's check the RAW name but just ensure we don't eval it.
    // Actually, let's look for the secret in the raw input but verifying it's safe.

    $irc_secret = $envVars['IRC_SECRET'] ?? 'IRC_SECRET_NOT_SET';
    $irc_key = $envVars['IRC_KEY'] ?? 'default_insecure_key_please_change';

    if (!empty($irc_secret) && str_contains($name, $irc_secret)) {
        // 1. Clean Name (Remove Secret)
        $user_name = trim(str_ireplace($irc_secret, '', $name));
        $user_name = trim(str_replace(['[', ']'], '', $user_name));
        // Sanitize final name
        $user_name = filter_var($user_name, FILTER_SANITIZE_SPECIAL_CHARS);

        // 2. Initialize IRC Session
        $irc_id = bin2hex(random_bytes(8));
        $admin_token = bin2hex(random_bytes(16));
        $user_token = bin2hex(random_bytes(16));

        $initial_data = [
            'created_at' => time(),
            'user_name' => $user_name,
            'email' => $clean_email,
            'admin_token' => $admin_token,
            'user_token' => $user_token,
            'admin_last_seen' => 0,
            'user_last_seen' => time(),
            'initial_message' => $clean_message,
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

    // 4. Notify Admin
    global $is_test_mode;
    if (empty($is_test_mode)) {
         sendIRCPine($clean_email, $user_name, $clean_message, $irc_id, $admin_token);
    }

    return [
        "status" => "irc_start",
        "irc_id" => $irc_id,
        "user_token" => $user_token,
        "message" => "Secret detected! IRC initialized."
    ];
}
// --- END EASTER EGG ---

// 6. Send Normal Pine
if (!$pine) {
    // Variable passed in might be null, usually we instantiate PHPMailer.
    // The argument name was $mailer. I should change the argument name too?
    // Let's assume the calling code in pine.php will update the argument name too.
    $pine = new PHPMailer(true);
}

try {
    // Configure Pine (PHPMailer)
    $pine->isSMTP();
    $pine->Host = $envVars['SMTP_HOST'];
    $pine->SMTPAuth = true;
    $pine->Username = $envVars['SMTP_USER'];
    $pine->Password = $envVars['SMTP_PASS'];
    $pine->SMTPSecure = $envVars['SMTP_SECURE'] ?? 'tls';
    $pine->Port = $envVars['SMTP_PORT'] ?? 587;

    $pine->setFrom($envVars['FROM_EMAIL'], $envVars['FROM_NAME']);
    $pine->addAddress($envVars['TO_EMAIL']);
    if (!empty($envVars['TO_TEXT_EMAIL'])) {
        $pine->addAddress($envVars['TO_TEXT_EMAIL']);
    }
    $pine->addReplyTo($clean_email, $clean_name);

    $pine->isHTML(false);
    $pine->Subject = "[Website Message] " . $clean_name;
    $pine->Body = "Name: $clean_name\nPine Address: $clean_email\n\nMessage:\n$clean_message";

    $pine->send();
    return ["status" => "success", "message" => "Pine sent successfully!"];

} catch (Exception $e) {
    return ["status" => "error", "message" => "Failed to send pine: " . $pine->ErrorInfo];
}
}
?>

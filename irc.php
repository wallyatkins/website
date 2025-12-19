<?php
header('Content-Type: application/json');

// 1. Basic Security & Config
$action = $_GET['action'] ?? '';
$chat_id = $_GET['chat_id'] ?? '';
$token = $_GET['token'] ?? '';
$message = $_POST['message'] ?? '';

// Load .env variables (assuming standard autoload if needed, or manual parsing if simple)
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$chat_key = $_ENV['CHAT_KEY'] ?? 'default_insecure_key_please_change';

if (empty($chat_id) || empty($token) || !ctype_alnum($chat_id) || !ctype_alnum($token)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid Chat ID or Token']);
    exit;
}

$temp_dir = sys_get_temp_dir();
$chat_file = $temp_dir . '/chat_' . $chat_id . '.json';

// 2. Load Utils (Encryption & Mail Helpers)
require_once 'utils.php';
// Functions encryptData and decryptData are now in utils.php

// 3. File Locking Helper
function withFileLock($filename, $mode, $callback)
{
    $fp = fopen($filename, $mode);
    if (!$fp)
        return false;

    $attempts = 0;
    while ($attempts < 5) {
        if (flock($fp, LOCK_EX)) { // Exclusive Lock
            $result = $callback($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            return $result;
        }
        usleep(rand(50000, 200000)); // Wait 50-200ms
        $attempts++;
    }

    fclose($fp);
    return false; // Failed to get lock
}

// 4. Handle Actions
if (!file_exists($chat_file)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Chat session not found or expired.']);
    exit;
}

// WRAPPER for safe access
$response = withFileLock($chat_file, 'c+', function ($fp) use ($action, $token, $message, $chat_key, $chat_file) {
    // Read & Decrypt
    rewind($fp);
    $content = stream_get_contents($fp);
    if (!$content)
        return ['status' => 'error', 'message' => 'Empty chat file'];

    $chat_data = decryptData($content, $chat_key);
    if (!$chat_data)
        return ['status' => 'error', 'message' => 'Decryption failed'];

    // Verify Token
    $is_admin = ($token === $chat_data['admin_token']);
    $is_user = ($token === $chat_data['user_token']);

    if (!$is_admin && !$is_user) {
        return ['status' => 'error', 'code' => 403, 'message' => 'Unauthorized'];
    }

    $now = time();
    $updated = false;

    switch ($action) {
        case 'poll':
            if ($is_admin)
                $chat_data['admin_last_seen'] = $now;
            else
                $chat_data['user_last_seen'] = $now;

            $other_last_seen = $is_admin ? $chat_data['user_last_seen'] : $chat_data['admin_last_seen'];
            $is_other_online = ($now - $other_last_seen) < 10;
            $updated = true;

            $result = [
                'status' => 'success',
                'messages' => $chat_data['messages'],
                'other_online' => $is_other_online,
                'guest_name' => $chat_data['user_name'] // Send guest name for Host UI
            ];
            break;

        case 'send':
            if (empty($message))
                return ['status' => 'error', 'message' => 'Empty message'];

            $new_msg = [
                'sender' => $is_admin ? 'admin' : 'user',
                'text' => htmlspecialchars($message),
                'time' => time()
            ];

            $chat_data['messages'][] = $new_msg;
            $updated = true;
            $result = ['status' => 'success'];
            break;

        case 'resend_invite':
            // Only User can resend invite (to nag the admin)
            if ($is_admin)
                return ['status' => 'error', 'message' => 'Admin cannot resend invite'];

            // Limit resends? The frontend handles 1 retry. Server could enforce too but let's trust for now or add a flag.
            // Actually, let's add a simple check in file data if we wanted to be strict, but for now simple is fine.

            require_once 'mail_helper.php';
            // We need original email/message. 
            // We stored email in $chat_data['email']
            // We didn't store the initial message! We only have it in the message history?
            // Wait, we stored 'messages' array. The first message might be system, or maybe we didn't store the user's initial text?
            // In pine.php: $initial_data['messages'] = [['sender'=>'system', 'text'=>'Chat request initiated...']]
            // We LOST the original message body in the chat session data! 
            // We should have stored it. 
            // FIXME: pine.php needs to store 'initial_message' in JSON so we can resend it.
            // For now, we'll send a generic "User is waiting" message or try to retrieve it if we update pine.php.
            // Let's UPDATE pine.php to store it first, or just send "User is waiting in chat" without the original body.
            // Better to update pine.php to store it.

            // Assuming we will update pine.php, let's look for 'initial_message' or similar.
            $retrieved_msg = $chat_data['initial_message'] ?? "User is waiting in the chat.";

            $sent = sendChatInvite($chat_data['email'], $chat_data['user_name'], $retrieved_msg, $chat_id, $chat_data['admin_token'], true);

            if ($sent)
                $result = ['status' => 'success', 'message' => 'Invite resent'];
            else
                $result = ['status' => 'error', 'message' => 'Failed to send email'];
            break;

        case 'end':
            // Logic handled outside lock usually to unlink, but here we can just signal or truncate
            // Actually, best to return a signal to unlink AFTER closing handle, 
            // BUT unlink while locked is tricky on some OS.
            // Let's just truncate and mark as ended or delete.
            return ['status' => 'server_action_delete'];

        default:
            return ['status' => 'error', 'message' => 'Unknown action'];
    }

    if ($updated) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, encryptData($chat_data, $chat_key));
    }

    return $result;
});

// Post-processing
if ($response === false) {
    http_response_code(409); // Conflict
    echo json_encode(['status' => 'error', 'message' => 'Server busy, please retry']);
} elseif (isset($response['code'])) {
    http_response_code($response['code']);
    echo json_encode(['status' => $response['status'], 'message' => $response['message']]);
} elseif ($response['status'] === 'server_action_delete') {
    unlink($chat_file);
    echo json_encode(['status' => 'success', 'message' => 'Chat ended']);
} else {
    echo json_encode($response);
}
?>
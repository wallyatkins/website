<?php
header('Content-Type: application/json');

// 1. Basic Security & Config
$action = $_GET['action'] ?? '';
$irc_id = $_GET['irc_id'] ?? '';
$token = $_GET['token'] ?? '';
$message = $_POST['message'] ?? '';

// 1. Basic Security & Config
// .env loaded by utils.php
require_once 'utils.php';
require_once 'pine_transport.php';

$irc_key = getEnvVar('IRC_KEY', 'default_insecure_key_please_change');

if (empty($irc_id) || empty($token) || !ctype_alnum($irc_id) || !ctype_alnum($token)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid IRC ID or Token']);
    exit;
}

$temp_dir = sys_get_temp_dir();
$irc_file = $temp_dir . '/irc_' . $irc_id . '.json';

// 2. Load Utils (Encryption & Mail Helpers)
// utils.php loaded at top

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
if (!file_exists($irc_file)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'IRC session not found or expired.']);
    exit;
}

// WRAPPER for safe access
$response = withFileLock($irc_file, 'c+', function ($fp) use ($action, $token, $message, $irc_key, $irc_file, $irc_id) {
    // Read & Decrypt
    rewind($fp);
    $content = stream_get_contents($fp);
    if (!$content)
        return ['status' => 'error', 'message' => 'Empty IRC file'];

    $irc_data = decryptData($content, $irc_key);
    if (!$irc_data)
        return ['status' => 'error', 'message' => 'Decryption failed'];

    // Verify Token
    $is_admin = ($token === $irc_data['admin_token']);
    $is_user = ($token === $irc_data['user_token']);

    if (!$is_admin && !$is_user) {
        return ['status' => 'error', 'code' => 403, 'message' => 'Unauthorized'];
    }

    $now = time();
    $updated = false;

    switch ($action) {
        case 'poll':
            if ($is_admin)
                $irc_data['admin_last_seen'] = $now;
            else
                $irc_data['user_last_seen'] = $now;

            $other_last_seen = $is_admin ? $irc_data['user_last_seen'] : $irc_data['admin_last_seen'];
            $is_other_online = ($now - $other_last_seen) < 10;
            $updated = true;

            $result = [
                'status' => 'success',
                'messages' => $irc_data['messages'],
                'other_online' => $is_other_online,
                'guest_name' => $irc_data['user_name'] // Send guest name for Host UI
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

            $irc_data['messages'][] = $new_msg;
            $updated = true;
            $result = ['status' => 'success'];
            break;

        case 'resend_invite':
            // Only User can resend invite (to nag the admin)
            if ($is_admin)
                return ['status' => 'error', 'message' => 'Admin cannot resend invite'];

            $retrieved_msg = $irc_data['initial_message'] ?? "User is waiting in the IRC.";

            $sent = sendIRCPine($irc_data['email'], $irc_data['user_name'], $retrieved_msg, $irc_id, $irc_data['admin_token'], true);

            if ($sent)
                $result = ['status' => 'success', 'message' => 'Invite resent'];
            else
                $result = ['status' => 'error', 'message' => 'Failed to send email'];
            break;

        case 'end':
            return ['status' => 'server_action_delete'];

        default:
            return ['status' => 'error', 'message' => 'Unknown action'];
    }

    if ($updated) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, encryptData($irc_data, $irc_key));
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
    unlink($irc_file);
    echo json_encode(['status' => 'success', 'message' => 'IRC ended']);
} else {
    echo json_encode($response);
}
?>
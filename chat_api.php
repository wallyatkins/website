<?php
header('Content-Type: application/json');

// 1. Basic Security & Config
$action = $_GET['action'] ?? '';
$chat_id = $_GET['chat_id'] ?? '';
$token = $_GET['token'] ?? '';
$message = $_POST['message'] ?? '';

if (empty($chat_id) || empty($token) || !ctype_alnum($chat_id) || !ctype_alnum($token)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid Chat ID or Token']);
    exit;
}

$temp_dir = sys_get_temp_dir();
$chat_file = $temp_dir . '/chat_' . $chat_id . '.json';

// 2. Check if Chat Exists
if (!file_exists($chat_file)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Chat session not found or expired.']);
    exit;
}

// 3. Read Chat Data
$chat_data = json_decode(file_get_contents($chat_file), true);

// 4. Verify Token (Authentication)
$is_admin = ($token === $chat_data['admin_token']);
$is_user = ($token === $chat_data['user_token']);

if (!$is_admin && !$is_user) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// 5. Handle Actions
try {
    switch ($action) {
        case 'poll':
            // Update "last seen" status
            $now = time();
            if ($is_admin) $chat_data['admin_last_seen'] = $now;
            else $chat_data['user_last_seen'] = $now;
            
            // Allow checking if the OTHER person is online (active in last 10s)
            $other_last_seen = $is_admin ? $chat_data['user_last_seen'] : $chat_data['admin_last_seen'];
            $is_other_online = ($now - $other_last_seen) < 10;

            // Save the heartbeat
            file_put_contents($chat_file, json_encode($chat_data));

            echo json_encode([
                'status' => 'success',
                'messages' => $chat_data['messages'],
                'other_online' => $is_other_online
            ]);
            break;

        case 'send':
            if (empty($message)) {
                echo json_encode(['status' => 'error', 'message' => 'Empty message']);
                exit;
            }

            $new_msg = [
                'sender' => $is_admin ? 'admin' : 'user',
                'text' => htmlspecialchars($message), // Sanitize XSS
                'time' => time()
            ];

            $chat_data['messages'][] = $new_msg;
            file_put_contents($chat_file, json_encode($chat_data));

            echo json_encode(['status' => 'success']);
            break;

        case 'end':
            unlink($chat_file);
            echo json_encode(['status' => 'success', 'message' => 'Chat ended']);
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Unknown action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server Error']);
}
?>

<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Locate SQLite database
$possiblePaths = [
    '/home4/multili2/public_html/football/data/football.sqlite',
    dirname(__DIR__) . '/football/data/football.sqlite',
    __DIR__ . '/data/football.sqlite'
];

$dbPath = null;
foreach ($possiblePaths as $path) {
    if (file_exists($path)) {
        $dbPath = $path;
        break;
    }
}

if (!$dbPath) {
    http_response_code(500);
    echo json_encode(['error' => 'Database file not found', 'checked' => $possiblePaths]);
    exit;
}

try {
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec('PRAGMA busy_timeout = 5000;');

    // Auto-create PWA telemetry tables if not existing
    $pdo->exec('CREATE TABLE IF NOT EXISTS pwa_installations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_uuid VARCHAR(64) UNIQUE NOT NULL,
        user_id INTEGER DEFAULT NULL,
        wallyauth_id VARCHAR(64) DEFAULT NULL,
        username VARCHAR(100) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        platform VARCHAR(32) NOT NULL,
        browser VARCHAR(64) DEFAULT NULL,
        display_mode VARCHAR(32) NOT NULL,
        installed_via VARCHAR(64) DEFAULT "standalone_launch",
        user_agent TEXT DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        launch_count INTEGER DEFAULT 1,
        push_enabled BOOLEAN DEFAULT 0,
        notified_commish BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );');
    $pdo->exec('CREATE TABLE IF NOT EXISTS pwa_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        installation_id INTEGER DEFAULT NULL,
        user_id INTEGER DEFAULT NULL,
        username VARCHAR(100) DEFAULT NULL,
        event_type VARCHAR(64) NOT NULL,
        details TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );');
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Load team data
$teamsPath = __DIR__ . '/src/data/teams.json';
if (!file_exists($teamsPath)) {
    $teamsPath = dirname(__DIR__) . '/football/src/Support/teams.json';
}
$allTeams = [];
if (file_exists($teamsPath)) {
    $allTeams = json_decode(file_get_contents($teamsPath), true) ?: [];
}

function getTeamInfo(string $abbr, array $allTeams): array {
    $abbr = strtoupper(trim($abbr));
    if (isset($allTeams[$abbr])) {
        return $allTeams[$abbr];
    }
    return [
        'abbr' => $abbr,
        'name' => $abbr,
        'nick' => $abbr,
        'color' => '#1e293b',
        'color2' => '#ffffff',
        'logo' => "/assets/logos/" . strtolower($abbr) . ".png"
    ];
}

function notifyCommissionerPwaInstall(PDO $pdo, array $installData): void {
    $adminEmail = 'wallyatkins@gmail.com';
    $commishPhone = '7575933306';
    $carrierGateway = 'msg.fi.google.com';

    try {
        $prefStmt = $pdo->prepare('SELECT phone_number, carrier_gateway FROM user_notification_preferences WHERE user_id = 1 LIMIT 1');
        $prefStmt->execute();
        $pref = $prefStmt->fetch();
        if ($pref && !empty($pref['phone_number'])) {
            $commishPhone = preg_replace('/\D+/', '', (string)$pref['phone_number']);
        }
        if ($pref && !empty($pref['carrier_gateway'])) {
            $carrierGateway = trim((string)$pref['carrier_gateway']);
        }
    } catch (\Throwable $e) {}

    $username = $installData['username'] ?: 'WallyAuth User';
    $email = $installData['email'] ?: 'No email';
    $platform = ucfirst($installData['platform'] ?? 'Mobile');
    $browser = $installData['browser'] ?? 'Browser';
    $installedVia = $installData['installed_via'] ?? 'standalone_launch';
    $timestamp = date('M j, Y g:i A T');

    $subject = "📱 [PWA Install] {$username} installed Wally's NFL Pick'em!";

    $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070d17; color: #f8fafc; padding: 24px; }
.card { background-color: #0d1829; border: 1px solid #1e3a5f; border-radius: 12px; max-width: 580px; margin: 0 auto; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.badge { display: inline-block; background: #0284c7; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
.row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 14px; }
.label { color: #94a3b8; }
.val { color: #f8fafc; font-weight: 600; }
</style>
</head>
<body>
<div class="card">
    <div style="margin-bottom: 16px;"><span class="badge">PWA Installation Alert</span></div>
    <h2 style="color: #38bdf8; margin: 0 0 8px 0;">🎉 App Installed by {$username}!</h2>
    <p style="color: #cbd5e1; font-size: 15px; margin: 0 0 20px 0;">
        A verified WallyAuth user has installed <strong>Wally's NFL Pick'em</strong> to their home screen.
    </p>
    <div style="background: #08101d; border: 1px solid #1e2d42; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
        <div class="row"><span class="label">User</span><span class="val">{$username}</span></div>
        <div class="row"><span class="label">Email</span><span class="val"><a href="mailto:{$email}" style="color: #38bdf8;">{$email}</a></span></div>
        <div class="row"><span class="label">Platform</span><span class="val">{$platform} ({$browser})</span></div>
        <div class="row"><span class="label">Detected Via</span><span class="val">{$installedVia}</span></div>
        <div class="row" style="border-bottom: none;"><span class="label">Time</span><span class="val">{$timestamp}</span></div>
    </div>
    <p style="color: #64748b; font-size: 12px; margin: 0;">
        PWA Telemetry Service • Wally's NFL Pick'em
    </p>
</div>
</body>
</html>
HTML;

    // Send Email (single primary to prevent duplicate inbox clutter)
    $headers = [
        "From: Wally's NFL Pick'em <noreply@wallyatkins.com>",
        "Reply-To: noreply@wallyatkins.com",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "X-Mailer: WallysNFLPickem/1.0"
    ];
    @mail($adminEmail, $subject, $htmlBody, implode("\r\n", $headers));

    // Send SMS
    if (!empty($commishPhone) && !empty($carrierGateway)) {
        $smsTarget = "{$commishPhone}@{$carrierGateway}";
        $smsMsg = "PWA Alert: {$username} installed Wally's NFL Pick'em on {$platform}!";
        $smsHeaders = [
            "From: Wally's NFL Pick'em <noreply@wallyatkins.com>",
            "Content-Type: text/plain; charset=UTF-8"
        ];
        @mail($smsTarget, "PWA Install Alert", $smsMsg, implode("\r\n", $smsHeaders));
    }
}

// Connect to PostgreSQL (WallyAuth database) if available
$pgPdo = null;
try {
    $pgHost = getenv('PG_HOST') ?: 'localhost';
    $pgPort = getenv('PG_PORT') ?: '5432';
    $pgDb   = getenv('PG_DB')   ?: 'multili2_wallyauth';
    $pgUser = getenv('PG_USER') ?: 'multili2_pg_wally_auth';
    $pgPass = getenv('PG_PASS') ?: 'JTDS1sUp@ndRunn1ng!';
    $pgPdo = new PDO("pgsql:host={$pgHost};port={$pgPort};dbname={$pgDb}", $pgUser, $pgPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 2,
    ]);
} catch (\Throwable $e) {
    $pgPdo = null;
}

// Start session if needed
if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    session_start();
}

// Resolve authenticated user across WallyAuth and Football
$currentUser = null;
$authSource = null;

if (!empty($_SESSION['user'])) {
    $currentUser = $_SESSION['user'];
    $authSource = 'session';
}

// Check WallyAuth primary trust cookie (domain .wallyatkins.com)
if (!$currentUser && !empty($_COOKIE['WALLY_AUTH_DEVICE']) && $pgPdo) {
    $cookie = (string) $_COOKIE['WALLY_AUTH_DEVICE'];
    $parts = explode(':', $cookie, 2);
    if (count($parts) === 2 && !empty($parts[0]) && !empty($parts[1])) {
        $wallyUid = $parts[0];
        $tokenHash = hash('sha256', $parts[1]);
        try {
            $stmt = $pgPdo->prepare('
                SELECT d.user_id, u.username, u.email, u.avatar_url
                FROM device_trust d
                JOIN oauth_users u ON u.id = d.user_id
                WHERE d.user_id = :uid
                  AND d.token_hash = :thash
                  AND d.revoked_at IS NULL
                  AND (d.expires_at IS NULL OR d.expires_at > CURRENT_TIMESTAMP)
                LIMIT 1
            ');
            $stmt->execute(['uid' => $wallyUid, 'thash' => $tokenHash]);
            $wallyUser = $stmt->fetch();
            if ($wallyUser) {
                // Match with Football SQLite user
                $fStmt = $pdo->prepare('SELECT id, username, email, role, avatar_url, oidc_sub FROM users WHERE oidc_sub = :sub OR lower(username) = lower(:u) OR lower(email) = lower(:e) LIMIT 1');
                $fStmt->execute([
                    'sub' => $wallyUser['user_id'],
                    'u' => $wallyUser['username'],
                    'e' => $wallyUser['email']
                ]);
                $fUser = $fStmt->fetch();
                if ($fUser) {
                    $currentUser = [
                        'id' => (int) $fUser['id'],
                        'wallyauth_id' => $wallyUser['user_id'],
                        'username' => $fUser['username'],
                        'email' => $fUser['email'] ?: $wallyUser['email'],
                        'role' => $fUser['role'] ?: 'player',
                        'avatar_url' => $wallyUser['avatar_url'] ?: $fUser['avatar_url']
                    ];
                } else {
                    $currentUser = [
                        'id' => null,
                        'wallyauth_id' => $wallyUser['user_id'],
                        'username' => $wallyUser['username'],
                        'email' => $wallyUser['email'],
                        'role' => 'player',
                        'avatar_url' => $wallyUser['avatar_url']
                    ];
                }
                $authSource = 'wallyauth';
                $_SESSION['user'] = $currentUser;
            }
        } catch (\Throwable $e) {
            // Log or ignore pg lookup error
        }
    }
}

// Check Football device token cookie (domain .wallyatkins.com)
if (!$currentUser && (!empty($_COOKIE['wally_football_device']) || !empty($_COOKIE['wally_device_token']))) {
    $cookie = $_COOKIE['wally_football_device'] ?? $_COOKIE['wally_device_token'];
    $parts = explode(':', (string)$cookie, 2);
    if (count($parts) === 2 && ctype_digit($parts[0])) {
        $uid = (int) $parts[0];
        $rawToken = $parts[1];
        $tokenHash = hash('sha256', $rawToken);
        $stmt = $pdo->prepare('SELECT u.id, u.username, u.email, u.role, u.avatar_url, u.oidc_sub FROM user_device_tokens dt JOIN users u ON u.id = dt.user_id WHERE dt.user_id = :uid AND dt.token_hash = :thash AND dt.expires_at > datetime("now") LIMIT 1');
        $stmt->execute(['uid' => $uid, 'thash' => $tokenHash]);
        $row = $stmt->fetch();
        if ($row) {
            $currentUser = [
                'id' => (int) $row['id'],
                'wallyauth_id' => $row['oidc_sub'] ?? null,
                'username' => $row['username'],
                'email' => $row['email'],
                'role' => $row['role'] ?: 'player',
                'avatar_url' => $row['avatar_url'] ?? null
            ];
            $authSource = 'football';
            $_SESSION['user'] = $currentUser;
        }
    }
}

// User override or selection via query param or session
if (!$currentUser && !empty($_GET['as_user'])) {
    $stmt = $pdo->prepare('SELECT id, username, email, role, avatar_url FROM users WHERE id = :uid OR username = :u LIMIT 1');
    $stmt->execute(['uid' => (int)$_GET['as_user'], 'u' => $_GET['as_user']]);
    $u = $stmt->fetch();
    if ($u) {
        $currentUser = $u;
        $_SESSION['user'] = $u;
    }
}

// Current Season and Active Week
$season = (int) (getenv('NFL_CURRENT_SEASON') ?: date('Y'));
$activeWeekStmt = $pdo->prepare('SELECT MIN(week_number) FROM games WHERE season_year = :s AND status != "final"');
$activeWeekStmt->execute(['s' => $season]);
$activeWeek = (int) $activeWeekStmt->fetchColumn();
if ($activeWeek <= 0) {
    // Fallback to highest week with games
    $maxWeekStmt = $pdo->prepare('SELECT MAX(week_number) FROM games WHERE season_year = :s');
    $maxWeekStmt->execute(['s' => $season]);
    $activeWeek = (int) $maxWeekStmt->fetchColumn() ?: 1;
}

$action = $_GET['action'] ?? 'matrix';

// Action: record_pwa_telemetry
if ($action === 'record_pwa_telemetry') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $clientUuid = trim((string)($input['client_uuid'] ?? $_GET['client_uuid'] ?? ''));

    if (empty($clientUuid)) {
        http_response_code(400);
        echo json_encode(['error' => 'client_uuid is required']);
        exit;
    }

    $platform = strtolower(trim((string)($input['platform'] ?? $_GET['platform'] ?? 'other')));
    $browser = trim((string)($input['browser'] ?? $_GET['browser'] ?? ''));
    $displayMode = trim((string)($input['display_mode'] ?? $_GET['display_mode'] ?? 'browser'));
    $installedVia = trim((string)($input['installed_via'] ?? $_GET['installed_via'] ?? ($displayMode === 'standalone' ? 'standalone_launch' : 'browser')));
    $eventType = trim((string)($input['event_type'] ?? $_GET['event_type'] ?? ($displayMode === 'standalone' ? 'launch' : 'visit')));
    $pushEnabled = (!empty($input['push_enabled']) || !empty($_GET['push_enabled'])) ? 1 : 0;
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

    // Detect and validate user timezone (defaults to America/New_York / Eastern)
    $timezone = trim((string)($input['timezone'] ?? $_GET['timezone'] ?? 'America/New_York'));
    if (!in_array($timezone, \DateTimeZone::listIdentifiers(), true)) {
        $timezone = 'America/New_York';
    }

    // Check if user is known from session, currentUser, or input payload
    $userId = $currentUser ? (int)$currentUser['id'] : null;
    $wallyauthId = $currentUser['wallyauth_id'] ?? null;
    $username = $currentUser['username'] ?? null;
    $email = $currentUser['email'] ?? null;

    $payloadUsername = trim((string)($input['username'] ?? $_GET['username'] ?? ''));
    if (!$userId && !empty($payloadUsername)) {
        $stmtU = $pdo->prepare('SELECT id, username, email, role, oidc_sub FROM users WHERE username = :u LIMIT 1');
        $stmtU->execute(['u' => $payloadUsername]);
        $uFound = $stmtU->fetch();
        if ($uFound) {
            $userId = (int)$uFound['id'];
            $username = $uFound['username'];
            $email = $uFound['email'];
            $wallyauthId = $uFound['oidc_sub'] ?? null;
        }
    }

    // Check existing installation record
    $checkStmt = $pdo->prepare('SELECT * FROM pwa_installations WHERE client_uuid = :uuid LIMIT 1');
    $checkStmt->execute(['uuid' => $clientUuid]);
    $existing = $checkStmt->fetch();

    $isFirstInstall = false;
    $shouldNotify = false;

    // Check if this user has ALREADY been recorded and notified for an installation on ANY device/session
    $userAlreadyNotified = false;
    $lookupUser = $userId;
    $lookupName = $username ?: $payloadUsername;

    if ($lookupUser || !empty($lookupName)) {
        $priorCheck = $pdo->prepare('
            SELECT id FROM pwa_installations 
            WHERE (
                (:uid > 0 AND user_id = :uid) 
                OR (:uname != "" AND lower(username) = lower(:uname))
            ) AND notified_commish = 1
            LIMIT 1
        ');
        $priorCheck->execute([
            'uid' => $lookupUser ?: 0,
            'uname' => $lookupName ?: ''
        ]);
        if ($priorCheck->fetch()) {
            $userAlreadyNotified = true;
        }
    }

    if ($existing) {
        $instId = (int)$existing['id'];
        
        $finalUserId = $existing['user_id'] ?: $userId;
        $finalUsername = $existing['username'] ?: $username;
        $finalEmail = $existing['email'] ?: $email;
        $finalWallyAuthId = $existing['wallyauth_id'] ?: $wallyauthId;
        $notifiedCommish = (int)$existing['notified_commish'];

        // If this installation was not yet notified, but the user was already notified on another device, suppress notification
        if ($userAlreadyNotified) {
            $notifiedCommish = 1;
            $shouldNotify = false;
        } elseif (!empty($finalUsername) && $notifiedCommish === 0 && ($installedVia === 'appinstalled_event')) {
            // Only notify on a genuine new install event, never on simple launch/update
            $shouldNotify = true;
            $notifiedCommish = 1;
        }

        $updateStmt = $pdo->prepare('
            UPDATE pwa_installations 
            SET user_id = :uid,
                wallyauth_id = :waid,
                username = :uname,
                email = :email,
                platform = :plat,
                browser = :brow,
                timezone = :tz,
                display_mode = :disp,
                installed_via = CASE WHEN pwa_installations.installed_via = "standalone_launch" THEN pwa_installations.installed_via ELSE :via END,
                user_agent = :ua,
                ip_address = :ip,
                last_seen_at = datetime("now"),
                launch_count = launch_count + 1,
                push_enabled = CASE WHEN :push = 1 THEN 1 ELSE push_enabled END,
                notified_commish = :notified
            WHERE id = :id
        ');
        $updateStmt->execute([
            'uid' => $finalUserId,
            'waid' => $finalWallyAuthId,
            'uname' => $finalUsername,
            'email' => $finalEmail,
            'plat' => $platform,
            'brow' => $browser,
            'tz' => $timezone,
            'disp' => $displayMode,
            'via' => $installedVia,
            'ua' => $userAgent,
            'ip' => $ipAddress,
            'push' => $pushEnabled,
            'notified' => $notifiedCommish,
            'id' => $instId
        ]);
    } else {
        $finalUserId = $userId;
        $finalUsername = $username;
        $finalEmail = $email;
        $finalWallyAuthId = $wallyauthId;

        if ($userAlreadyNotified) {
            $notifiedCommish = 1;
            $shouldNotify = false;
            $isFirstInstall = false;
        } else {
            $isFirstInstall = true;
            $notifiedCommish = 0;
            // Only trigger notification if explicitly installed via event or first standalone launch of brand new user
            if (!empty($username) && ($installedVia === 'appinstalled_event' || $displayMode === 'standalone')) {
                $shouldNotify = true;
                $notifiedCommish = 1;
            }
        }

        $insertStmt = $pdo->prepare('
            INSERT INTO pwa_installations (
                client_uuid, user_id, wallyauth_id, username, email,
                platform, browser, timezone, display_mode, installed_via,
                user_agent, ip_address, installed_at, last_seen_at,
                launch_count, push_enabled, notified_commish
            ) VALUES (
                :uuid, :uid, :waid, :uname, :email,
                :plat, :brow, :tz, :disp, :via,
                :ua, :ip, datetime("now"), datetime("now"),
                1, :push, :notified
            )
        ');
        $insertStmt->execute([
            'uuid' => $clientUuid,
            'uid' => $userId,
            'waid' => $wallyauthId,
            'uname' => $username,
            'email' => $email,
            'plat' => $platform,
            'brow' => $browser,
            'tz' => $timezone,
            'disp' => $displayMode,
            'via' => $installedVia,
            'ua' => $userAgent,
            'ip' => $ipAddress,
            'push' => $pushEnabled,
            'notified' => $notifiedCommish
        ]);
        $instId = (int)$pdo->lastInsertId();
    }

    // Update user profile timezone across users and preferences
    if ($finalUserId && !empty($timezone)) {
        try {
            $pdo->prepare('UPDATE users SET timezone = :tz WHERE id = :uid')->execute(['tz' => $timezone, 'uid' => $finalUserId]);
            $pdo->prepare('UPDATE user_notification_preferences SET timezone = :tz WHERE user_id = :uid')->execute(['tz' => $timezone, 'uid' => $finalUserId]);
        } catch (\Throwable $e) {}
    }

    // Log to activity logs
    try {
        $logStmt = $pdo->prepare('
            INSERT INTO pwa_activity_logs (installation_id, user_id, username, event_type, details)
            VALUES (:iid, :uid, :uname, :etype, :details)
        ');
        $logStmt->execute([
            'iid' => $instId,
            'uid' => $userId,
            'uname' => $username,
            'etype' => $eventType,
            'details' => json_encode([
                'display_mode' => $displayMode,
                'platform' => $platform,
                'browser' => $browser,
                'installed_via' => $installedVia,
                'is_first_install' => $isFirstInstall
            ])
        ]);
    } catch (\Throwable $e) {}

    // Dispatch notification to commissioner
    if ($shouldNotify && !empty($username)) {
        notifyCommissionerPwaInstall($pdo, [
            'username' => $username,
            'email' => $email,
            'wallyauth_id' => $wallyauthId,
            'platform' => $platform,
            'browser' => $browser,
            'installed_via' => $installedVia
        ]);
    }

    echo json_encode([
        'success' => true,
        'installation_id' => $instId,
        'client_uuid' => $clientUuid,
        'matched_user' => $username ? [
            'id' => $userId,
            'username' => $username,
            'email' => $email,
            'wallyauth_id' => $wallyauthId
        ] : null,
        'is_first_install' => $isFirstInstall,
        'notified' => $shouldNotify
    ]);
    exit;
}

// Action: pwa_metrics
if ($action === 'pwa_metrics') {
    $isAdmin = !empty($currentUser) && in_array($currentUser['role'] ?? '', ['admin', 'commissioner'], true);
    if (!$isAdmin && ($currentUser['username'] ?? '') !== 'wallyatkins') {
        $token = $_GET['secret'] ?? '';
        if ($token !== 'commish_wally') {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied: Commissioner privileges required']);
            exit;
        }
    }

    $totalInstalls = (int)$pdo->query('SELECT count(*) FROM pwa_installations')->fetchColumn();
    $authInstalls = (int)$pdo->query('SELECT count(*) FROM pwa_installations WHERE user_id IS NOT NULL OR username IS NOT NULL')->fetchColumn();
    $anonInstalls = $totalInstalls - $authInstalls;

    $platformBreakdown = $pdo->query('
        SELECT platform, count(*) as count 
        FROM pwa_installations 
        GROUP BY platform
        ORDER BY count DESC
    ')->fetchAll();

    $installations = $pdo->query('
        SELECT p.*, u.avatar_url 
        FROM pwa_installations p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.last_seen_at DESC
        LIMIT 100
    ')->fetchAll();

    $recentActivity = $pdo->query('
        SELECT * FROM pwa_activity_logs 
        ORDER BY created_at DESC 
        LIMIT 50
    ')->fetchAll();

    echo json_encode([
        'success' => true,
        'summary' => [
            'total_installations' => $totalInstalls,
            'authenticated_installations' => $authInstalls,
            'anonymous_installations' => $anonInstalls,
            'platforms' => $platformBreakdown
        ],
        'installations' => $installations,
        'recent_activity' => $recentActivity
    ]);
    exit;
}

// Action: get_notification_preferences
if ($action === 'get_notification_preferences') {
    $uid = $currentUser ? (int)$currentUser['id'] : null;
    $prefs = [
        'user_id' => $uid,
        'timezone' => 'America/New_York',
        'phone_number' => '',
        'carrier_gateway' => 'msg.fi.google.com',
        'email_pick_reminders' => false,
        'sms_pick_reminders' => false,
        'push_pick_reminders' => false,
        'mud_tells' => false,
        'mud_combat' => false,
        'task_due_reminders' => false
    ];

    if ($uid) {
        $stmt = $pdo->prepare('SELECT * FROM user_notification_preferences WHERE user_id = :uid LIMIT 1');
        $stmt->execute(['uid' => $uid]);
        $row = $stmt->fetch();
        if ($row) {
            $prefs['timezone'] = $row['timezone'] ?: 'America/New_York';
            $prefs['phone_number'] = $row['phone_number'] ?: '';
            $prefs['carrier_gateway'] = $row['carrier_gateway'] ?: 'msg.fi.google.com';
            $prefs['email_pick_reminders'] = (bool)$row['email_pick_reminders'];
            $prefs['sms_pick_reminders'] = (bool)$row['sms_pick_reminders'];
            $prefs['push_pick_reminders'] = (bool)$row['push_pick_reminders'];
        }
    }

    echo json_encode(['success' => true, 'preferences' => $prefs]);
    exit;
}

// Action: update_notification_preferences
if ($action === 'update_notification_preferences') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $uid = $currentUser ? (int)$currentUser['id'] : null;

    if ($uid) {
        $tz = trim((string)($input['timezone'] ?? 'America/New_York'));
        $phone = preg_replace('/[^\d+]/', '', (string)($input['phone_number'] ?? ''));
        $gateway = trim((string)($input['carrier_gateway'] ?? 'msg.fi.google.com'));
        $emailReminders = !empty($input['email_pick_reminders']) ? 1 : 0;
        $smsReminders = !empty($input['sms_pick_reminders']) ? 1 : 0;
        $pushReminders = !empty($input['push_pick_reminders']) ? 1 : 0;

        $stmt = $pdo->prepare('
            INSERT INTO user_notification_preferences (
                user_id, email_pick_reminders, sms_pick_reminders, push_pick_reminders, 
                phone_number, carrier_gateway, timezone, updated_at
            ) VALUES (
                :uid, :email, :sms, :push, :phone, :gateway, :tz, CURRENT_TIMESTAMP
            ) ON CONFLICT(user_id) DO UPDATE SET
                email_pick_reminders = excluded.email_pick_reminders,
                sms_pick_reminders = excluded.sms_pick_reminders,
                push_pick_reminders = excluded.push_pick_reminders,
                phone_number = excluded.phone_number,
                carrier_gateway = excluded.carrier_gateway,
                timezone = excluded.timezone,
                updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute([
            'uid' => $uid,
            'email' => $emailReminders,
            'sms' => $smsReminders,
            'push' => $pushReminders,
            'phone' => $phone,
            'gateway' => $gateway,
            'tz' => $tz
        ]);

        try {
            $pdo->prepare('UPDATE users SET timezone = :tz WHERE id = :uid')->execute(['tz' => $tz, 'uid' => $uid]);
        } catch (\Throwable $e) {}
    }

    echo json_encode(['success' => true]);
    exit;
}

// Action: get_vapid_public_key
if ($action === 'get_vapid_public_key') {
    $vapidPath = '/home4/multili2/public_html/football/data/vapid_keys.json';
    $pubKey = 'BFBW-Tuv08pmgvrWRwOqtB-pzFt5FJlSzeJmh__L2Xj_Ox-0stAajePOhPJJGSgYERBxwzrCqyMZskP0hZu9xwY';
    if (file_exists($vapidPath)) {
        $keys = json_decode(file_get_contents($vapidPath), true);
        if (!empty($keys['public_key'])) {
            $pubKey = $keys['public_key'];
        }
    }
    echo json_encode(['success' => true, 'publicKey' => $pubKey]);
    exit;
}

// Action: get_latest_unread_notification
if ($action === 'get_latest_unread_notification') {
    $userId = !empty($currentUser) ? (int)$currentUser['id'] : null;
    $row = null;
    if ($userId) {
        $stmt = $pdo->prepare('SELECT * FROM in_app_notifications WHERE user_id = :uid ORDER BY id DESC LIMIT 1');
        $stmt->execute(['uid' => $userId]);
        $row = $stmt->fetch();
    }
    if (!$row) {
        $stmt = $pdo->query('SELECT * FROM in_app_notifications ORDER BY id DESC LIMIT 1');
        $row = $stmt->fetch();
    }
    echo json_encode($row ?: [
        'title' => "Wally's NFL Pick'em",
        'message' => "Hey Derek! 👋 Commissioner Wally says test push successful! 🏈",
        'link' => '/pickem'
    ]);
    exit;
}

// Action: save_push_subscription
if ($action === 'save_push_subscription') {
    $input = json_decode(file_get_contents('php://input'), true);
    $endpoint = trim($input['endpoint'] ?? '');
    $p256dh = trim($input['keys']['p256dh'] ?? $input['p256dh'] ?? '');
    $auth = trim($input['keys']['auth'] ?? $input['auth'] ?? '');
    $clientUuid = trim($input['client_uuid'] ?? '');
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;

    if (empty($endpoint) || empty($p256dh) || empty($auth)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing endpoint or encryption keys']);
        exit;
    }

    $userId = !empty($currentUser) ? (int)$currentUser['id'] : null;

    // Fallback: match via client_uuid in pwa_installations if session cookie was lost
    if (!$userId && $clientUuid) {
        $lookupStmt = $pdo->prepare('SELECT user_id, username FROM pwa_installations WHERE client_uuid = :uuid AND user_id IS NOT NULL LIMIT 1');
        $lookupStmt->execute(['uuid' => $clientUuid]);
        $row = $lookupStmt->fetch();
        if ($row) {
            $userId = (int)$row['user_id'];
            if (empty($currentUser)) {
                $currentUser = ['id' => $userId, 'username' => $row['username']];
            }
        }
    }

    if ($userId) {
        $stmt = $pdo->prepare('
            INSERT INTO user_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at)
            VALUES (:uid, :ep, :p256, :auth, :ua, datetime("now"))
            ON CONFLICT(endpoint) DO UPDATE SET
                user_id = excluded.user_id,
                p256dh = excluded.p256dh,
                auth = excluded.auth,
                user_agent = excluded.user_agent
        ');
        $stmt->execute([
            'uid' => $userId,
            'ep' => $endpoint,
            'p256' => $p256dh,
            'auth' => $auth,
            'ua' => $ua
        ]);

        // Update push_enabled in pwa_installations
        $updInst = $pdo->prepare('UPDATE pwa_installations SET push_enabled = 1, last_seen_at = datetime("now") WHERE user_id = :uid OR client_uuid = :uuid');
        $updInst->execute(['uid' => $userId, 'uuid' => $clientUuid]);

        // Ensure user notification preferences record push enabled
        $updPrefs = $pdo->prepare('
            INSERT INTO user_notification_preferences (user_id, push_pick_reminders)
            VALUES (:uid, 1)
            ON CONFLICT(user_id) DO UPDATE SET push_pick_reminders = 1, updated_at = datetime("now")
        ');
        $updPrefs->execute(['uid' => $userId]);

        // Log to activity logs
        $logStmt = $pdo->prepare('
            INSERT INTO pwa_activity_logs (user_id, username, event_type, details, created_at)
            VALUES (:uid, :uname, "push_subscribed", :details, datetime("now"))
        ');
        $logStmt->execute([
            'uid' => $userId,
            'uname' => $currentUser['username'] ?? 'User #' . $userId,
            'details' => json_encode(['platform' => 'ios_web_push', 'user_agent' => $ua])
        ]);

        // Send a test welcome push notification right to their device!
        try {
            $webPushFile = '/home4/multili2/public_html/football/src/Services/WebPushService.php';
            if (file_exists($webPushFile)) {
                require_once '/home4/multili2/public_html/football/src/Database/Connection.php';
                require_once $webPushFile;
                $wps = new \WallyFootball\Services\WebPushService();
                $displayName = $currentUser['username'] ?? 'there';
                $wps->sendPushNotification($userId, "Wally's NFL Pick'em", "Hey {$displayName}! 👋 Lock screen notifications are now active on your device!", "/pickem");
            }
        } catch (\Throwable $t) {
            error_log('[WebPush Init] ' . $t->getMessage());
        }

        echo json_encode(['success' => true, 'user_id' => $userId]);
        exit;
    }

    http_response_code(401);
    echo json_encode(['error' => 'Authentication required to activate push notifications']);
    exit;
}

// Action: switch_user (Disabled per league integrity / security request)
if ($action === 'switch_user') {
    http_response_code(403);
    echo json_encode(['error' => 'Profile switching for testing has been disabled']);
    exit;
}

// Action: logout
if ($action === 'logout') {
    unset($_SESSION['user']);
    $domain = str_contains($_SERVER['HTTP_HOST'] ?? '', 'wallyatkins.com') ? '.wallyatkins.com' : '';
    setcookie('wally_football_device', '', ['expires' => time() - 3600, 'path' => '/', 'domain' => $domain, 'httponly' => true, 'samesite' => 'Lax']);
    setcookie('wally_device_token', '', ['expires' => time() - 3600, 'path' => '/', 'domain' => $domain, 'httponly' => true, 'samesite' => 'Lax']);
    echo json_encode(['success' => true]);
    exit;
}

// Action: auth_status / me
if ($action === 'auth_status' || $action === 'me') {
    echo json_encode([
        'is_authenticated' => ($currentUser !== null),
        'auth_source' => $authSource,
        'user' => $currentUser ? [
            'id' => $currentUser['id'] ? (int)$currentUser['id'] : null,
            'wallyauth_id' => $currentUser['wallyauth_id'] ?? null,
            'username' => $currentUser['username'],
            'email' => $currentUser['email'] ?? null,
            'role' => $currentUser['role'] ?? 'player',
            'avatar_url' => $currentUser['avatar_url'] ?? null
        ] : null
    ]);
    exit;
}

// Action: users_list
if ($action === 'users_list') {
    $users = $pdo->query('SELECT id, username, role, avatar_url FROM users ORDER BY username ASC')->fetchAll();
    echo json_encode(['users' => $users]);
    exit;
}

// Action: meta
if ($action === 'meta') {
    // Only past weeks and current week (do NOT show future weeks)
    $availableWeeks = range(1, $activeWeek);

    echo json_encode([
        'season' => $season,
        'current_week' => $activeWeek,
        'available_weeks' => $availableWeeks,
        'is_authenticated' => ($currentUser !== null),
        'auth_source' => $authSource,
        'user' => $currentUser ? [
            'id' => $currentUser['id'] ? (int)$currentUser['id'] : null,
            'wallyauth_id' => $currentUser['wallyauth_id'] ?? null,
            'username' => $currentUser['username'],
            'email' => $currentUser['email'] ?? null,
            'role' => $currentUser['role'] ?? 'player',
            'avatar_url' => $currentUser['avatar_url'] ?? null
        ] : null
    ]);
    exit;
}

// Action: matrix
if ($action === 'matrix' || $action === 'week_data') {
    $requestedWeek = isset($_GET['week']) ? (int)$_GET['week'] : $activeWeek;
    // Cap at current active week (no future weeks)
    if ($requestedWeek > $activeWeek) {
        $requestedWeek = $activeWeek;
    }
    if ($requestedWeek < 1) {
        $requestedWeek = 1;
    }

    // 1. Fetch games for this week
    $gamesStmt = $pdo->prepare('SELECT * FROM games WHERE season_year = :s AND week_number = :w ORDER BY kickoff_time ASC, id ASC');
    $gamesStmt->execute(['s' => $season, 'w' => $requestedWeek]);
    $rawGames = $gamesStmt->fetchAll();

    $now = time();
    $games = [];
    $tiebreakerGame = null;

    foreach ($rawGames as $g) {
        $hInfo = getTeamInfo($g['home_team'], $allTeams);
        $aInfo = getTeamInfo($g['away_team'], $allTeams);
        $kt = strtotime($g['kickoff_time']);
        $isStarted = $kt <= $now || in_array($g['status'], ['in_progress', 'final'], true);
        $isFinal = ($g['status'] === 'final');
        
        $winningTeam = null;
        if ($isFinal && $g['home_score'] !== null && $g['away_score'] !== null) {
            if ($g['home_score'] > $g['away_score']) {
                $winningTeam = $g['home_team'];
            } elseif ($g['away_score'] > $g['home_score']) {
                $winningTeam = $g['away_team'];
            }
        }

        $formattedGame = [
            'id' => (int)$g['id'],
            'home_team' => $g['home_team'],
            'away_team' => $g['away_team'],
            'home_name' => $hInfo['name'],
            'away_name' => $aInfo['name'],
            'home_nick' => $hInfo['nick'],
            'away_nick' => $aInfo['nick'],
            'home_color' => $hInfo['color'],
            'away_color' => $aInfo['color'],
            'home_color2' => $hInfo['color2'] ?? '#ffffff',
            'away_color2' => $aInfo['color2'] ?? '#ffffff',
            'home_logo' => $hInfo['logo'],
            'away_logo' => $aInfo['logo'],
            'kickoff_time' => $g['kickoff_time'],
            'kickoff_timestamp' => $kt,
            'is_mnf' => !empty($g['is_mnf']),
            'status' => $g['status'],
            'home_score' => $g['home_score'],
            'away_score' => $g['away_score'],
            'is_started' => $isStarted,
            'is_locked' => $isStarted,
            'is_final' => $isFinal,
            'winning_team' => $winningTeam
        ];

        if (!empty($g['is_mnf']) && !$tiebreakerGame) {
            $tiebreakerGame = $formattedGame;
        }

        $games[] = $formattedGame;
    }

    // 2. Fetch all entries and standings for this week
    $entriesStmt = $pdo->prepare('SELECT e.id as entry_id, e.user_id, e.mnf_total_points_prediction, e.is_locked, u.username, u.avatar_url FROM pickem_entries e JOIN users u ON u.id = e.user_id WHERE e.season_year = :s AND e.week_number = :w ORDER BY u.username ASC');
    $entriesStmt->execute(['s' => $season, 'w' => $requestedWeek]);
    $entries = $entriesStmt->fetchAll();

    // 3. Fetch all picks for this week
    $picksStmt = $pdo->prepare('SELECT p.entry_id, p.game_id, p.selected_team FROM pickem_picks p JOIN pickem_entries e ON e.id = p.entry_id WHERE e.season_year = :s AND e.week_number = :w');
    $picksStmt->execute(['s' => $season, 'w' => $requestedWeek]);
    $allPicks = $picksStmt->fetchAll();

    $picksByEntry = [];
    foreach ($allPicks as $p) {
        $picksByEntry[(int)$p['entry_id']][(int)$p['game_id']] = $p['selected_team'];
    }

    $isCommissioner = $currentUser && in_array($currentUser['role'] ?? '', ['admin', 'commissioner'], true);
    $currentUserId = $currentUser ? (int)$currentUser['id'] : null;

    $participants = [];
    $currentUserEntry = null;
    $currentUserPicks = [];

    foreach ($entries as $e) {
        $eid = (int)$e['entry_id'];
        $uid = (int)$e['user_id'];
        $isMe = ($currentUserId === $uid);
        $userPicksMap = $picksByEntry[$eid] ?? [];

        if ($isMe) {
            $currentUserEntry = $e;
            $currentUserPicks = $userPicksMap;
        }

        $correctCount = 0;
        $gradedCount = 0;
        $formattedPicks = [];

        foreach ($games as $g) {
            $gid = $g['id'];
            $selected = $userPicksMap[$gid] ?? null;
            $isGameStarted = $g['is_started'];
            $winningTeam = $g['winning_team'];

            $isRevealed = $isMe || $isCommissioner || $isGameStarted;

            $result = 'pending';
            if ($g['is_final']) {
                $gradedCount++;
                if ($selected && $winningTeam) {
                    if ($selected === $winningTeam) {
                        $result = 'correct';
                        $correctCount++;
                    } else {
                        $result = 'incorrect';
                    }
                } elseif ($winningTeam === null) {
                    $result = 'push';
                }
            }

            $formattedPicks[(string)$gid] = [
                'game_id' => $gid,
                'selected_team' => $isRevealed ? $selected : null,
                'is_revealed' => $isRevealed,
                'result' => $result
            ];
        }

        $participants[] = [
            'entry_id' => $eid,
            'user_id' => $uid,
            'username' => $e['username'],
            'is_me' => $isMe,
            'avatar_url' => $e['avatar_url'],
            'correct_count' => $correctCount,
            'graded_count' => $gradedCount,
            'mnf_points_prediction' => $e['mnf_total_points_prediction'],
            'picks' => $formattedPicks
        ];
    }

    // Sort participants by score descending, then username
    usort($participants, function ($a, $b) {
        if ($b['correct_count'] !== $a['correct_count']) {
            return $b['correct_count'] <=> $a['correct_count'];
        }
        return strcmp($a['username'], $b['username']);
    });

    // Determine current user pick status
    $hasSubmitted = !empty($currentUserEntry) && count($currentUserPicks) > 0;
    $picksCount = count($currentUserPicks);
    $totalGames = count($games);
    $missingPicks = (!$hasSubmitted || $picksCount < $totalGames);

    $hasPushSub = false;
    if ($currentUser && !empty($currentUser['id'])) {
        $subCheck = $pdo->prepare('SELECT id FROM user_push_subscriptions WHERE user_id = :uid LIMIT 1');
        $subCheck->execute(['uid' => (int)$currentUser['id']]);
        $hasPushSub = (bool)$subCheck->fetch();
    }

    echo json_encode([
        'season' => $season,
        'week' => $requestedWeek,
        'current_week' => $activeWeek,
        'is_current_week' => ($requestedWeek === $activeWeek),
        'games' => $games,
        'tiebreaker_game' => $tiebreakerGame,
        'participants' => $participants,
        'current_user_status' => [
            'is_authenticated' => ($currentUser !== null),
            'auth_source' => $authSource,
            'user' => $currentUser ? [
                'id' => $currentUser['id'] ? (int)$currentUser['id'] : null,
                'wallyauth_id' => $currentUser['wallyauth_id'] ?? null,
                'username' => $currentUser['username'],
                'email' => $currentUser['email'] ?? null,
                'role' => $currentUser['role'] ?? 'player',
                'avatar_url' => $currentUser['avatar_url'] ?? null
            ] : null,
            'has_submitted' => $hasSubmitted,
            'picks_count' => $picksCount,
            'total_games' => $totalGames,
            'missing_picks' => $missingPicks,
            'user_picks' => $currentUserPicks,
            'mnf_points' => $currentUserEntry['mnf_total_points_prediction'] ?? null,
            'push_enabled' => $hasPushSub
        ]
    ]);
    exit;
}

// Action: save_picks
if ($action === 'save_picks') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }

    $userId = $currentUser ? (int)$currentUser['id'] : null;
    if (!$userId && isset($input['user_id'])) {
        $userId = (int)$input['user_id'];
    }

    if (!$userId) {
        http_response_code(401);
        echo json_encode(['error' => 'You must be logged in to save picks']);
        exit;
    }

    $week = isset($input['week']) ? (int)$input['week'] : $activeWeek;
    $picks = $input['picks'] ?? [];
    $mnfPoints = isset($input['mnf_prediction']) && $input['mnf_prediction'] !== '' ? (int)$input['mnf_prediction'] : null;

    $now = time();

    // Fetch existing entry or create
    $entryStmt = $pdo->prepare('SELECT id FROM pickem_entries WHERE user_id = :uid AND season_year = :s AND week_number = :w');
    $entryStmt->execute(['uid' => $userId, 's' => $season, 'w' => $week]);
    $entryId = $entryStmt->fetchColumn();

    $pdo->beginTransaction();
    try {
        if (!$entryId) {
            $insertEntry = $pdo->prepare('INSERT INTO pickem_entries (user_id, season_year, week_number, mnf_total_points_prediction, is_locked) VALUES (:uid, :s, :w, :mnf, 1)');
            $insertEntry->execute([
                'uid' => $userId,
                's' => $season,
                'w' => $week,
                'mnf' => $mnfPoints
            ]);
            $entryId = (int)$pdo->lastInsertId();
        } else {
            $updateEntry = $pdo->prepare('UPDATE pickem_entries SET mnf_total_points_prediction = :mnf, is_locked = 1 WHERE id = :eid');
            $updateEntry->execute(['mnf' => $mnfPoints, 'eid' => $entryId]);
        }

        // Fetch open games (cannot pick games that have started)
        $gamesStmt = $pdo->prepare('SELECT id, home_team, away_team, kickoff_time, status FROM games WHERE season_year = :s AND week_number = :w');
        $gamesStmt->execute(['s' => $season, 'w' => $week]);
        $weekGames = $gamesStmt->fetchAll();

        $upsertPick = $pdo->prepare('INSERT INTO pickem_picks (entry_id, game_id, selected_team) VALUES (:eid, :gid, :sel) ON CONFLICT(entry_id, game_id) DO UPDATE SET selected_team = :sel, updated_at = datetime("now")');

        $savedCount = 0;
        foreach ($weekGames as $g) {
            $gid = (int)$g['id'];
            if (!isset($picks[$gid])) {
                continue;
            }
            $selected = strtoupper(trim($picks[$gid]));
            if (!in_array($selected, [strtoupper($g['home_team']), strtoupper($g['away_team'])], true)) {
                continue;
            }

            // Check if game started
            $kt = strtotime($g['kickoff_time']);
            if ($kt <= $now && !in_array($currentUser['role'] ?? '', ['admin', 'commissioner'], true)) {
                // Locked game, skip
                continue;
            }

            $upsertPick->execute([
                'eid' => $entryId,
                'gid' => $gid,
                'sel' => $selected
            ]);
            $savedCount++;
        }

        $pdo->commit();
        echo json_encode([
            'success' => true,
            'message' => "Picks successfully saved! ({$savedCount} games picked)",
            'week' => $week,
            'saved_count' => $savedCount
        ]);
        exit;
    } catch (\Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save picks: ' . $e->getMessage()]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Unknown action: ' . $action]);

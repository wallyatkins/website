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

// Start session if needed
if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    session_start();
}

// Resolve authenticated user
$currentUser = null;
if (!empty($_SESSION['user'])) {
    $currentUser = $_SESSION['user'];
} elseif (!empty($_COOKIE['wally_device_token'])) {
    $cookie = $_COOKIE['wally_device_token'];
    $parts = explode(':', $cookie, 2);
    if (count($parts) === 2 && ctype_digit($parts[0])) {
        $uid = (int) $parts[0];
        $rawToken = $parts[1];
        $tokenHash = hash('sha256', $rawToken);
        $stmt = $pdo->prepare('SELECT u.id, u.username, u.email, u.role FROM user_device_tokens dt JOIN users u ON u.id = dt.user_id WHERE dt.user_id = :uid AND dt.token_hash = :thash AND dt.expires_at > datetime("now") LIMIT 1');
        $stmt->execute(['uid' => $uid, 'thash' => $tokenHash]);
        $row = $stmt->fetch();
        if ($row) {
            $currentUser = $row;
            $_SESSION['user'] = $row;
        }
    }
}

// Default fallback to user 1 (Wally) if testing or requested via query
if (!$currentUser && isset($_GET['as_user'])) {
    $stmt = $pdo->prepare('SELECT id, username, email, role FROM users WHERE id = :uid OR username = :u LIMIT 1');
    $stmt->execute(['uid' => (int)$_GET['as_user'], 'u' => $_GET['as_user']]);
    $u = $stmt->fetch();
    if ($u) {
        $currentUser = $u;
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

// Action: meta
if ($action === 'meta') {
    // Only past weeks and current week (do NOT show future weeks)
    $availableWeeks = range(1, $activeWeek);

    echo json_encode([
        'season' => $season,
        'current_week' => $activeWeek,
        'available_weeks' => $availableWeeks,
        'user' => $currentUser ? [
            'id' => (int)$currentUser['id'],
            'username' => $currentUser['username'],
            'email' => $currentUser['email'],
            'role' => $currentUser['role'] ?? 'player'
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
            'user' => $currentUser ? [
                'id' => (int)$currentUser['id'],
                'username' => $currentUser['username'],
                'email' => $currentUser['email'],
                'role' => $currentUser['role'] ?? 'player'
            ] : null,
            'has_submitted' => $hasSubmitted,
            'picks_count' => $picksCount,
            'total_games' => $totalGames,
            'missing_picks' => $missingPicks,
            'user_picks' => $currentUserPicks,
            'mnf_points' => $currentUserEntry['mnf_total_points_prediction'] ?? null
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

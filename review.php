<?php
/**
 * review.php – website reviews (saved in data/reviews.json)
 *
 *   GET  review.php  → returns visible reviews as JSON
 *   POST review.php  → saves a new review
 *
 * Manage reviews: open data/reviews.json in Hostinger File Manager.
 *   Hide a review:   "show": true  →  "show": false
 *   Delete a review: remove its { ... } block
 */
declare(strict_types=1);

const DATA_DIR      = __DIR__ . '/data';
const REVIEWS_FILE  = DATA_DIR . '/reviews.json';
const RATE_FILE     = DATA_DIR . '/rate-limit.json';
const MAX_REVIEWS   = 1000; // keep the newest 1000
const WAIT_SECONDS  = 60;   // one review per minute per visitor
const DAILY_LIMIT   = 5;    // max reviews per visitor per day

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

function out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function setup_data_dir(): void {
    if (!is_dir(DATA_DIR) && !@mkdir(DATA_DIR, 0755, true)) {
        out(['ok' => false, 'error' => 'Server setup: cannot create the data folder.'], 500);
    }
    $ht = DATA_DIR . '/.htaccess';   // block direct access to the data folder
    if (!file_exists($ht)) {
        @file_put_contents($ht, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    }
    if (!file_exists(DATA_DIR . '/index.html')) @file_put_contents(DATA_DIR . '/index.html', '');
    if (!file_exists(REVIEWS_FILE)) @file_put_contents(REVIEWS_FILE, "[]\n");
}

/** Open a JSON file with an exclusive lock, run $fn on its data, save what $fn returns. */
function with_locked_json(string $file, callable $fn) {
    $fp = @fopen($file, 'c+');
    if (!$fp) out(['ok' => false, 'error' => 'Server setup: the data folder is not writable.'], 500);
    flock($fp, LOCK_EX);
    $data = json_decode(stream_get_contents($fp) ?: '[]', true);
    if (!is_array($data)) $data = [];
    [$newData, $result] = $fn($data);
    if ($newData !== null) {
        rewind($fp);
        ftruncate($fp, 0);
        fwrite($fp, json_encode($newData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
        fflush($fp);
    }
    flock($fp, LOCK_UN);
    fclose($fp);
    return $result;
}

function public_review(array $r): array {
    return [
        'name'    => (string)($r['name'] ?? ''),
        'service' => (string)($r['service'] ?? ''),
        'rating'  => max(1, min(5, (int)($r['rating'] ?? 5))),
        'text'    => (string)($r['text'] ?? ''),
        'date'    => (string)($r['date'] ?? ''),
    ];
}

function clean(string $v, int $max, bool $multiline = false): string {
    if (!mb_check_encoding($v, 'UTF-8')) return '';
    $v = strip_tags($v);
    $v = str_replace("\r", '', $v);
    $v = (string)preg_replace($multiline ? '/[\x00-\x09\x0B-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u', ' ', $v);
    if ($multiline) $v = (string)preg_replace("/\n{3,}/", "\n\n", $v);
    return mb_substr(trim($v), 0, $max);
}

function visitor_key(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if ($ip === '' && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    if ($ip === '') $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return hash('sha256', $ip);
}

setup_data_dir();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ---------- GET: list reviews ---------- */
if ($method === 'GET') {
    $all = json_decode((string)@file_get_contents(REVIEWS_FILE), true);
    if (!is_array($all)) $all = [];
    $visible = array_filter($all, fn($r) => is_array($r) && !empty($r['name']) && !empty($r['text']) && ($r['show'] ?? true) !== false);
    usort($visible, fn($a, $b) => strcmp((string)($b['date'] ?? ''), (string)($a['date'] ?? '')));
    out(['ok' => true, 'reviews' => array_map('public_review', array_values($visible))]);
}

if ($method !== 'POST') out(['ok' => false, 'error' => 'Method not allowed'], 405);

/* ---------- POST: add review ---------- */
// only accept posts from this website
$host = strtolower(preg_replace(['/^www\./', '/:\d+$/'], '', (string)($_SERVER['HTTP_HOST'] ?? '')));
$from = (string)($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '');
if ($from !== '') {
    $fromHost = strtolower(preg_replace('/^www\./', '', (string)parse_url($from, PHP_URL_HOST)));
    if ($fromHost !== $host) out(['ok' => false, 'error' => 'Forbidden'], 403);
}

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;
if (!empty($in['_honey'])) out(['ok' => true]);  // bot trap

$name    = clean((string)($in['name'] ?? ''), 60);
$service = clean((string)($in['service'] ?? ''), 60);
$text    = clean((string)($in['text'] ?? ''), 600, true);
$rating  = max(1, min(5, (int)($in['rating'] ?? 5)));

if ($name === '' || mb_strlen($text) < 10) out(['ok' => false, 'error' => 'Please add your name and a review of at least 10 characters.'], 400);
if (preg_match('~https?://|www\.|\.(com|net|ru|xyz|top)\b~i', $name . ' ' . $text)) out(['ok' => false, 'error' => 'Please remove links from your review.'], 400);

// rate limit
$key = visitor_key();
$now = time();
$limitMsg = with_locked_json(RATE_FILE, function (array $rl) use ($key, $now) {
    foreach ($rl as $k => $times) {
        $rl[$k] = array_values(array_filter((array)$times, fn($t) => $now - (int)$t < 86400));
        if (!$rl[$k]) unset($rl[$k]);
    }
    $times = $rl[$key] ?? [];
    if ($times && $now - max($times) < WAIT_SECONDS) return [$rl, 'Thank you! Please wait a minute before posting another review.'];
    if (count($times) >= DAILY_LIMIT) return [$rl, 'You have reached the daily review limit. Thank you!'];
    $rl[$key][] = $now;
    return [$rl, ''];
});
if ($limitMsg !== '') out(['ok' => false, 'error' => $limitMsg], 429);

$review = [
    'name'    => $name,
    'service' => $service,
    'rating'  => $rating,
    'text'    => $text,
    'date'    => gmdate('c'),
    'show'    => true,
];

with_locked_json(REVIEWS_FILE, function (array $all) use ($review) {
    foreach (array_slice($all, 0, 50) as $r) {   // ignore exact duplicates
        if (is_array($r) && ($r['name'] ?? '') === $review['name'] && ($r['text'] ?? '') === $review['text']) return [null, null];
    }
    array_unshift($all, $review);
    return [array_slice($all, 0, MAX_REVIEWS), null];
});

out(['ok' => true, 'review' => public_review($review)]);

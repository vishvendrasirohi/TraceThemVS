<?php
// Free OSINT enrichment — Gravatar, GitHub, Keybase (no API keys needed)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

$body    = json_decode(file_get_contents('php://input'), true) ?: [];
$email   = strtolower(trim($body['email']   ?? ''));
$name    = $body['name']    ?? '';
$aliases = $body['aliases'] ?? '';

$result = ['gravatar' => false, 'github' => null, 'keybase' => null, 'emailDomain' => null];

// 1. Gravatar — HEAD request, 200 = has profile picture linked to this email
if ($email) {
    $emailMd5 = md5($email);
    $result['emailDomain'] = substr(strrchr($email, '@'), 1) ?: null;
    $ch = curl_init("https://www.gravatar.com/avatar/{$emailMd5}?d=404");
    curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5]);
    curl_exec($ch);
    $result['gravatar'] = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
    curl_close($ch);
}

// 2. Build username candidates from name + aliases
$rawNames  = array_filter(array_merge([$name], array_map('trim', explode(',', $aliases))));
$usernames = array_unique(array_filter(array_map(function ($n) {
    return substr(preg_replace('/[^a-z0-9-]/', '', strtolower(preg_replace('/\s+/', '', $n))), 0, 39);
}, $rawNames), function ($u) { return strlen($u) >= 3; }));

foreach (array_slice(array_values($usernames), 0, 4) as $username) {
    // GitHub
    if (!$result['github']) {
        $ch = curl_init("https://api.github.com/users/{$username}");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_USERAGENT      => 'TraceThem-OSINT/1.0',
        ]);
        $ghBody = curl_exec($ch);
        $ghCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($ghCode === 200) {
            $g = json_decode($ghBody, true);
            $result['github'] = ['found' => true, 'username' => $username, 'displayName' => $g['name'] ?? null, 'bio' => $g['bio'] ?? null, 'publicRepos' => $g['public_repos'] ?? 0];
        }
    }
    // Keybase
    if (!$result['keybase']) {
        $ch = curl_init("https://keybase.io/{$username}/pic");
        curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 4, CURLOPT_FOLLOWLOCATION => true]);
        curl_exec($ch);
        $kbCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($kbCode === 200) $result['keybase'] = ['found' => true, 'username' => $username];
    }
    if ($result['github'] && $result['keybase']) break;
}

echo json_encode($result);

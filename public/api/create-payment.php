<?php
// SabPaisa PG 3.0 — Payment Session Creator
// This file runs on Hostinger's PHP server. Credentials never reach the browser.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

// ── Credentials (production) ─────────────────────────────────────────────────
$SP_MERCHANT_ID = 'TRAC1';
$SP_API_KEY     = 'sp_HGO6nXJUt4HU8LycB1osNai6f2O2LocUuOjJsqRt_R8';
$SP_SECRET_KEY  = 'sec_rldUqOPfdQe4iftN7fVeFMyK2AGB44MSK6RDmYvYA2c';
$SABPAISA_API   = 'https://merchant-api.sabpaisa.in/api/v2/payments';

// ── Parse request ────────────────────────────────────────────────────────────
$body          = json_decode(file_get_contents('php://input'), true) ?: [];
$amount        = $body['amount']        ?? null;
$type          = $body['type']          ?? null;
$customerName  = $body['customerName']  ?? 'User';
$customerEmail = $body['customerEmail'] ?? 'user@tracethem.online';
$customerPhone = $body['customerPhone'] ?? '9999999999';

if (!$amount || !$type) {
    http_response_code(400);
    echo json_encode(['error' => 'amount and type are required']);
    exit;
}

// ── Build transaction ────────────────────────────────────────────────────────
$prefix        = ($type === 'reveal') ? 'TRC' : 'WIPE';
$merchantTxnId = $prefix . '_' . round(microtime(true) * 1000);
$amountPaise   = (int) round((float) $amount * 100);
$currency      = 'INR';
$timestamp     = time();

// HMAC-SHA256 checksum: merchantId|merchantTxnId|amount|currency|timestamp
$base     = "{$SP_MERCHANT_ID}|{$merchantTxnId}|{$amountPaise}|{$currency}|{$timestamp}";
$checksum = strtolower(hash_hmac('sha256', $base, $SP_SECRET_KEY));

// ── Return URL — auto-detects domain, works on any host ──────────────────────
$scheme    = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host      = $_SERVER['HTTP_HOST'] ?? 'tracethem.online';
$returnUrl = "{$scheme}://{$host}/payment/result?type={$type}&merchantTxnId={$merchantTxnId}";

// ── Call SabPaisa API ────────────────────────────────────────────────────────
$payload = json_encode([
    'merchantId'    => $SP_MERCHANT_ID,
    'merchantTxnId' => $merchantTxnId,
    'amount'        => $amountPaise,
    'currency'      => $currency,
    'customerName'  => $customerName,
    'customerEmail' => $customerEmail,
    'customerPhone' => $customerPhone,
    'returnUrl'     => $returnUrl,
    'checksum'      => $checksum,
    'timestamp'     => $timestamp,
]);

$ch = curl_init($SABPAISA_API);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'X-Api-Key: ' . $SP_API_KEY,
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if (!$response || $curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach SabPaisa: ' . $curlErr]);
    exit;
}

$data = json_decode($response, true);

if ($httpCode !== 200 || empty($data['checkoutUrl'])) {
    http_response_code(502);
    echo json_encode(['error' => 'SabPaisa rejected the request', 'details' => $data]);
    exit;
}

// Append clientSecret to checkout URL if provided
$checkoutUrl = !empty($data['clientSecret'])
    ? $data['checkoutUrl'] . '?clientSecret=' . $data['clientSecret']
    : $data['checkoutUrl'];

echo json_encode([
    'checkoutUrl'   => $checkoutUrl,
    'paymentId'     => $data['paymentId']     ?? '',
    'sabpaisaTxnId' => $data['sabpaisaTxnId'] ?? $data['paymentId'] ?? '',
    'merchantTxnId' => $merchantTxnId,
]);

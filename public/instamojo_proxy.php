<?php
/**
 * Instamojo Payment Proxy for TraceThem with Logging
 */

// 1. CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Content-Type: application/json");

// 2. Logging Setup
$log_file = "instamojo_debug.log";
function log_msg($msg) {
    global $log_file;
    $timestamp = date("Y-m-d H:i:s");
    file_put_contents($log_file, "[$timestamp] $msg\n", FILE_APPEND);
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 3. Configuration
$api_key = "7e580a7ff8a12b541f6378184b478d35";
$auth_token = "3dcd8c959327012aee997f7a0a644486";
$api_endpoint = "https://www.instamojo.com/api/1.1/payment-requests/";

log_msg("--- New Request Started ---");

// 4. Process the POST Request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = $_POST;
    // Environment toggle support: pass env=test to use Instamojo sandbox
    $env = isset($payload['env']) ? strtolower($payload['env']) : (isset($_GET['env']) ? strtolower($_GET['env']) : 'prod');
    if ($env === 'test') {
        $api_endpoint = "https://test.instamojo.com/api/1.1/payment-requests/";
        log_msg("Environment: TEST (Using sandbox endpoint)");
    } else {
        log_msg("Environment: PROD (Using production endpoint)");
    }
    if (empty($payload)) {
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true);
        log_msg("Payload received via php://input (JSON)");
    } else {
        log_msg("Payload received via \$_POST");
    }

    if (empty($payload)) {
        log_msg("ERROR: Empty payload received.");
        echo json_encode(["success" => false, "message" => "Empty payload received."]);
        exit;
    }

    log_msg("Target Purpose: " . ($payload['purpose'] ?? 'N/A'));
    log_msg("Amount: " . ($payload['amount'] ?? 'N/A'));

    // Prepare the CURL request to Instamojo
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $api_endpoint);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, TRUE);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-Api-Key: $api_key",
        "X-Auth-Token: $auth_token"
    ]);
    
    curl_setopt($ch, CURLOPT_POST, TRUE);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    log_msg("Instamojo HTTP Code: $http_code");

    if ($error) {
        log_msg("CURL ERROR: $error");
        echo json_encode(["success" => false, "message" => "CURL Error: " . $error]);
    } else {
        log_msg("Response from Instamojo: " . $response);
        http_response_code($http_code);
        echo $response;
    }
} else {
    log_msg("ERROR: Only POST requests allowed. Method: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(["success" => false, "message" => "Only POST requests are allowed."]);
}
?>

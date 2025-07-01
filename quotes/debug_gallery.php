<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
$host = 'localhost';
$dbname = 'u148986826_bluefit';
$username = 'u148986826_bluefit';
$password = 'Bananeta1234@';

// Log function for debugging
function debug_log($message) {
    error_log(date('Y-m-d H:i:s') . " - Gallery Debug: " . $message . PHP_EOL, 3, 'gallery_debug.log');
}

debug_log("Gallery tracking request received");

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    debug_log("Database connection successful");
    
    // Get raw input
    $raw_input = file_get_contents('php://input');
    debug_log("Raw input: " . $raw_input);
    
    // Get JSON data
    $input = json_decode($raw_input, true);
    debug_log("Decoded input: " . print_r($input, true));
    
    if ($input) {
        $session_id = $input['session_id'] ?? 'unknown';
        $action = $input['action'] ?? 'unknown';
        $item = $input['item'] ?? 'unknown';
        $type = $input['type'] ?? 'unknown';
        $timestamp = $input['timestamp'] ?? date('c');
        
        debug_log("Session ID: $session_id, Action: $action, Item: $item, Type: $type");
        
        // Check if table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'gallery_interactions'");
        if ($stmt->rowCount() == 0) {
            debug_log("ERROR: gallery_interactions table does not exist");
            echo json_encode(['status' => 'error', 'message' => 'Table does not exist']);
            exit;
        }
        
        debug_log("Table exists, inserting data");
        
        // Insert gallery interaction
        $stmt = $pdo->prepare("INSERT INTO gallery_interactions (session_id, action, item, type, interaction_time) VALUES (?, ?, ?, ?, ?)");
        $result = $stmt->execute([$session_id, $action, $item, $type, date('Y-m-d H:i:s', strtotime($timestamp))]);
        
        if ($result) {
            debug_log("Insert successful");
            echo json_encode(['status' => 'success', 'inserted_id' => $pdo->lastInsertId()]);
        } else {
            debug_log("Insert failed");
            echo json_encode(['status' => 'error', 'message' => 'Insert failed']);
        }
    } else {
        debug_log("No valid JSON data received");
        echo json_encode(['status' => 'error', 'message' => 'No data received']);
    }
    
} catch(PDOException $e) {
    debug_log("Database error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} catch(Exception $e) {
    debug_log("General error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
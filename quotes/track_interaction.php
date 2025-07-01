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

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get JSON data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input) {
        $session_id = $input['session_id'];
        $time_spent = $input['time_spent'];
        $interactions = $input['interactions'];
        $scroll_depth = $input['scroll_depth'];
        $is_active = isset($input['is_active']) ? $input['is_active'] : false;
        
        if ($is_active) {
            // Update existing record for active session
            $stmt = $pdo->prepare("UPDATE quote_views SET time_spent = ?, interactions = ?, scroll_depth = ?, last_activity = NOW() WHERE session_id = ? ORDER BY view_time DESC LIMIT 1");
            $stmt->execute([$time_spent, $interactions, $scroll_depth, $session_id]);
        } else {
            // Final update when page unloads
            $stmt = $pdo->prepare("UPDATE quote_views SET time_spent = ?, interactions = ?, scroll_depth = ?, session_ended = NOW() WHERE session_id = ? ORDER BY view_time DESC LIMIT 1");
            $stmt->execute([$time_spent, $interactions, $scroll_depth, $session_id]);
        }
        
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No data received']);
    }
    
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
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
        $action = $input['action'];
        $item = $input['item'];
        $type = $input['type'];
        $timestamp = $input['timestamp'];
        
        // Insert gallery interaction
        $stmt = $pdo->prepare("INSERT INTO gallery_interactions (session_id, action, item, type, interaction_time) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$session_id, $action, $item, $type, date('Y-m-d H:i:s', strtotime($timestamp))]);
        
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No data received']);
    }
    
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
<?php
/**
 * Endpoint to handle tracking events from JavaScript
 */

require_once 'tracking_functions.php';

// Check if request is POST and contains JSON
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON data
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    
    if ($data && isset($data['event_type'])) {
        switch ($data['event_type']) {
            case 'page_view':
                // Record page visit
                $page_name = $data['page_name'] ?? 'Unknown Page';
                $visit_id = recordPageVisit($page_name);
                
                // Store additional data
                if (isset($data['screen_width']) && isset($data['screen_height'])) {
                    $resolution = $data['screen_width'] . 'x' . $data['screen_height'];
                    
                    $pdo = connectDB();
                    if ($pdo) {
                        $stmt = $pdo->prepare("
                            UPDATE page_visits 
                            SET screen_resolution = ? 
                            WHERE id = ?
                        ");
                        $stmt->execute([$resolution, $visit_id]);
                    }
                }
                
                // Start timing the visit
                if (session_status() == PHP_SESSION_NONE) {
                    session_start();
                }
                $_SESSION['visit_start_time'] = time();
                
                echo json_encode(['success' => true, 'visit_id' => $visit_id]);
                break;
                
            case 'update_duration':
                // Update visit duration
                $duration = $data['duration'] ?? 0;
                $is_exit = $data['is_exit'] ?? false;
                
                if (session_status() == PHP_SESSION_NONE) {
                    session_start();
                }
                
                if (isset($_SESSION['current_visit_id'])) {
                    $visit_id = $_SESSION['current_visit_id'];
                    
                    $pdo = connectDB();
                    if ($pdo) {
                        $stmt = $pdo->prepare("
                            UPDATE page_visits 
                            SET visit_duration = ? 
                            WHERE id = ?
                        ");
                        $stmt->execute([$duration, $visit_id]);
                        
                        // If this is an exit event, update exit page
                        if ($is_exit) {
                            $stmt = $pdo->prepare("
                                UPDATE page_visits 
                                SET exit_page = ? 
                                WHERE id = ?
                            ");
                            $stmt->execute([$_SERVER['REQUEST_URI'], $visit_id]);
                            
                            // Update session end time
                            if (isset($_SESSION['tracking_session_id'])) {
                                $stmt = $pdo->prepare("
                                    UPDATE user_sessions 
                                    SET end_time = NOW(), 
                                        total_duration = ?, 
                                        is_bounce = ?
                                    WHERE session_id = ?
                                ");
                                $is_bounce = ($_SESSION['tracking_pages_viewed'] ?? 0) <= 1;
                                $stmt->execute([$duration, $is_bounce ? 1 : 0, $_SESSION['tracking_session_id']]);
                            }
                        }
                    }
                }
                
                echo json_encode(['success' => true]);
                break;
                
            case 'click':
            case 'form_submit':
            case 'video_play':
            case 'scroll_depth':
                // Record user interaction
                $interaction_type = $data['event_type'];
                $interaction_detail = $data['interaction_detail'] ?? '';
                $element_id = $data['element_id'] ?? '';
                $element_class = $data['element_class'] ?? '';
                $element_type = $data['element_type'] ?? '';
                
                $interaction_id = recordInteraction(
                    $interaction_type,
                    $interaction_detail,
                    $element_id,
                    $element_class,
                    $element_type
                );
                
                echo json_encode(['success' => true, 'interaction_id' => $interaction_id]);
                break;
                
            default:
                // Unknown event type
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Unknown event type']);
                break;
        }
    } else {
        // Invalid JSON data
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
    }
} else {
    // Method not allowed
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

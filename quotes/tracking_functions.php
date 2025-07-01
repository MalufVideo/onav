<?php
/**
 * Tracking functions for On+Av quote pages
 */

// Database connection
function connectDB() {
    $host = 'localhost';
    $dbname = 'onav_tracking';
    $username = 'root'; // Change to your database username
    $password = ''; // Change to your database password
    
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        // Log error instead of displaying it
        error_log("Database connection failed: " . $e->getMessage());
        return false;
    }
}

// Get visitor IP address
function getVisitorIP() {
    $ip = '';
    
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    
    return $ip;
}

// Get visitor location data using IP
function getVisitorLocation($ip) {
    if ($ip == '127.0.0.1' || $ip == '::1') {
        return [
            'country' => 'Local',
            'city' => 'Development'
        ];
    }
    
    // Using free IP geolocation API
    $url = "http://ip-api.com/json/{$ip}";
    $response = @file_get_contents($url);
    
    if ($response) {
        $data = json_decode($response, true);
        if ($data && $data['status'] == 'success') {
            return [
                'country' => $data['country'],
                'city' => $data['city']
            ];
        }
    }
    
    return [
        'country' => 'Unknown',
        'city' => 'Unknown'
    ];
}

// Get browser and OS information
function getBrowserInfo() {
    $user_agent = $_SERVER['HTTP_USER_AGENT'];
    
    // Browser detection
    $browser = 'Unknown';
    $browser_version = '';
    
    if (preg_match('/MSIE|Trident/i', $user_agent)) {
        $browser = 'Internet Explorer';
        preg_match('/MSIE\s([0-9\.]+)/i', $user_agent, $matches);
        if (empty($matches)) {
            preg_match('/Trident\/([0-9\.]+)/i', $user_agent, $matches);
            $browser_version = $matches[1] ?? '';
        } else {
            $browser_version = $matches[1] ?? '';
        }
    } elseif (preg_match('/Firefox/i', $user_agent)) {
        $browser = 'Firefox';
        preg_match('/Firefox\/([0-9\.]+)/i', $user_agent, $matches);
        $browser_version = $matches[1] ?? '';
    } elseif (preg_match('/Chrome/i', $user_agent)) {
        $browser = 'Chrome';
        preg_match('/Chrome\/([0-9\.]+)/i', $user_agent, $matches);
        $browser_version = $matches[1] ?? '';
    } elseif (preg_match('/Safari/i', $user_agent)) {
        $browser = 'Safari';
        preg_match('/Version\/([0-9\.]+)/i', $user_agent, $matches);
        $browser_version = $matches[1] ?? '';
    } elseif (preg_match('/Opera/i', $user_agent)) {
        $browser = 'Opera';
        preg_match('/Opera\/([0-9\.]+)/i', $user_agent, $matches);
        $browser_version = $matches[1] ?? '';
    } elseif (preg_match('/Edge/i', $user_agent)) {
        $browser = 'Edge';
        preg_match('/Edge\/([0-9\.]+)/i', $user_agent, $matches);
        $browser_version = $matches[1] ?? '';
    }
    
    // OS detection
    $os = 'Unknown';
    
    if (preg_match('/Windows/i', $user_agent)) {
        $os = 'Windows';
    } elseif (preg_match('/Mac/i', $user_agent)) {
        $os = 'Mac';
    } elseif (preg_match('/Linux/i', $user_agent)) {
        $os = 'Linux';
    } elseif (preg_match('/Android/i', $user_agent)) {
        $os = 'Android';
    } elseif (preg_match('/iOS/i', $user_agent) || preg_match('/iPhone|iPad|iPod/i', $user_agent)) {
        $os = 'iOS';
    }
    
    // Device type detection
    $is_mobile = preg_match('/Mobile|Android|iPhone|iPad|iPod/i', $user_agent);
    $is_tablet = preg_match('/Tablet|iPad/i', $user_agent);
    $is_desktop = !$is_mobile && !$is_tablet;
    
    $device_type = $is_mobile ? 'Mobile' : ($is_tablet ? 'Tablet' : 'Desktop');
    
    return [
        'browser' => $browser,
        'browser_version' => $browser_version,
        'operating_system' => $os,
        'device_type' => $device_type,
        'is_mobile' => $is_mobile,
        'is_tablet' => $is_tablet,
        'is_desktop' => $is_desktop,
        'user_agent' => $user_agent
    ];
}

// Record page visit
function recordPageVisit($page_name) {
    $pdo = connectDB();
    if (!$pdo) return false;
    
    $visitor_ip = getVisitorIP();
    $location = getVisitorLocation($visitor_ip);
    $browser_info = getBrowserInfo();
    
    // Create or resume session
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    // Generate unique session ID if not exists
    if (!isset($_SESSION['tracking_session_id'])) {
        $_SESSION['tracking_session_id'] = session_id();
        $_SESSION['tracking_start_time'] = time();
        $_SESSION['tracking_pages_viewed'] = 0;
        
        // Record new session
        $stmt = $pdo->prepare("
            INSERT INTO user_sessions 
            (session_id, visitor_ip, start_time) 
            VALUES (?, ?, NOW())
        ");
        $stmt->execute([$_SESSION['tracking_session_id'], $visitor_ip]);
        $_SESSION['tracking_session_db_id'] = $pdo->lastInsertId();
    }
    
    // Increment pages viewed
    $_SESSION['tracking_pages_viewed']++;
    
    // Update session data
    $stmt = $pdo->prepare("
        UPDATE user_sessions 
        SET total_pages_viewed = ?, end_time = NOW(), 
            total_duration = TIMESTAMPDIFF(SECOND, start_time, NOW())
        WHERE session_id = ?
    ");
    $stmt->execute([$_SESSION['tracking_pages_viewed'], $_SESSION['tracking_session_id']]);
    
    // Record page visit
    $stmt = $pdo->prepare("
        INSERT INTO page_visits 
        (page_name, visitor_ip, visitor_user_agent, visit_date, 
         referrer_url, landing_page, country, city, browser, 
         browser_version, operating_system, device_type, 
         is_mobile, is_tablet, is_desktop) 
        VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $referrer = $_SERVER['HTTP_REFERER'] ?? '';
    $landing_page = $_SERVER['REQUEST_URI'];
    
    $stmt->execute([
        $page_name,
        $visitor_ip,
        $browser_info['user_agent'],
        $referrer,
        $landing_page,
        $location['country'],
        $location['city'],
        $browser_info['browser'],
        $browser_info['browser_version'],
        $browser_info['operating_system'],
        $browser_info['device_type'],
        $browser_info['is_mobile'] ? 1 : 0,
        $browser_info['is_tablet'] ? 1 : 0,
        $browser_info['is_desktop'] ? 1 : 0
    ]);
    
    $visit_id = $pdo->lastInsertId();
    $_SESSION['current_visit_id'] = $visit_id;
    
    return $visit_id;
}

// Record user interaction
function recordInteraction($interaction_type, $interaction_detail, $element_id = '', $element_class = '', $element_type = '') {
    $pdo = connectDB();
    if (!$pdo) return false;
    
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['current_visit_id'])) {
        return false;
    }
    
    $visit_id = $_SESSION['current_visit_id'];
    
    $stmt = $pdo->prepare("
        INSERT INTO visitor_interactions 
        (visit_id, interaction_type, interaction_detail, interaction_time, 
         element_id, element_class, element_type) 
        VALUES (?, ?, ?, NOW(), ?, ?, ?)
    ");
    
    $stmt->execute([
        $visit_id,
        $interaction_type,
        $interaction_detail,
        $element_id,
        $element_class,
        $element_type
    ]);
    
    return $pdo->lastInsertId();
}

// Update visit duration
function updateVisitDuration() {
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['current_visit_id']) || !isset($_SESSION['visit_start_time'])) {
        return false;
    }
    
    $visit_id = $_SESSION['current_visit_id'];
    $duration = time() - $_SESSION['visit_start_time'];
    
    $pdo = connectDB();
    if (!$pdo) return false;
    
    $stmt = $pdo->prepare("
        UPDATE page_visits 
        SET visit_duration = ? 
        WHERE id = ?
    ");
    
    $stmt->execute([$duration, $visit_id]);
    
    return true;
}

// Check if user is admin
function isAdmin() {
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

// Admin login
function adminLogin($username, $password) {
    $pdo = connectDB();
    if (!$pdo) return false;
    
    $stmt = $pdo->prepare("
        SELECT id, username, password 
        FROM admin_users 
        WHERE username = ?
    ");
    
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && password_verify($password, $user['password'])) {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_id'] = $user['id'];
        $_SESSION['admin_username'] = $user['username'];
        
        // Update last login
        $stmt = $pdo->prepare("
            UPDATE admin_users 
            SET last_login = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$user['id']]);
        
        return true;
    }
    
    return false;
}

// Admin logout
function adminLogout() {
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    unset($_SESSION['admin_logged_in']);
    unset($_SESSION['admin_id']);
    unset($_SESSION['admin_username']);
    
    return true;
}

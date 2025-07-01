<?php
// Database configuration
$host = 'localhost';
$dbname = 'u148986826_bluefit';
$username = 'u148986826_bluefit';
$password = 'Bananeta1234@';

echo "<h2>Gallery Tracking Debug Test</h2>";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Database connection successful<br><br>";
    
    // Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'gallery_interactions'");
    if ($stmt->rowCount() > 0) {
        echo "✅ gallery_interactions table exists<br><br>";
        
        // Check table structure
        $stmt = $pdo->query("DESCRIBE gallery_interactions");
        echo "<strong>Table Structure:</strong><br>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr>";
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "<tr>";
            echo "<td>" . $row['Field'] . "</td>";
            echo "<td>" . $row['Type'] . "</td>";
            echo "<td>" . $row['Null'] . "</td>";
            echo "<td>" . $row['Key'] . "</td>";
            echo "<td>" . ($row['Default'] ?? 'NULL') . "</td>";
            echo "</tr>";
        }
        echo "</table><br><br>";
        
        // Count total records
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM gallery_interactions");
        $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        echo "<strong>Total records in gallery_interactions:</strong> $total<br><br>";
        
        // Show recent records if any
        if ($total > 0) {
            $stmt = $pdo->query("SELECT * FROM gallery_interactions ORDER BY created_at DESC LIMIT 10");
            echo "<strong>Recent Gallery Interactions:</strong><br>";
            echo "<table border='1' style='border-collapse: collapse;'>";
            echo "<tr><th>ID</th><th>Session ID</th><th>Action</th><th>Item</th><th>Type</th><th>Time</th></tr>";
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                echo "<tr>";
                echo "<td>" . $row['id'] . "</td>";
                echo "<td>" . substr($row['session_id'], 0, 10) . "...</td>";
                echo "<td>" . $row['action'] . "</td>";
                echo "<td>" . $row['item'] . "</td>";
                echo "<td>" . $row['type'] . "</td>";
                echo "<td>" . $row['interaction_time'] . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        } else {
            echo "ℹ️ No gallery interactions recorded yet.";
        }
        
    } else {
        echo "❌ gallery_interactions table does NOT exist<br>";
        echo "Please import the gallery_update.sql file first.";
    }
    
} catch(PDOException $e) {
    echo "❌ Database error: " . $e->getMessage();
}

echo "<br><br><strong>Next steps:</strong><br>";
echo "1. Make sure gallery_interactions table exists<br>";
echo "2. Visit bluefit.php and open browser developer tools (F12)<br>";
echo "3. Go to Console tab<br>";
echo "4. Click on gallery images<br>";
echo "5. Check console for tracking messages<br>";
echo "6. Refresh this page to see if data was recorded<br>";
?>

<script>
// Add a simple test button
document.write('<br><br><button onclick="testTracking()">Test Gallery Tracking</button><br><br>');

function testTracking() {
    console.log('Testing gallery tracking...');
    
    const data = {
        session_id: 'test_session_' + Date.now(),
        action: 'opened',
        item: 'test_image.jpg',
        type: 'image',
        timestamp: new Date().toISOString()
    };
    
    fetch('debug_gallery.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Test tracking response:', result);
        alert('Test completed! Check console and refresh page to see results.');
    })
    .catch(error => {
        console.error('Test tracking error:', error);
        alert('Test failed! Check console for errors.');
    });
}
</script>
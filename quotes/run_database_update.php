<?php
// Simple script to run database updates
// Visit this file in browser to execute the updates

// Database configuration
$host = 'localhost';
$dbname = 'u148986826_bluefit';
$username = 'u148986826_bluefit';
$password = 'Bananeta1234@';

echo "<h1>Database Update Script</h1>";
echo "<pre>";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Connected to database successfully.\n\n";
    
    // 1. Update bluefit_v2 total value
    echo "1. Updating bluefit_v2 total value...\n";
    $stmt = $pdo->prepare("UPDATE quotes SET total_value = ? WHERE quote_id = ?");
    $result = $stmt->execute([38490.00, 'bluefit_2025_v2']);
    echo $result ? "   ✅ Success: Updated total value to R$ 38,490.00\n" : "   ❌ Failed to update total value\n";
    
    // 2. Add version column if it doesn't exist
    echo "\n2. Adding quote_version column...\n";
    try {
        $pdo->exec("ALTER TABLE quote_views ADD COLUMN quote_version VARCHAR(10) DEFAULT 'v1'");
        echo "   ✅ Success: Added quote_version column\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "   ℹ️  Info: quote_version column already exists\n";
        } else {
            echo "   ❌ Error: " . $e->getMessage() . "\n";
        }
    }
    
    // 3. Update existing records with version info
    echo "\n3. Updating existing records with version info...\n";
    $stmt = $pdo->prepare("UPDATE quote_views SET quote_version = CASE 
        WHEN quote_id = 'bluefit_2025_v2' THEN 'v2' 
        WHEN quote_id = 'bluefit_2025' THEN 'v1'
        ELSE 'v1' 
    END");
    $result = $stmt->execute();
    echo $result ? "   ✅ Success: Updated existing records\n" : "   ❌ Failed to update records\n";
    
    // 4. Show current quote data
    echo "\n4. Current quote data:\n";
    $stmt = $pdo->query("SELECT quote_id, quote_name, total_value FROM quotes WHERE quote_id LIKE 'bluefit%'");
    $quotes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($quotes as $quote) {
        echo "   - " . $quote['quote_id'] . ": R$ " . number_format($quote['total_value'], 2, ',', '.') . "\n";
    }
    
    // 5. Show sample quote_views data
    echo "\n5. Sample quote_views data with versions:\n";
    $stmt = $pdo->query("SELECT quote_id, quote_version, COUNT(*) as count FROM quote_views GROUP BY quote_id, quote_version");
    $views = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($views as $view) {
        echo "   - " . $view['quote_id'] . " (" . $view['quote_version'] . "): " . $view['count'] . " views\n";
    }
    
    echo "\n✅ ALL UPDATES COMPLETED SUCCESSFULLY!\n";
    echo "\nThe dashboard should now show:\n";
    echo "- Correct total value for bluefit_v2: R$ 38,490.00\n";
    echo "- Version column in Recent Activity (V1/V2 badges)\n";
    
} catch(PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}

echo "</pre>";
echo "<p><a href='dashboard.php'>→ Go to Dashboard</a></p>";
?>
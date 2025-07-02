<?php
// Fix bluefit_v2 total value and add version tracking

// Database configuration
$host = 'localhost';
$dbname = 'u148986826_bluefit';
$username = 'u148986826_bluefit';
$password = 'Bananeta1234@';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to database successfully.\n";
    
    // 1. Update bluefit_v2 total value to correct amount
    $stmt = $pdo->prepare("UPDATE quotes SET total_value = ? WHERE quote_id = ?");
    $result = $stmt->execute([38490.00, 'bluefit_2025_v2']);
    
    if ($result) {
        echo "✅ Updated bluefit_v2 total value to R$ 38,490.00\n";
    } else {
        echo "❌ Failed to update bluefit_v2 total value\n";
    }
    
    // 2. Add version column to quote_views table if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE quote_views ADD COLUMN quote_version VARCHAR(10) DEFAULT 'v1'");
        echo "✅ Added quote_version column to quote_views table\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "ℹ️ quote_version column already exists\n";
        } else {
            echo "❌ Error adding quote_version column: " . $e->getMessage() . "\n";
        }
    }
    
    // 3. Update existing records to mark them as v1 or v2 based on quote_id
    $stmt = $pdo->prepare("UPDATE quote_views SET quote_version = CASE 
        WHEN quote_id = 'bluefit_2025_v2' THEN 'v2' 
        WHEN quote_id = 'bluefit_2025' THEN 'v1'
        ELSE 'v1' 
    END");
    $result = $stmt->execute();
    
    if ($result) {
        echo "✅ Updated existing quote_views records with version information\n";
    } else {
        echo "❌ Failed to update quote_views records\n";
    }
    
    // 4. Check current data
    echo "\n📊 Current quote data:\n";
    $stmt = $pdo->query("SELECT quote_id, quote_name, total_value FROM quotes WHERE quote_id LIKE 'bluefit%'");
    $quotes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($quotes as $quote) {
        echo "- " . $quote['quote_id'] . ": " . $quote['quote_name'] . " - R$ " . number_format($quote['total_value'], 2, ',', '.') . "\n";
    }
    
    echo "\n✅ Database update completed successfully!\n";
    
} catch(PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
?>
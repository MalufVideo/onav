-- Update bluefit_v2 values and add version tracking
USE u148986826_bluefit;

-- 1. Update the total value for bluefit_v2
UPDATE quotes SET total_value = 38490.00 WHERE quote_id = 'bluefit_2025_v2';

-- 2. Add version column to quote_views if it doesn't exist
ALTER TABLE quote_views ADD COLUMN quote_version VARCHAR(10) DEFAULT 'v1';

-- 3. Update existing records to mark version based on quote_id
UPDATE quote_views SET quote_version = CASE 
    WHEN quote_id = 'bluefit_2025_v2' THEN 'v2' 
    WHEN quote_id = 'bluefit_2025' THEN 'v1'
    ELSE 'v1' 
END;

-- 4. Show updated quotes
SELECT quote_id, quote_name, total_value FROM quotes WHERE quote_id LIKE 'bluefit%';
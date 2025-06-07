-- Query to retrieve all proposals with filtering options

-- Get all proposals with basic info
SELECT 
  id,
  project_name,
  client_name,
  client_company,
  client_email,
  shooting_dates_start,
  shooting_dates_end,
  led_principal_width,
  led_principal_height,
  led_principal_modules,
  led_principal_pixels_width,
  led_principal_pixels_height,
  led_principal_resolution,
  days_count,
  discount_percentage,
  daily_rate,
  discounted_daily_rate,
  total_price,
  created_at
FROM proposals
ORDER BY created_at DESC;

-- Get detailed information for a specific proposal
SELECT * FROM proposals WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- Get proposals by client email
SELECT 
  id,
  project_name,
  shooting_dates_start,
  shooting_dates_end,
  led_principal_width,
  led_principal_height,
  led_principal_modules,
  total_price,
  created_at
FROM proposals
WHERE client_email = 'client@example.com' -- Replace with actual client email
ORDER BY created_at DESC;

-- Get proposals with technical specifications
SELECT 
  id,
  project_name,
  client_name,
  led_principal_width,
  led_principal_height,
  led_principal_modules,
  led_principal_resolution,
  led_principal_pixels_width,
  led_principal_pixels_height,
  led_principal_total_pixels,
  principal_power_max,
  principal_power_avg,
  principal_weight,
  created_at
FROM proposals
ORDER BY created_at DESC;

-- Get proposal statistics
SELECT 
  COUNT(*) as total_proposals,
  AVG(total_price) as avg_price,
  MAX(total_price) as max_price,
  MIN(total_price) as min_price,
  SUM(CASE WHEN discount_percentage > 0 THEN 1 ELSE 0 END) as proposals_with_discount,
  AVG(discount_percentage) as avg_discount
FROM proposals;

-- Get recently created proposals (last 30 days)
SELECT 
  id,
  project_name,
  client_name,
  total_price,
  created_at
FROM proposals
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Get proposals by price range
SELECT 
  id,
  project_name,
  client_name,
  total_price,
  created_at
FROM proposals
WHERE total_price BETWEEN 10000 AND 50000 -- Replace with actual price range
ORDER BY total_price DESC;

-- Update proposal creation date (until status column exists)
-- UPDATE proposals SET created_at = CURRENT_TIMESTAMP WHERE id = '00000000-0000-0000-0000-000000000000';

-- Delete a proposal (use with caution)
-- DELETE FROM proposals WHERE id = '00000000-0000-0000-0000-000000000000';

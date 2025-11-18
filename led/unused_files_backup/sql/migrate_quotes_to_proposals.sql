-- SQL script to migrate data from the old quotes table to the new proposals table

-- First, ensure the proposals table exists
-- Include the new table creation if not done separately
\i 'proposals_table.sql'

-- Migrate existing data from quotes to proposals with data transformation
INSERT INTO proposals (
  -- Basic data
  id,
  user_id,
  created_at,
  updated_at,
  status,
  project_name,
  client_name,
  client_company,
  client_email,
  client_phone,
  shooting_dates_start,
  shooting_dates_end,
  
  -- LED Wall Configuration - Principal
  led_principal_width,
  led_principal_height,
  led_principal_curvature,
  led_principal_modules,
  led_principal_resolution,
  
  -- LED Wall Configuration - Teto (Ceiling)
  led_teto_width,
  led_teto_height,
  led_teto_modules,
  
  -- Service Selection
  selected_pod_type,
  
  -- Disguise 3D Components
  price_disguise_modules_led,
  price_disguise_mx40_pro,
  price_disguise_vx4n,
  price_rxii,
  price_tracking,
  
  -- Rube Draco Components
  price_cinebot,
  price_trilho,
  price_komodo,
  
  -- Studio Configuration
  selected_studio_size,
  
  -- Calculated Subtotals
  total_price_3d,
  total_price_rube_draco,
  total_price_estudios,
  
  -- Pricing Model
  days_count,
  discount_percentage,
  discount_description,
  daily_rate,
  discounted_daily_rate,
  total_price
)
SELECT 
  -- Basic data
  id,
  user_id,
  created_at,
  created_at AS updated_at,
  status,
  project_name,
  client_name,
  client_company,
  client_email,
  client_phone,
  shooting_dates_start,
  shooting_dates_end,
  
  -- LED Wall Configuration - Principal
  CAST(led_principal_width AS NUMERIC),
  CAST(led_principal_height AS NUMERIC),
  CAST(led_principal_curvature AS INTEGER),
  CAST(led_principal_modules AS INTEGER),
  led_principal_resolution,
  
  -- LED Wall Configuration - Teto (Ceiling)
  CAST(led_teto_width AS NUMERIC),
  CAST(led_teto_height AS NUMERIC),
  CAST(led_teto_modules AS INTEGER),
  
  -- Service Selection
  selected_pod_type,
  
  -- Disguise 3D Components
  CAST(price_disguise_modules_led AS NUMERIC),
  CAST(price_disguise_mx40_pro AS NUMERIC),
  CAST(price_disguise_vx4n AS NUMERIC),
  CAST(price_rxii AS NUMERIC),
  CAST(price_tracking AS NUMERIC),
  
  -- Rube Draco Components
  CAST(price_cinebot AS NUMERIC),
  CAST(price_trilho AS NUMERIC),
  CAST(price_komodo AS NUMERIC),
  
  -- Studio Configuration
  selected_studio_size,
  
  -- Calculated Subtotals
  CAST(total_price_3d AS NUMERIC),
  CAST(total_price_rube_draco AS NUMERIC),
  CAST(total_price_estudios AS NUMERIC),
  
  -- Pricing Model
  CAST(days_count AS INTEGER),
  CAST(discount_percentage AS NUMERIC),
  discount_description,
  CAST(daily_rate AS NUMERIC),
  CAST(discounted_daily_rate AS NUMERIC),
  CAST(total_price AS NUMERIC)
FROM quotes;

-- Calculate the missing fields for existing records
-- This updates the newly created proposals with calculated values
UPDATE proposals p
SET 
  -- Calculate LED Principal pixels dimensions
  led_principal_pixels_width = CASE 
    WHEN p.led_principal_modules > 0 THEN 
      GREATEST(CAST(CEIL(p.led_principal_width / 0.5) * 192 AS INTEGER), 192)
    ELSE NULL
  END,
  
  led_principal_pixels_height = CASE 
    WHEN p.led_principal_modules > 0 THEN 
      GREATEST(CAST(CEIL(p.led_principal_height / 0.5) * 192 AS INTEGER), 192)
    ELSE NULL
  END,
  
  -- Calculate LED Teto pixels dimensions
  led_teto_pixels_width = CASE 
    WHEN p.led_teto_modules > 0 THEN 
      GREATEST(CAST(CEIL(p.led_teto_width / 0.5) * 192 AS INTEGER), 192)
    ELSE NULL
  END,
  
  led_teto_pixels_height = CASE 
    WHEN p.led_teto_modules > 0 THEN 
      GREATEST(CAST(CEIL(p.led_teto_height / 0.5) * 192 AS INTEGER), 192)
    ELSE NULL
  END,
  
  -- Calculate total pixels
  led_principal_total_pixels = CASE 
    WHEN p.led_principal_modules > 0 THEN 
      GREATEST(CAST(CEIL(p.led_principal_width / 0.5) * 192 AS INTEGER), 192) * 
      GREATEST(CAST(CEIL(p.led_principal_height / 0.5) * 192 AS INTEGER), 192)
    ELSE NULL
  END,
  
  led_teto_total_pixels = CASE 
    WHEN p.led_teto_modules > 0 THEN 
      GREATEST(CAST(CEIL(p.led_teto_width / 0.5) * 192 AS INTEGER), 192) * 
      GREATEST(CAST(CEIL(p.led_teto_height / 0.5) * 192 AS INTEGER), 192)
    ELSE NULL
  END,
  
  -- Calculate technical information
  principal_power_max = CAST(ROUND(p.led_principal_width * p.led_principal_height * 690) AS INTEGER),
  principal_power_avg = CAST(ROUND(p.led_principal_width * p.led_principal_height * 230) AS INTEGER),
  principal_weight = CAST(ROUND(p.led_principal_modules * 7.5) AS NUMERIC),
  
  teto_power_max = CAST(ROUND(p.led_teto_width * p.led_teto_height * 690) AS INTEGER),
  teto_power_avg = CAST(ROUND(p.led_teto_width * p.led_teto_height * 230) AS INTEGER),
  teto_weight = CAST(ROUND(p.led_teto_modules * 7.5) AS NUMERIC),
  
  -- Calculate other fields
  led_teto_resolution = CASE 
    WHEN p.led_teto_modules > 0 THEN 
      CONCAT(
        GREATEST(CAST(CEIL(p.led_teto_width / 0.5) * 192 AS INTEGER), 192),
        'x',
        GREATEST(CAST(CEIL(p.led_teto_height / 0.5) * 192 AS INTEGER), 192)
      )
    ELSE NULL
  END,
  
  -- Calculate 2D price components
  price_modules_principal = CASE 
    WHEN p.led_principal_modules > 0 THEN 
      CAST(p.led_principal_modules * 1000 AS NUMERIC) -- Assume R$1000 per module
    ELSE 0
  END,
  
  price_processors_principal = CASE 
    WHEN p.led_principal_modules > 0 THEN 
      CAST(CEIL(p.led_principal_modules / 20) * 2000 AS NUMERIC) -- Assume R$2000 per processor, 1 per 20 modules
    ELSE 0
  END,
  
  price_server = CASE 
    WHEN p.led_principal_modules > 0 THEN 3000 -- Assume R$3000 for server
    ELSE 0
  END,
  
  -- Calculate total 2D price
  total_price_2d = CASE 
    WHEN p.led_principal_modules > 0 THEN 
      CAST(p.led_principal_modules * 1000 AS NUMERIC) + -- Modules
      CAST(CEIL(p.led_principal_modules / 20) * 2000 AS NUMERIC) + -- Processors
      3000 -- Server
    ELSE 0
  END
  
WHERE 
  p.led_principal_pixels_width IS NULL OR 
  p.led_principal_pixels_height IS NULL OR 
  p.led_principal_total_pixels IS NULL OR 
  p.total_price_2d IS NULL;

-- Output success message
SELECT 'Migration of quotes to proposals table completed successfully!' AS status;

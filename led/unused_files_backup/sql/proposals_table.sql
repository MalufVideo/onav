-- SQL script to create a new, optimized proposals table that will store all data from the Proposta de Orçamento modal

-- Create the new proposals table with all necessary columns
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  
  -- Client Information
  project_name TEXT,
  client_name TEXT,
  client_company TEXT,
  client_email TEXT,
  client_phone TEXT,
  shooting_dates_start DATE,
  shooting_dates_end DATE,
  
  -- LED Wall Configuration - Principal
  led_principal_width NUMERIC,
  led_principal_height NUMERIC,
  led_principal_curvature INTEGER,
  led_principal_modules INTEGER,
  led_principal_resolution TEXT,
  led_principal_pixels_width INTEGER,
  led_principal_pixels_height INTEGER,
  led_principal_total_pixels BIGINT,
  
  -- LED Wall Configuration - Teto (Ceiling)
  led_teto_width NUMERIC,
  led_teto_height NUMERIC,
  led_teto_modules INTEGER,
  led_teto_pixels_width INTEGER,
  led_teto_pixels_height INTEGER,
  led_teto_total_pixels BIGINT,
  led_teto_resolution TEXT,
  
  -- Service Selection
  selected_pod_type TEXT, -- '2d' or '3d'
  
  -- Pricing Components - Disguise
  price_modules_principal NUMERIC,  -- Optimized pricing field
  price_processors_principal NUMERIC,  -- Optimized pricing field
  price_server NUMERIC,  -- Optimized pricing field
  price_server_backup BOOLEAN DEFAULT FALSE,  -- Whether server backup is selected
  
  -- Disguise 3D Components
  price_disguise_modules_led NUMERIC,
  price_disguise_mx40_pro NUMERIC,
  price_disguise_vx4n NUMERIC,
  price_rxii NUMERIC,
  price_tracking NUMERIC,
  
  -- Rube Draco Components
  price_cinebot NUMERIC,
  price_trilho NUMERIC,
  price_komodo NUMERIC,
  
  -- Studio Configuration
  selected_studio_size TEXT,
  total_price_estudios NUMERIC,
  
  -- Calculated Subtotals
  total_price_2d NUMERIC,  -- New field for 2D setup total
  total_price_3d NUMERIC,
  total_price_rube_draco NUMERIC,
  
  -- Pricing Model
  days_count INTEGER DEFAULT 1,
  discount_percentage NUMERIC DEFAULT 0,
  discount_description TEXT,
  daily_rate NUMERIC,
  discounted_daily_rate NUMERIC,
  total_price NUMERIC,
  
  -- Technical Information
  principal_power_max INTEGER,  -- New field for power consumption max
  principal_power_avg INTEGER,  -- New field for power consumption avg
  principal_weight NUMERIC,     -- New field for weight
  teto_power_max INTEGER,       -- New field for ceiling power consumption max
  teto_power_avg INTEGER,       -- New field for ceiling power consumption avg
  teto_weight NUMERIC           -- New field for ceiling weight
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_email ON proposals(client_email);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_proposals_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to use the function
DROP TRIGGER IF EXISTS update_proposals_modtime ON proposals;
CREATE TRIGGER update_proposals_modtime
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE PROCEDURE update_proposals_modtime();

-- SQL command to migrate data from old quotes table to the new proposals table
-- This can be used to preserve existing data
-- INSERT INTO proposals (
--   user_id, created_at, status, project_name, client_name, client_company, client_email,
--   client_phone, shooting_dates_start, shooting_dates_end, led_principal_width, led_principal_height,
--   led_principal_curvature, led_principal_modules, led_principal_resolution, led_teto_width,
--   led_teto_height, led_teto_modules, selected_pod_type, price_disguise_modules_led, price_disguise_mx40_pro,
--   price_disguise_vx4n, price_rxii, price_tracking, price_cinebot, price_trilho, price_komodo,
--   selected_studio_size, total_price_3d, total_price_rube_draco, total_price_estudios, days_count,
--   discount_percentage, discount_description, daily_rate, discounted_daily_rate, total_price
-- )
-- SELECT 
--   user_id, created_at, status, project_name, client_name, client_company, client_email,
--   client_phone, shooting_dates_start, shooting_dates_end, led_principal_width, led_principal_height,
--   led_principal_curvature, led_principal_modules, led_principal_resolution, led_teto_width,
--   led_teto_height, led_teto_modules, selected_pod_type, price_disguise_modules_led, price_disguise_mx40_pro,
--   price_disguise_vx4n, price_rxii, price_tracking, price_cinebot, price_trilho, price_komodo,
--   selected_studio_size, total_price_3d, total_price_rube_draco, total_price_estudios, days_count,
--   discount_percentage, discount_description, daily_rate, discounted_daily_rate, total_price
-- FROM quotes;

-- Comment explaining the table
COMMENT ON TABLE proposals IS 'Optimized storage for LED wall calculator proposals with detailed pricing and configuration data';

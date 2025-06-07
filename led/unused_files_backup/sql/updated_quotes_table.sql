-- Updated SQL script to enhance the quotes table with essential columns for the new pricing model

-- Add columns for tracking number of days and discount rate
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS days_count INTEGER,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS discount_description TEXT,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC,
ADD COLUMN IF NOT EXISTS discounted_daily_rate NUMERIC,

-- Add specific columns for detailed service breakdown
ADD COLUMN IF NOT EXISTS selected_pod_type TEXT, -- '2d' or '3d'

-- LED Teto configuration
ADD COLUMN IF NOT EXISTS led_teto_width NUMERIC,
ADD COLUMN IF NOT EXISTS led_teto_height NUMERIC,
ADD COLUMN IF NOT EXISTS led_teto_modules INTEGER,
ADD COLUMN IF NOT EXISTS led_teto_pixels_width INTEGER,
ADD COLUMN IF NOT EXISTS led_teto_pixels_height INTEGER,
ADD COLUMN IF NOT EXISTS led_teto_total_pixels BIGINT,

-- LED Principal additional fields
ADD COLUMN IF NOT EXISTS led_principal_pixels_width INTEGER,
ADD COLUMN IF NOT EXISTS led_principal_pixels_height INTEGER,
ADD COLUMN IF NOT EXISTS led_principal_total_pixels BIGINT,

-- Disguise service prices (only if not already existing)
ADD COLUMN IF NOT EXISTS price_disguise_total NUMERIC,
ADD COLUMN IF NOT EXISTS price_disguise_modules_led NUMERIC,
ADD COLUMN IF NOT EXISTS price_disguise_mx40_pro NUMERIC,
ADD COLUMN IF NOT EXISTS price_disguise_vx4n NUMERIC,
ADD COLUMN IF NOT EXISTS price_rxii NUMERIC,
ADD COLUMN IF NOT EXISTS price_tracking NUMERIC,

-- Rube Draco prices
ADD COLUMN IF NOT EXISTS price_cinebot NUMERIC,
ADD COLUMN IF NOT EXISTS price_trilho NUMERIC,
ADD COLUMN IF NOT EXISTS price_komodo NUMERIC,

-- Studios
ADD COLUMN IF NOT EXISTS selected_studio_size TEXT,
ADD COLUMN IF NOT EXISTS total_price_3d NUMERIC,
ADD COLUMN IF NOT EXISTS total_price_rube_draco NUMERIC,
ADD COLUMN IF NOT EXISTS total_price_estudios NUMERIC,

-- Add status tracking
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create or replace function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_quotes_modtime ON quotes;
CREATE TRIGGER update_quotes_modtime
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_client_email ON quotes(client_email);

-- Comment explaining the update
COMMENT ON TABLE quotes IS 'Stores LED wall calculator quotes with detailed pricing, service selections, and progressive discount model';

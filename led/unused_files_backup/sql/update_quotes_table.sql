-- SQL script to update the quotes table structure

-- Drop NOT NULL constraints if they exist
-- First check if columns exist using information schema
DO $$
BEGIN
    -- Check and drop NOT NULL for led_principal_curvature if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'led_principal_curvature'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE quotes ALTER COLUMN led_principal_curvature DROP NOT NULL;
    END IF;

    -- Check and drop NOT NULL for shooting_dates_start if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'shooting_dates_start'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE quotes ALTER COLUMN shooting_dates_start DROP NOT NULL;
    END IF;

    -- Check and drop NOT NULL for shooting_dates_end if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'shooting_dates_end'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE quotes ALTER COLUMN shooting_dates_end DROP NOT NULL;
    END IF;
END
$$;

-- Add missing price columns
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS price_modules_principal NUMERIC,
ADD COLUMN IF NOT EXISTS price_processors_principal NUMERIC,
ADD COLUMN IF NOT EXISTS price_server NUMERIC,
ADD COLUMN IF NOT EXISTS price_rxii NUMERIC,
ADD COLUMN IF NOT EXISTS price_tracking NUMERIC,
ADD COLUMN IF NOT EXISTS price_cinebot NUMERIC,
ADD COLUMN IF NOT EXISTS price_trilho NUMERIC,
ADD COLUMN IF NOT EXISTS price_komodo NUMERIC,

-- Add total price columns
ADD COLUMN IF NOT EXISTS total_price_3d NUMERIC,
ADD COLUMN IF NOT EXISTS total_price_rube_draco NUMERIC,
ADD COLUMN IF NOT EXISTS total_price_estudios NUMERIC,
ADD COLUMN IF NOT EXISTS total_price NUMERIC,

-- Add all the other fields we might need
ADD COLUMN IF NOT EXISTS led_principal_width NUMERIC,
ADD COLUMN IF NOT EXISTS led_principal_height NUMERIC,
ADD COLUMN IF NOT EXISTS led_principal_curvature INTEGER,
ADD COLUMN IF NOT EXISTS led_principal_modules INTEGER,
ADD COLUMN IF NOT EXISTS led_principal_resolution TEXT,

ADD COLUMN IF NOT EXISTS led_teto_width NUMERIC,
ADD COLUMN IF NOT EXISTS led_teto_height NUMERIC,
ADD COLUMN IF NOT EXISTS led_teto_modules INTEGER,

ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_company TEXT,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Update date columns to proper DATE type
DO $$
BEGIN
    -- Convert shooting_dates columns to DATE type if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'shooting_dates_start'
    ) THEN
        ALTER TABLE quotes ALTER COLUMN shooting_dates_start TYPE DATE USING CASE WHEN shooting_dates_start IS NULL THEN NULL ELSE shooting_dates_start::DATE END;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'shooting_dates_end'
    ) THEN
        ALTER TABLE quotes ALTER COLUMN shooting_dates_end TYPE DATE USING CASE WHEN shooting_dates_end IS NULL THEN NULL ELSE shooting_dates_end::DATE END;
    END IF;
END
$$;

-- Comment explaining the update
COMMENT ON TABLE quotes IS 'Stores LED wall calculator quotes with pricing details and user selections';

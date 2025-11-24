-- Setup script for products table with all required entries
-- Run this in Supabase SQL Editor to ensure all products are properly configured

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products"
    ON public.products
    FOR SELECT
    USING (true);

-- Create policy for authenticated inserts/updates (admin only)
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON public.products;
CREATE POLICY "Allow authenticated users to manage products"
    ON public.products
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Insert or update required products with default prices
-- These are the CRITICAL products the calculator depends on

-- LED Products
INSERT INTO public.products (name, price, category, description)
VALUES
    ('LED Module', 55, 'LED', 'ROE Black Pearl BP2V2 - 2.6mm pixel pitch, 500x500mm module')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Processors
INSERT INTO public.products (name, price, category, description)
VALUES
    ('MX-40 Pro Processor', 1000, 'Processing', 'Disguise MX-40 Pro Media Server/Processor')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Servers
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Disguise VX4n (Base)', 5000, 'Servers', 'Disguise VX4n Server - Base Unit')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.products (name, price, category, description)
VALUES
    ('Disguise VX4n (Backup)', 5000, 'Servers', 'Disguise VX4n Server - Backup Unit')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Tracking Equipment
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Disguise RXII Unit', 3750, 'Tracking', 'Disguise RXII Tracking Unit - Per Unit Price')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.products (name, price, category, description)
VALUES
    ('Stype Tracking', 5000, 'Tracking', 'Stype Camera Tracking System')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Studio Rental
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Estúdio', 6000, 'Studio', 'Studio Rental - Estúdio de 436m²')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Technical Team
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Equipe Técnica Diária', 0, 'Services', 'Professional Technical Team - Daily Rate')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.products;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Verify the setup
SELECT
    name,
    price,
    category,
    CASE
        WHEN name IN (
            'LED Module',
            'MX-40 Pro Processor',
            'Disguise VX4n (Base)',
            'Disguise VX4n (Backup)',
            'Disguise RXII Unit',
            'Stype Tracking',
            'Estúdio',
            'Equipe Técnica Diária'
        ) THEN '✓ Required'
        ELSE 'Optional'
    END as status
FROM public.products
ORDER BY
    CASE category
        WHEN 'LED' THEN 1
        WHEN 'Processing' THEN 2
        WHEN 'Servers' THEN 3
        WHEN 'Tracking' THEN 4
        WHEN 'Studio' THEN 5
        WHEN 'Services' THEN 6
        ELSE 99
    END,
    name;

-- Setup Products Table for LED Calculator
-- This script creates the products table and populates it with initial pricing data
-- Run this in Supabase SQL Editor

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit_type TEXT NOT NULL DEFAULT 'daily',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (required for guest users)
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
CREATE POLICY "Allow public read access to products"
ON products FOR SELECT
USING (true);

-- Create policy to allow authenticated inserts/updates/deletes
DROP POLICY IF EXISTS "Allow authenticated users to modify products" ON products;
CREATE POLICY "Allow authenticated users to modify products"
ON products FOR ALL
USING (auth.role() = 'authenticated');

-- Insert or update products with correct names (CRITICAL: Names must match exactly in code)
INSERT INTO products (name, description, category, price, unit_type) VALUES
    ('LED Module', 'Módulo LED 500x500mm 2.6mm pitch', 'LED', 74.00, 'daily'),
    ('MX-40 Pro Processor', 'Processador MX-40 Pro Disguise', 'Processors', 1000.00, 'daily'),
    ('Disguise VX4n (Base)', 'Servidor Disguise VX4n Base', 'Servers', 5000.00, 'daily'),
    ('Disguise VX4n (Backup)', 'Servidor Disguise VX4n Backup', 'Servers', 5000.00, 'daily'),
    ('Disguise RXII Unit', 'Unidade Disguise RXII para tracking', 'Tracking', 3750.00, 'daily'),
    ('Stype Tracking', 'Sistema de tracking Stype', 'Tracking', 2500.00, 'daily'),
    ('Estúdio', 'Estúdio de 436 metros quadrados', 'Studio', 6000.00, 'daily'),
    ('Equipe Técnica Diária', 'Equipe profissional técnica diária', 'Services', 3000.00, 'daily')
ON CONFLICT (name)
DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    unit_type = EXCLUDED.unit_type,
    updated_at = NOW();

-- Verify the data was inserted
SELECT * FROM products ORDER BY category, name;

-- Grant necessary permissions
GRANT SELECT ON products TO anon;
GRANT SELECT ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Products table setup complete!';
    RAISE NOTICE 'Inserted % products', (SELECT COUNT(*) FROM products);
END $$;

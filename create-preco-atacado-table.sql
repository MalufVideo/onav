-- Migration: Create preco_atacado_produtos_on table
-- Description: Table for managing wholesale rental pricing for ON products

CREATE TABLE IF NOT EXISTS preco_atacado_produtos_on (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    daily_rental_price NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for public read access
ALTER TABLE preco_atacado_produtos_on ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT (for price display)
CREATE POLICY "Allow public read access" ON preco_atacado_produtos_on
    FOR SELECT USING (true);

-- Allow authenticated users to INSERT/UPDATE
CREATE POLICY "Allow authenticated insert" ON preco_atacado_produtos_on
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON preco_atacado_produtos_on
    FOR UPDATE TO authenticated USING (true);

-- Create index for faster lookups
CREATE INDEX idx_preco_atacado_category ON preco_atacado_produtos_on(category);
CREATE INDEX idx_preco_atacado_product_name ON preco_atacado_produtos_on(product_name);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_preco_atacado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_preco_atacado_updated_at
    BEFORE UPDATE ON preco_atacado_produtos_on
    FOR EACH ROW
    EXECUTE FUNCTION update_preco_atacado_updated_at();

-- Seed initial products
-- LED Products
INSERT INTO preco_atacado_produtos_on (product_name, category) VALUES
    ('2.6mm indoor Absen NT', 'LED'),
    ('2.6mm indoor LG', 'LED'),
    ('2.9mm pl lite V10 Absen', 'LED'),
    ('2.9mm pl lite Absen', 'LED'),
    ('3.9mm indoor', 'LED'),
    ('3.9mm outdoor Leyard', 'LED'),
    ('3.9mm outdoor LED Glass', 'LED'),
    ('4.81mm outdoor Gloshine', 'LED')
ON CONFLICT (product_name) DO NOTHING;

-- Processamento Products
INSERT INTO preco_atacado_produtos_on (product_name, category) VALUES
    ('disguise RXII', 'Processamento'),
    ('disguise VX4', 'Processamento'),
    ('Stype RedSpy', 'Processamento'),
    ('H2', 'Processamento'),
    ('MX-40', 'Processamento'),
    ('media servers 4 Saidas', 'Processamento'),
    ('Resolume', 'Processamento'),
    ('noteboooks', 'Processamento'),
    ('Barco E2', 'Processamento'),
    ('BMD 40x40 Matrix SDI', 'Processamento'),
    ('TV LCD 50', 'Processamento'),
    ('TV LCD 60', 'Processamento'),
    ('TV LCD 70', 'Processamento')
ON CONFLICT (product_name) DO NOTHING;

-- Projetores Products
INSERT INTO preco_atacado_produtos_on (product_name, category) VALUES
    ('Christie Griffyn 4K50-RGB', 'Projetores'),
    ('Christie Jazz DWU2400', 'Projetores'),
    ('Panasonic PT-RZ34K', 'Projetores'),
    ('Panasonic PT-RZ21K', 'Projetores'),
    ('Panasonic PT-RZ120', 'Projetores'),
    ('Panasonic PT-DZ21K e 21K2', 'Projetores'),
    ('Christie CP2000-XB', 'Projetores'),
    ('Panasonic PT-RCQ10', 'Projetores'),
    ('Barco G62-W9 B', 'Projetores'),
    ('Panasonic PT-RZ990', 'Projetores'),
    ('Panasonic PT-RZ970U', 'Projetores'),
    ('Optoma ZK708T', 'Projetores'),
    ('Optoma ZU920TST', 'Projetores'),
    ('Panasonic PT-RZ770', 'Projetores'),
    ('Barco G60-W7', 'Projetores'),
    ('Panasonic PT-VMZ71', 'Projetores'),
    ('Panasonic PT-RZ660', 'Projetores'),
    ('Panasonic PT-VMZ61', 'Projetores'),
    ('Optoma ZH606TST', 'Projetores'),
    ('Panasonic PT-RZ570BU', 'Projetores'),
    ('Nec NP-P506QL', 'Projetores'),
    ('Panasonic PT-VMZ50', 'Projetores'),
    ('Nec PE456USL', 'Projetores'),
    ('Optoma ZH450ST', 'Projetores'),
    ('Optoma ZH406ST', 'Projetores'),
    ('Optoma ZK400', 'Projetores'),
    ('BenQ LH890UST', 'Projetores'),
    ('Epson LS100', 'Projetores'),
    ('Panasonic PT-DX100', 'Projetores'),
    ('Pico Optoma ML1050ST', 'Projetores'),
    ('Lentes', 'Projetores')
ON CONFLICT (product_name) DO NOTHING;

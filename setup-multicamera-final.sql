-- Multi-Camera Products Setup - COMPLETE
-- This script will:
-- 1. Ensure the products table exists with proper constraints
-- 2. Add all multicamera products
-- 3. Verify the products were added

-- Step 1: Ensure products table exists with unique constraint on name
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    description TEXT,
    unit_type TEXT DEFAULT 'diária',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unit_type column if it doesn't exist (for older tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'unit_type'
    ) THEN
        ALTER TABLE public.products ADD COLUMN unit_type TEXT DEFAULT 'diária';
    END IF;
END $$;

-- Step 2: Add UNIQUE constraint on name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_name_key'
    ) THEN
        ALTER TABLE public.products ADD CONSTRAINT products_name_key UNIQUE (name);
    END IF;
END $$;

-- Step 3: Enable RLS if not already enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies for public read access
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products"
    ON public.products
    FOR SELECT
    USING (true);

-- Step 5: Insert all multicamera products
-- CAMERAS
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Camera Sony EX3', 500, 'Cameras', 'Câmera Sony EX3 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Camera Sony FX6', 1200, 'Cameras', 'Câmera Sony FX6 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Camera Sony FX9', 1800, 'Cameras', 'Câmera Sony FX9 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- CAMERA SUPPORT
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Tripé', 125, 'Camera Support', 'Tripé para câmera - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- CREW
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Operador de Câmera', 800, 'Crew', 'Operador de Câmera Profissional - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Diretor de Corte', 1500, 'Crew', 'Diretor de Corte Profissional - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- SWITCHERS
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Switcher Panasonic HS400', 650, 'Switchers', 'Mesa de Corte Panasonic HS400 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Switcher Blackmagic ATEM 2M/E', 1200, 'Switchers', 'Mesa de Corte Blackmagic ATEM 2M/E - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Operador de vMix', 1500, 'Crew', 'Operador de vMix Profissional - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- SERVERS
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Servidor vMix', 3500, 'Servers', 'Servidor vMix para Live Streaming/Recording - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- LED WALL EQUIPMENT (ensure these exist too)
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('LED Module', 55, 'LED Modules', 'Módulo LED - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('MX-40 Pro Processor', 1000, 'Processors', 'Processadora MX-40 Pro - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Estúdio', 6000, 'Studio', 'Estúdio - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- Step 6: VERIFY - Show all products that were added
SELECT
    category,
    name,
    price,
    unit_type,
    description,
    CASE
        WHEN category IN ('Cameras', 'Camera Support', 'Switchers', 'Crew') THEN '✓ Multi-Camera'
        WHEN category IN ('LED Modules', 'Processors', 'Studio') THEN '✓ LED Wall'
        WHEN category = 'Servers' THEN '✓ Both Systems'
        ELSE 'Other'
    END as system_type
FROM public.products
WHERE category IN ('Cameras', 'Camera Support', 'Crew', 'Switchers', 'Servers', 'LED Modules', 'Processors', 'Studio')
ORDER BY category, name;

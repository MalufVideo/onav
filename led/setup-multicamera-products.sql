-- Setup script for Multi-Camera / Live products table entries
-- Run this in Supabase SQL Editor to add all multi-camera equipment

-- =====================================================
-- CAMERAS
-- =====================================================

-- Sony EX3 Camera
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Camera Sony EX3', 500, 'Cameras', 'Câmera Sony EX3 - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Sony FX6 Camera
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Camera Sony FX6', 1200, 'Cameras', 'Câmera Sony FX6 - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- Sony FX9 Camera
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Camera Sony FX9', 1800, 'Cameras', 'Câmera Sony FX9 - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- CAMERA SUPPORT (TRIPÉ)
-- =====================================================

INSERT INTO public.products (name, price, category, description)
VALUES
    ('Tripé', 125, 'Camera Support', 'Tripé para câmera - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- CAMERA OPERATOR
-- =====================================================

INSERT INTO public.products (name, price, category, description)
VALUES
    ('Operador de Câmera', 800, 'Crew', 'Operador de Câmera Profissional - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- SWITCHERS
-- =====================================================

-- Panasonic HS400
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Switcher Panasonic HS400', 650, 'Switchers', 'Mesa de Corte Panasonic HS400 - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- SERVERS
-- =====================================================

-- vMix Server
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Servidor vMix', 3500, 'Servers', 'Servidor vMix para Live Streaming/Recording - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- CREW
-- =====================================================

-- Diretor de Corte
INSERT INTO public.products (name, price, category, description)
VALUES
    ('Diretor de Corte', 1500, 'Crew', 'Diretor de Corte Profissional - Diária')
ON CONFLICT (name)
DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- VERIFY SETUP
-- =====================================================

SELECT
    name,
    price,
    category,
    description,
    CASE
        WHEN name IN (
            'Camera Sony EX3',
            'Camera Sony FX6',
            'Camera Sony FX9',
            'Tripé',
            'Operador de Câmera',
            'Switcher Panasonic HS400',
            'Servidor vMix',
            'Diretor de Corte'
        ) THEN '✓ Multi-Camera Equipment'
        ELSE 'Other'
    END as status
FROM public.products
WHERE category IN ('Cameras', 'Camera Support', 'Crew', 'Switchers')
   OR name IN ('Servidor vMix', 'Diretor de Corte')
ORDER BY
    CASE category
        WHEN 'Cameras' THEN 1
        WHEN 'Camera Support' THEN 2
        WHEN 'Crew' THEN 3
        WHEN 'Switchers' THEN 4
        WHEN 'Servers' THEN 5
        ELSE 99
    END,
    name;

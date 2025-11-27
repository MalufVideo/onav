-- Multi-Camera Products Setup
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click "Run"

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

-- SERVERS
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Servidor vMix', 3500, 'Servers', 'Servidor vMix para Live Streaming/Recording - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- LED WALL EQUIPMENT (add if missing)
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

-- VERIFY: List all products that were added
SELECT
    category,
    name,
    price,
    unit_type,
    description
FROM public.products
WHERE category IN ('Cameras', 'Camera Support', 'Crew', 'Switchers', 'Servers', 'LED Modules', 'Processors', 'Studio')
ORDER BY category, name;

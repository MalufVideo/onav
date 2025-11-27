# Multi-Camera Products Checklist

## Required Products for Multi-Camera Calculator

Run this query in your Supabase SQL Editor to check what's currently there:

```sql
SELECT
    name,
    price,
    category,
    description,
    unit_type
FROM public.products
WHERE category IN ('Cameras', 'Camera Support', 'Crew', 'Switchers', 'Servers')
    OR name IN ('LED Module', 'MX-40 Pro Processor', 'Estúdio')
ORDER BY category, name;
```

## Products That Should Exist

### Multi-Camera / Live Equipment (NEW - Need to Add)

```sql
-- CAMERAS
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Camera Sony EX3', 500, 'Cameras', 'Câmera Sony EX3 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Camera Sony FX6', 1200, 'Cameras', 'Câmera Sony FX6 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Camera Sony FX9', 1800, 'Cameras', 'Câmera Sony FX9 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- CAMERA SUPPORT
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Tripé', 125, 'Camera Support', 'Tripé para câmera - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- CREW
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Operador de Câmera', 800, 'Crew', 'Operador de Câmera Profissional - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Diretor de Corte', 1500, 'Crew', 'Diretor de Corte Profissional - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- SWITCHERS
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Switcher Panasonic HS400', 650, 'Switchers', 'Mesa de Corte Panasonic HS400 - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- SERVERS
INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Servidor vMix', 3500, 'Servers', 'Servidor vMix para Live Streaming/Recording - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();
```

### LED Wall Equipment (Should Already Exist)

```sql
-- If these don't exist, add them too:

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('LED Module', 55, 'LED Modules', 'Módulo LED - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('MX-40 Pro Processor', 1000, 'Processors', 'Processadora MX-40 Pro - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Estúdio', 6000, 'Studio', 'Estúdio - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();
```

## Quick Copy-Paste for Supabase SQL Editor

Copy and paste this entire block into your Supabase SQL Editor and click "Run":

```sql
-- Multi-Camera Products Setup
-- Run this in Supabase SQL Editor

-- CAMERAS
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Camera Sony EX3', 500, 'Cameras', 'Câmera Sony EX3 - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Camera Sony FX6', 1200, 'Cameras', 'Câmera Sony FX6 - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Camera Sony FX9', 1800, 'Cameras', 'Câmera Sony FX9 - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- CAMERA SUPPORT
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Tripé', 125, 'Camera Support', 'Tripé para câmera - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- CREW
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Operador de Câmera', 800, 'Crew', 'Operador de Câmera Profissional - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Diretor de Corte', 1500, 'Crew', 'Diretor de Corte Profissional - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- SWITCHERS
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Switcher Panasonic HS400', 650, 'Switchers', 'Mesa de Corte Panasonic HS400 - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- SERVERS
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Servidor vMix', 3500, 'Servers', 'Servidor vMix para Live Streaming/Recording - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- LED WALL (if missing)
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('LED Module', 55, 'LED Modules', 'Módulo LED - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('MX-40 Pro Processor', 1000, 'Processors', 'Processadora MX-40 Pro - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();
INSERT INTO public.products (name, price, category, description, unit_type) VALUES ('Estúdio', 6000, 'Studio', 'Estúdio - Diária', 'diária') ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, category = EXCLUDED.category, description = EXCLUDED.description, unit_type = EXCLUDED.unit_type, updated_at = now();

-- Verify the products were added
SELECT name, price, category, description FROM public.products ORDER BY category, name;
```

## How to Add Products

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the SQL block above
6. Click "Run" or press Ctrl+Enter
7. You should see all products listed at the end

### Option 2: Via Admin Interface
1. Go to https://www.onav.com.br/admin/admin.html
2. Click "Add New Product" for each item
3. Fill in the details from the table above
4. Click "Save Product"
5. Repeat for all 8 multicamera products

## Verification

After adding, verify by running:

```sql
SELECT
    category,
    name,
    price,
    unit_type
FROM public.products
WHERE category IN ('Cameras', 'Camera Support', 'Crew', 'Switchers', 'Servers', 'LED Modules', 'Processors', 'Studio')
ORDER BY category, name;
```

You should see at least 11 products (8 multicamera + 3 LED wall base items).

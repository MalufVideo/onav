-- Add ATEM 2M/E Switcher to products table

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Switcher ATEM 2M/E', 1500, 'Switchers', 'Mesa de Corte ATEM 2M/E - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- Verify it was added
SELECT name, price, category, description, unit_type
FROM public.products
WHERE name = 'Switcher ATEM 2M/E';

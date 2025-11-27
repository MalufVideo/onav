-- Add vMix Operator to products table

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Operador de vMix', 1500, 'Crew', 'Operador de vMix Profissional - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- Verify it was added
SELECT name, price, category, description, unit_type
FROM public.products
WHERE name = 'Operador de vMix';

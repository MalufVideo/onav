-- Add Resolume and Aximmetry Servers to products table
-- Same category as Disguise VX4n (Servers)

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Servidor Resolume', 5000, 'Servers', 'Servidor Resolume - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

INSERT INTO public.products (name, price, category, description, unit_type)
VALUES ('Servidor Aximmetry', 7000, 'Servers', 'Servidor Aximmetry - Diária', 'diária')
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

-- Verify they were added - show all servers
SELECT name, price, category, description, unit_type
FROM public.products
WHERE category = 'Servers'
ORDER BY name;

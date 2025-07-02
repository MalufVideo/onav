-- Add bluefit_v2 quote data to the database
USE u148986826_bluefit;

-- Insert the main quote record for bluefit_v2
INSERT INTO quotes (quote_id, quote_name, client_name, event_date, event_location, total_value, status) 
VALUES (
    'bluefit_2025_v2',
    'Orçamento de Produção - Versão 2 - Live Convenção Supervisores Bluefit 2025',
    'Bluefit Academia',
    '2025-09-19',
    'R. Plácido Vieira, 43 - Santo Amaro, São Paulo - SP, 04755-000',
    48490.00,
    'sent'
) ON DUPLICATE KEY UPDATE
    quote_name = VALUES(quote_name),
    total_value = VALUES(total_value),
    updated_at = CURRENT_TIMESTAMP;

-- Insert quote items for bluefit_v2 (corrected values)
INSERT INTO quote_items (quote_id, category, item_name, quantity, unit_price, total_price, description) VALUES
('bluefit_2025_v2', 'LED Equipment', 'Módulos LED (160 Unidades)', 160, 85.00, 13600.00, '160 LED modules for 10m × 4m display'),
('bluefit_2025_v2', 'LED Equipment', 'Processadores MX-40 Pro', 1, 1890.00, 1890.00, 'LED processor'),
('bluefit_2025_v2', 'LED Equipment', 'Servidor', 1, 5000.00, 5000.00, 'Media server'),
('bluefit_2025_v2', 'Technical Team', 'Equipe especializada', 1, 5000.00, 5000.00, 'Specialized technical team'),
('bluefit_2025_v2', 'Studio Space', 'Estúdio Principal', 1, 0.00, 0.00, '32m × 14m studio space with 100% discount'),
('bluefit_2025_v2', 'Production', 'Câmeras Sony PMW-EX3 com operadores', 2, 7500.00, 15000.00, 'Professional cameras with operators'),
('bluefit_2025_v2', 'Third Party', 'Mobiliário', 1, 4000.00, 4000.00, 'Furniture for 30 people (estimated)'),
('bluefit_2025_v2', 'Third Party', 'Gerador', 1, 5000.00, 5000.00, '60kVA generator (estimated)')
ON DUPLICATE KEY UPDATE
    quantity = VALUES(quantity),
    unit_price = VALUES(unit_price),
    total_price = VALUES(total_price),
    description = VALUES(description);
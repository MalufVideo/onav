-- Use your existing database
USE u148986826_bluefit;

-- Table to track quote views and visitor analytics
CREATE TABLE quote_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    visitor_ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    view_time DATETIME NOT NULL,
    time_spent INT DEFAULT 0, -- seconds spent on page
    interactions INT DEFAULT 0, -- number of clicks/interactions
    scroll_depth INT DEFAULT 0, -- maximum scroll percentage
    last_activity DATETIME NULL, -- last activity timestamp
    session_ended DATETIME NULL, -- when session ended
    device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quote_id (quote_id),
    INDEX idx_session_id (session_id),
    INDEX idx_view_time (view_time),
    INDEX idx_visitor_ip (visitor_ip)
);

-- Table to store detailed quote information
CREATE TABLE quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(50) UNIQUE NOT NULL,
    quote_name VARCHAR(200) NOT NULL,
    client_name VARCHAR(200),
    event_date DATE,
    event_location TEXT,
    total_value DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'BRL',
    status ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quote_id (quote_id),
    INDEX idx_status (status),
    INDEX idx_event_date (event_date)
);

-- Table to track quote items and services
CREATE TABLE quote_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE,
    INDEX idx_quote_id (quote_id),
    INDEX idx_category (category)
);

-- Table to track email interactions
CREATE TABLE email_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(200) NOT NULL,
    sent_at DATETIME NOT NULL,
    opened_at DATETIME NULL,
    clicked_at DATETIME NULL,
    email_client VARCHAR(100),
    open_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE,
    INDEX idx_quote_id (quote_id),
    INDEX idx_recipient (recipient_email),
    INDEX idx_sent_at (sent_at)
);

-- Table to track conversion funnel
CREATE TABLE conversion_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    step ENUM('viewed', 'engaged', 'contacted', 'requested_info', 'accepted') NOT NULL,
    step_time DATETIME NOT NULL,
    additional_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE,
    INDEX idx_quote_id (quote_id),
    INDEX idx_session_id (session_id),
    INDEX idx_step (step),
    INDEX idx_step_time (step_time)
);

-- Table to track gallery interactions
CREATE TABLE gallery_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    action ENUM('opened', 'loaded', 'played', 'paused', 'finished', 'closed') NOT NULL,
    item VARCHAR(200) NOT NULL,
    type ENUM('image', 'video', 'close') NOT NULL,
    interaction_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_action (action),
    INDEX idx_type (type),
    INDEX idx_interaction_time (interaction_time)
);

-- Insert sample quote data for Bluefit
INSERT INTO quotes (quote_id, quote_name, client_name, event_date, event_location, total_value, status) 
VALUES (
    'bluefit_2025',
    'Live Convenção Supervisores Bluefit 2025',
    'Bluefit Academia',
    '2025-09-19',
    'R. Plácido Vieira, 43 - Santo Amaro, São Paulo - SP, 04755-000',
    76580.00,
    'sent'
);

-- Insert quote items for Bluefit
INSERT INTO quote_items (quote_id, category, item_name, quantity, unit_price, total_price, description) VALUES
('bluefit_2025', 'LED Equipment', 'Módulos LED (300 Unidades)', 300, 85.00, 25500.00, '300 LED modules for main display'),
('bluefit_2025', 'LED Equipment', 'Processadores MX-40 Pro', 2, 1890.00, 3780.00, 'LED processors'),
('bluefit_2025', 'LED Equipment', 'Disguise VX4n', 1, 10000.00, 10000.00, 'Media server'),
('bluefit_2025', 'Technical Team', 'Equipe especializada Disguise', 1, 9900.00, 9900.00, 'Specialized technical team'),
('bluefit_2025', 'Studio Space', 'Estúdio Principal', 1, 2400.00, 2400.00, '32m × 14m studio space with 80% discount'),
('bluefit_2025', 'Production', 'Câmeras Sony PMW-EX3 com operadores', 2, 7500.00, 15000.00, 'Professional cameras with operators'),
('bluefit_2025', 'Third Party', 'Mobiliário', 1, 4000.00, 4000.00, 'Furniture for 30 people (estimated)'),
('bluefit_2025', 'Third Party', 'Gerador', 1, 6000.00, 6000.00, '80kVA generator (estimated)');

-- Create views for analytics
CREATE VIEW quote_analytics AS
SELECT 
    q.quote_id,
    q.quote_name,
    q.client_name,
    q.total_value,
    q.status,
    COUNT(DISTINCT qv.session_id) as unique_visitors,
    COUNT(qv.id) as total_views,
    AVG(qv.time_spent) as avg_time_spent,
    AVG(qv.scroll_depth) as avg_scroll_depth,
    AVG(qv.interactions) as avg_interactions,
    MAX(qv.view_time) as last_viewed,
    MIN(qv.view_time) as first_viewed
FROM quotes q
LEFT JOIN quote_views qv ON q.quote_id = qv.quote_id
GROUP BY q.quote_id, q.quote_name, q.client_name, q.total_value, q.status;

-- Create view for geographic analytics
CREATE VIEW geographic_analytics AS
SELECT 
    quote_id,
    country,
    region,
    city,
    COUNT(DISTINCT session_id) as unique_visitors,
    COUNT(*) as total_views,
    AVG(time_spent) as avg_time_spent
FROM quote_views
WHERE country IS NOT NULL
GROUP BY quote_id, country, region, city
ORDER BY unique_visitors DESC;

-- Create view for time-based analytics
CREATE VIEW time_analytics AS
SELECT 
    quote_id,
    DATE(view_time) as view_date,
    HOUR(view_time) as view_hour,
    COUNT(DISTINCT session_id) as unique_visitors,
    COUNT(*) as total_views,
    AVG(time_spent) as avg_time_spent
FROM quote_views
GROUP BY quote_id, DATE(view_time), HOUR(view_time)
ORDER BY view_date DESC, view_hour;

-- Create indexes for better performance
CREATE INDEX idx_quote_views_composite ON quote_views (quote_id, view_time, session_id);
CREATE INDEX idx_time_spent ON quote_views (time_spent);
CREATE INDEX idx_scroll_depth ON quote_views (scroll_depth);
CREATE INDEX idx_interactions ON quote_views (interactions);
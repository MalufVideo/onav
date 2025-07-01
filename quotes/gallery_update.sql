-- Add gallery interactions table only
-- Use your existing database
USE u148986826_bluefit;

-- Create gallery interactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS gallery_interactions (
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
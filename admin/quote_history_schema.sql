-- Quote History Tracking Database Schema
-- This schema adds comprehensive tracking for all quote changes

-- Add discount tracking fields to existing proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS original_total_price TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_discount_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS discount_reason TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_modified_by TEXT;

-- Create quote history table to track all changes
CREATE TABLE IF NOT EXISTS quote_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL, -- 'discount_applied', 'status_changed', 'quote_created', 'quote_updated'
    
    -- Previous values
    old_total_price TEXT,
    old_status VARCHAR(20),
    old_discount_percentage DECIMAL(5,2),
    old_discount_amount DECIMAL(10,2),
    
    -- New values
    new_total_price TEXT,
    new_status VARCHAR(20),
    new_discount_percentage DECIMAL(5,2),
    new_discount_amount DECIMAL(10,2),
    
    -- Discount specific fields
    discount_type VARCHAR(20), -- 'percentage', 'fixed'
    discount_value DECIMAL(10,2),
    discount_reason TEXT,
    
    -- Metadata
    changed_by TEXT, -- User email or ID who made the change
    change_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional context
    client_notified BOOLEAN DEFAULT FALSE,
    admin_notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quote_history_proposal_id ON quote_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_created_at ON quote_history(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_history_change_type ON quote_history(change_type);

-- Create view for easy history retrieval with proposal details
CREATE OR REPLACE VIEW quote_history_detailed AS
SELECT 
    qh.*,
    p.project_name,
    p.client_name,
    p.client_company,
    p.created_at as proposal_created_at
FROM quote_history qh
JOIN proposals p ON qh.proposal_id = p.id
ORDER BY qh.created_at DESC;

-- Insert initial history records for existing proposals (optional migration)
-- This creates a baseline for existing quotes
INSERT INTO quote_history (
    proposal_id, 
    change_type, 
    new_total_price, 
    new_status,
    change_description,
    changed_by,
    created_at
)
SELECT 
    id,
    'quote_created',
    total_price,
    COALESCE(status, 'pending'),
    'Initial quote creation (migrated)',
    'system_migration',
    created_at
FROM proposals
WHERE id NOT IN (SELECT DISTINCT proposal_id FROM quote_history WHERE change_type = 'quote_created');

-- Update original_total_price for existing proposals if not set
UPDATE proposals 
SET original_total_price = total_price 
WHERE original_total_price IS NULL;
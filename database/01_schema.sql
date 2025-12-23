-- ============================================
-- ONAV Database Schema Recreation
-- Compatible with Supabase, Neon, or any PostgreSQL provider
-- Created: 2025-12-23
-- ============================================

-- Enable UUID extension (required for UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PRODUCTS TABLE
-- Stores all rental products (cameras, equipment, crew, LED modules, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    description TEXT,
    unit_type TEXT DEFAULT 'diária',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- ============================================
-- 2. USER_PROFILES TABLE
-- Stores user profile information linked to Supabase Auth
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'sales_rep', 'client')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- ============================================
-- 3. LEADS TABLE
-- Stores potential client/lead information
-- ============================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for search
CREATE INDEX IF NOT EXISTS idx_leads_name ON public.leads(name);

-- ============================================
-- 4. CLIENT_SALES_REP_RELATIONSHIPS TABLE
-- Links clients to their assigned sales representatives
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_sales_rep_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    sales_rep_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, sales_rep_id)
);

-- Add indexes for relationship lookups
CREATE INDEX IF NOT EXISTS idx_client_sales_rep_client ON public.client_sales_rep_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sales_rep_sales_rep ON public.client_sales_rep_relationships(sales_rep_id);

-- ============================================
-- 5. PROPOSALS TABLE
-- Main table for storing quote/proposal data
-- ============================================
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User/Owner Information
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    sales_rep_id UUID REFERENCES public.user_profiles(id),
    sales_rep_name TEXT,
    
    -- Client Information
    client_name TEXT,
    client_company TEXT,
    client_email TEXT,
    client_phone TEXT,
    
    -- Project Details
    project_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    
    -- Date Configuration
    shooting_dates_start DATE,
    shooting_dates_end DATE,
    days_count INTEGER DEFAULT 1,
    
    -- LED Principal Configuration
    led_principal_width NUMERIC,
    led_principal_height NUMERIC,
    led_principal_curvature INTEGER,
    led_principal_modules INTEGER,
    led_principal_resolution TEXT,
    led_principal_pixels_width INTEGER,
    led_principal_pixels_height INTEGER,
    led_principal_total_pixels BIGINT,
    
    -- LED Teto (Ceiling) Configuration
    led_teto_width NUMERIC,
    led_teto_height NUMERIC,
    led_teto_modules INTEGER,
    led_teto_resolution TEXT,
    led_teto_pixels_width INTEGER,
    led_teto_pixels_height INTEGER,
    led_teto_total_pixels BIGINT,
    
    -- Power & Weight Data
    principal_power_max INTEGER,
    principal_power_avg INTEGER,
    principal_weight INTEGER,
    teto_power_max INTEGER,
    teto_power_avg INTEGER,
    teto_weight INTEGER,
    
    -- Service Selection
    selected_pod_type TEXT,
    selected_services TEXT,  -- JSON string of selected services array
    
    -- Pricing
    daily_rate NUMERIC,
    total_price TEXT,  -- Formatted string like "R$ 10.000,00"
    original_total_price TEXT,
    
    -- Discount Information
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    discount_reason TEXT,
    discount_description TEXT,  -- JSON string for additional structured data
    total_discount_percentage NUMERIC(5,2) DEFAULT 0,
    total_discount_amount NUMERIC(10,2) DEFAULT 0,
    
    -- Quote URL & Approval
    quote_url_slug TEXT UNIQUE,
    quote_approved BOOLEAN DEFAULT false,
    quote_approved_at TIMESTAMPTZ,
    quote_approval_ip TEXT,
    
    -- Commercial/Admin Fields
    comercial TEXT,
    
    -- Timestamps & Tracking
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_modified_at TIMESTAMPTZ DEFAULT now(),
    last_modified_by TEXT
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON public.proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_sales_rep_id ON public.proposals(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_client_email ON public.proposals(client_email);

-- ============================================
-- 6. QUOTE_HISTORY TABLE
-- Tracks changes to quotes (discount applications, status changes, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS public.quote_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL,
    
    -- Previous State
    old_total_price TEXT,
    old_status VARCHAR(20),
    old_discount_percentage NUMERIC(5,2),
    old_discount_amount NUMERIC(10,2),
    
    -- New State
    new_total_price TEXT,
    new_status VARCHAR(20),
    new_discount_percentage NUMERIC(5,2),
    new_discount_amount NUMERIC(10,2),
    
    -- Discount Details
    discount_type VARCHAR(20),
    discount_value NUMERIC(10,2),
    discount_reason TEXT,
    
    -- Change Metadata
    changed_by TEXT,
    change_description TEXT,
    client_notified BOOLEAN DEFAULT false,
    admin_notes TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for proposal history lookups
CREATE INDEX IF NOT EXISTS idx_quote_history_proposal ON public.quote_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_created_at ON public.quote_history(created_at);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_sales_rep_relationships_updated_at ON public.client_sales_rep_relationships;
CREATE TRIGGER update_client_sales_rep_relationships_updated_at
    BEFORE UPDATE ON public.client_sales_rep_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.products IS 'Rental equipment and services catalog';
COMMENT ON TABLE public.user_profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE public.leads IS 'Potential clients/leads database';
COMMENT ON TABLE public.client_sales_rep_relationships IS 'Client-to-Sales Rep assignments';
COMMENT ON TABLE public.proposals IS 'Quote/Proposal records with LED configurations and pricing';
COMMENT ON TABLE public.quote_history IS 'Audit log of quote modifications';

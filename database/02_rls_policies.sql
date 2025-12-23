-- ============================================
-- ONAV Row Level Security (RLS) Policies
-- For Supabase - Enable RLS and set up access policies
-- ============================================

-- ============================================
-- 1. PRODUCTS TABLE RLS
-- Public read access, admin write access
-- ============================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products (for calculator)
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products"
    ON public.products
    FOR SELECT
    USING (true);

-- Allow admin to insert/update/delete products
DROP POLICY IF EXISTS "Allow admin write access to products" ON public.products;
CREATE POLICY "Allow admin write access to products"
    ON public.products
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role = 'admin'
        )
    );

-- ============================================
-- 2. USER_PROFILES TABLE RLS
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role = 'admin'
        )
    );

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Admins can manage all profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles"
    ON public.user_profiles
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role = 'admin'
        )
    );

-- ============================================
-- 3. LEADS TABLE RLS
-- ============================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Sales reps can view leads they created
DROP POLICY IF EXISTS "Sales reps can view own leads" ON public.leads;
CREATE POLICY "Sales reps can view own leads"
    ON public.leads
    FOR SELECT
    USING (created_by = auth.uid());

-- Admins and sales_reps can view all leads
DROP POLICY IF EXISTS "Admin and sales_rep can view all leads" ON public.leads;
CREATE POLICY "Admin and sales_rep can view all leads"
    ON public.leads
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role IN ('admin', 'sales_rep')
        )
    );

-- Admin and sales_rep can create leads
DROP POLICY IF EXISTS "Admin and sales_rep can create leads" ON public.leads;
CREATE POLICY "Admin and sales_rep can create leads"
    ON public.leads
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role IN ('admin', 'sales_rep')
        )
    );

-- Admin and sales_rep can update leads
DROP POLICY IF EXISTS "Admin and sales_rep can update leads" ON public.leads;
CREATE POLICY "Admin and sales_rep can update leads"
    ON public.leads
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role IN ('admin', 'sales_rep')
        )
    );

-- ============================================
-- 4. CLIENT_SALES_REP_RELATIONSHIPS TABLE RLS
-- ============================================
ALTER TABLE public.client_sales_rep_relationships ENABLE ROW LEVEL SECURITY;

-- Admins can manage all relationships
DROP POLICY IF EXISTS "Admins can manage relationships" ON public.client_sales_rep_relationships;
CREATE POLICY "Admins can manage relationships"
    ON public.client_sales_rep_relationships
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role = 'admin'
        )
    );

-- Sales reps can view relationships where they are the sales_rep
DROP POLICY IF EXISTS "Sales reps can view own relationships" ON public.client_sales_rep_relationships;
CREATE POLICY "Sales reps can view own relationships"
    ON public.client_sales_rep_relationships
    FOR SELECT
    USING (sales_rep_id = auth.uid());

-- ============================================
-- 5. PROPOSALS TABLE RLS
-- ============================================
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Users can view their own proposals
DROP POLICY IF EXISTS "Users can view own proposals" ON public.proposals;
CREATE POLICY "Users can view own proposals"
    ON public.proposals
    FOR SELECT
    USING (user_id = auth.uid());

-- Sales reps can view proposals they created
DROP POLICY IF EXISTS "Sales reps can view created proposals" ON public.proposals;
CREATE POLICY "Sales reps can view created proposals"
    ON public.proposals
    FOR SELECT
    USING (sales_rep_id = auth.uid());

-- Admins can view all proposals
DROP POLICY IF EXISTS "Admins can view all proposals" ON public.proposals;
CREATE POLICY "Admins can view all proposals"
    ON public.proposals
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role = 'admin'
        )
    );

-- Users can create proposals for themselves
DROP POLICY IF EXISTS "Users can create own proposals" ON public.proposals;
CREATE POLICY "Users can create own proposals"
    ON public.proposals
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Sales reps can create proposals
DROP POLICY IF EXISTS "Sales reps can create proposals" ON public.proposals;
CREATE POLICY "Sales reps can create proposals"
    ON public.proposals
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role IN ('admin', 'sales_rep')
        )
    );

-- Admins can update all proposals
DROP POLICY IF EXISTS "Admins can update all proposals" ON public.proposals;
CREATE POLICY "Admins can update all proposals"
    ON public.proposals
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role = 'admin'
        )
    );

-- Sales reps can update proposals they created
DROP POLICY IF EXISTS "Sales reps can update own proposals" ON public.proposals;
CREATE POLICY "Sales reps can update own proposals"
    ON public.proposals
    FOR UPDATE
    USING (sales_rep_id = auth.uid());

-- ============================================
-- 6. QUOTE_HISTORY TABLE RLS
-- ============================================
ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

-- Admins and sales_reps can view quote history
DROP POLICY IF EXISTS "Admin and sales_rep can view quote history" ON public.quote_history;
CREATE POLICY "Admin and sales_rep can view quote history"
    ON public.quote_history
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role IN ('admin', 'sales_rep')
        )
    );

-- Admins and sales_reps can create history entries
DROP POLICY IF EXISTS "Admin and sales_rep can create quote history" ON public.quote_history;
CREATE POLICY "Admin and sales_rep can create quote history"
    ON public.quote_history
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE role IN ('admin', 'sales_rep')
        )
    );

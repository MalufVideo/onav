-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================
-- Applied: 2026-01-11
-- Issue: "infinite recursion detected in policy for relation 'jobs'"
-- 
-- Root Cause: Circular dependency between RLS policies:
-- - jobs SELECT policy checked job_members table
-- - job_members INSERT policy checked jobs table
-- - When trigger on_job_created_add_member fired, it caused infinite recursion
--
-- Solution: Use SECURITY DEFINER helper functions to break the cycle
-- ============================================

-- STEP 1: Create a helper function to check job ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_job_creator(job_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_uuid AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: Create a helper function to check job membership without circular refs
CREATE OR REPLACE FUNCTION public.is_job_member(job_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.job_members 
    WHERE job_id = job_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Create helper for project membership
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = project_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create helper for project admin check
CREATE OR REPLACE FUNCTION public.is_project_admin(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = project_uuid AND user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX JOBS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Job members and admin can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.jobs;

-- SELECT: Use SECURITY DEFINER function to avoid recursion
CREATE POLICY "Job members and admin can view jobs" ON public.jobs FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_master_admin()
    OR public.is_job_member(id)
  );

-- INSERT: Simple check, no cross-table reference needed
CREATE POLICY "Authenticated users can create jobs" ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Allow creators and admins
CREATE POLICY "Authenticated users can update jobs" ON public.jobs FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_master_admin()
    OR public.is_job_member(id)
  );

-- DELETE: Only creator and admin
CREATE POLICY "Authenticated users can delete jobs" ON public.jobs FOR DELETE
  USING (created_by = auth.uid() OR public.is_master_admin());

-- ============================================
-- FIX JOB_MEMBERS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Job members can view job members" ON public.job_members;
DROP POLICY IF EXISTS "Job creator or admin can add members" ON public.job_members;
DROP POLICY IF EXISTS "Job creator or admin can remove members" ON public.job_members;

-- SELECT: Check using SECURITY DEFINER function
CREATE POLICY "Job members can view job members" ON public.job_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_master_admin()
    OR public.is_job_creator(job_id)
    OR public.is_job_member(job_id)
  );

-- INSERT: Allow job creators, admins, or when added_by is current user (for trigger)
CREATE POLICY "Job creator or admin can add members" ON public.job_members FOR INSERT
  WITH CHECK (
    public.is_master_admin()
    OR public.is_job_creator(job_id)
    OR added_by = auth.uid()
  );

-- DELETE: Allow job creators and admins
CREATE POLICY "Job creator or admin can remove members" ON public.job_members FOR DELETE
  USING (
    public.is_master_admin()
    OR public.is_job_creator(job_id)
  );

-- ============================================
-- FIX PROJECTS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

-- SELECT: Use SECURITY DEFINER function
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT 
  USING (
    created_by = auth.uid()
    OR public.is_master_admin()
    OR public.is_project_member(id)
  );

-- INSERT: Simple auth check
CREATE POLICY "Authenticated users can create projects" ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Admins only
CREATE POLICY "Admins can update projects" ON public.projects FOR UPDATE
  USING (
    public.is_master_admin()
    OR public.is_project_admin(id)
  );

-- DELETE: Admins only
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE
  USING (
    public.is_master_admin()
    OR public.is_project_admin(id)
  );

-- ============================================
-- FIX PROJECT_MEMBERS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can add project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can delete project members" ON public.project_members;

-- SELECT
CREATE POLICY "Members can view project members" ON public.project_members FOR SELECT 
  USING (
    user_id = auth.uid()
    OR public.is_master_admin()
    OR public.is_project_member(project_id)
  );

-- INSERT: Allow admins or when user is creating their own membership (for auto-add)
CREATE POLICY "Admins can add project members" ON public.project_members FOR INSERT
  WITH CHECK (
    public.is_master_admin()
    OR public.is_project_admin(project_id)
    OR user_id = auth.uid()
  );

-- UPDATE
CREATE POLICY "Admins can update project members" ON public.project_members FOR UPDATE
  USING (
    (public.is_project_admin(project_id) AND user_id != auth.uid())
    OR public.is_master_admin()
  );

-- DELETE
CREATE POLICY "Admins can delete project members" ON public.project_members FOR DELETE
  USING (
    (public.is_project_admin(project_id) AND user_id != auth.uid())
    OR public.is_master_admin()
  );

-- ============================================
-- ENSURE TRIGGER FUNCTION BYPASSES RLS
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_add_job_creator_as_member()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.job_members (job_id, user_id, added_by)
  VALUES (NEW.id, NEW.created_by, NEW.created_by)
  ON CONFLICT (job_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_job_created_add_member ON public.jobs;
CREATE TRIGGER on_job_created_add_member
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE PROCEDURE public.auto_add_job_creator_as_member();

-- ============================================
-- ADD AUTO-ADD PROJECT CREATOR AS MEMBER
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_add_project_creator_as_member()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_project_created_add_member ON public.projects;
CREATE TRIGGER on_project_created_add_member
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.auto_add_project_creator_as_member();

-- ============================================
-- FIX COLUMNS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Members can view columns" ON public.columns;
DROP POLICY IF EXISTS "Admins can modify columns" ON public.columns;
DROP POLICY IF EXISTS "Project members can insert columns" ON public.columns;
DROP POLICY IF EXISTS "Project members can update columns" ON public.columns;
DROP POLICY IF EXISTS "Project members can delete columns" ON public.columns;

-- SELECT: Project members can view columns
CREATE POLICY "Members can view columns" ON public.columns FOR SELECT
  USING (
    project_id IS NULL
    OR public.is_master_admin()
    OR public.is_project_member(project_id)
  );

-- INSERT: Project members can insert columns
CREATE POLICY "Project members can insert columns" ON public.columns FOR INSERT
  WITH CHECK (
    project_id IS NULL
    OR public.is_master_admin()
    OR public.is_project_member(project_id)
  );

-- UPDATE: Project members can update columns
CREATE POLICY "Project members can update columns" ON public.columns FOR UPDATE
  USING (
    project_id IS NULL
    OR public.is_master_admin()
    OR public.is_project_member(project_id)
  );

-- DELETE: Project admins can delete columns
CREATE POLICY "Project admins can delete columns" ON public.columns FOR DELETE
  USING (
    project_id IS NULL
    OR public.is_master_admin()
    OR public.is_project_admin(project_id)
  );

-- ============================================
-- FIX CARDS TABLE RLS POLICIES
-- ============================================

-- Helper function to check if user has access to a column's project
CREATE OR REPLACE FUNCTION public.can_access_column(col_id text)
RETURNS boolean AS $$
DECLARE
  proj_id uuid;
BEGIN
  SELECT project_id INTO proj_id FROM public.columns WHERE id = col_id;
  
  -- If column has no project (legacy), allow access
  IF proj_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if user is project member or master admin
  RETURN public.is_master_admin() OR public.is_project_member(proj_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Members can manage cards" ON public.cards;
DROP POLICY IF EXISTS "Members can view cards" ON public.cards;
DROP POLICY IF EXISTS "Members can insert cards" ON public.cards;
DROP POLICY IF EXISTS "Members can update cards" ON public.cards;
DROP POLICY IF EXISTS "Members can delete cards" ON public.cards;

-- SELECT: Allow access to cards in accessible columns
CREATE POLICY "Members can view cards" ON public.cards FOR SELECT
  USING (public.can_access_column(column_id));

-- INSERT: Allow inserting cards in accessible columns
CREATE POLICY "Members can insert cards" ON public.cards FOR INSERT
  WITH CHECK (public.can_access_column(column_id));

-- UPDATE: Allow updating cards in accessible columns
CREATE POLICY "Members can update cards" ON public.cards FOR UPDATE
  USING (public.can_access_column(column_id));

-- DELETE: Allow deleting cards in accessible columns
CREATE POLICY "Members can delete cards" ON public.cards FOR DELETE
  USING (public.can_access_column(column_id));

-- ============================================
-- CREATE DEFAULT COLUMNS FOR NEW PROJECTS
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_create_project_columns()
RETURNS trigger AS $$
BEGIN
  -- Insert default Kanban columns for the new project
  INSERT INTO public.columns (id, title, "order", project_id) VALUES
    ('col-' || NEW.id || '-todo', 'To Do', 0, NEW.id),
    ('col-' || NEW.id || '-inprogress', 'In Progress', 1, NEW.id),
    ('col-' || NEW.id || '-review', 'Review', 2, NEW.id),
    ('col-' || NEW.id || '-done', 'Done', 3, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_project_created_add_columns ON public.projects;
CREATE TRIGGER on_project_created_add_columns
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.auto_create_project_columns();

-- ============================================
-- END OF FIX
-- ============================================

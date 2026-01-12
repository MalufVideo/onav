-- Fix infinite recursion in job_members RLS policies
-- Run this in your Supabase SQL Editor

-- Drop the problematic policies
DROP POLICY IF EXISTS "Job members can view job members" ON public.job_members;
DROP POLICY IF EXISTS "Job creator or admin can add members" ON public.job_members;
DROP POLICY IF EXISTS "Job creator or admin can remove members" ON public.job_members;

-- Recreate with fixed policies that don't cause recursion
-- For SELECT: Check if user is the job creator OR is already a member (using a direct join to avoid recursion)
CREATE POLICY "Job members can view job members" ON public.job_members FOR SELECT
  USING (
    -- User is the job creator
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    -- Or user is master admin
    OR public.is_master_admin()
    -- Or the user_id in this row is the current user (they can see their own membership)
    OR user_id = auth.uid()
  );

-- For INSERT: Allow job creators and master admins
-- The SECURITY DEFINER trigger handles auto-adding the creator
CREATE POLICY "Job creator or admin can add members" ON public.job_members FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
    OR added_by = auth.uid()
  );

-- For DELETE: Allow job creators and master admins
CREATE POLICY "Job creator or admin can remove members" ON public.job_members FOR DELETE
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

-- Also fix policies that reference job_members to avoid cascading recursion
-- Fix job_comments policies
DROP POLICY IF EXISTS "Job members can view job comments" ON public.job_comments;
DROP POLICY IF EXISTS "Job members can create job comments" ON public.job_comments;

CREATE POLICY "Job members can view job comments" ON public.job_comments FOR SELECT
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR author_id = auth.uid()
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_members jm 
      WHERE jm.job_id = job_comments.job_id AND jm.user_id = auth.uid()
    )
  );

CREATE POLICY "Job members can create job comments" ON public.job_comments FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_members jm 
      WHERE jm.job_id = job_comments.job_id AND jm.user_id = auth.uid()
    )
  );

-- Fix job_attachments policies
DROP POLICY IF EXISTS "Job members can view job attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Job members can create job attachments" ON public.job_attachments;

CREATE POLICY "Job members can view job attachments" ON public.job_attachments FOR SELECT
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR uploaded_by = auth.uid()
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_members jm 
      WHERE jm.job_id = job_attachments.job_id AND jm.user_id = auth.uid()
    )
  );

CREATE POLICY "Job members can create job attachments" ON public.job_attachments FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_members jm 
      WHERE jm.job_id = job_attachments.job_id AND jm.user_id = auth.uid()
    )
  );

-- Fix services policies
DROP POLICY IF EXISTS "Job members can view services" ON public.services;
DROP POLICY IF EXISTS "Job members can create services" ON public.services;
DROP POLICY IF EXISTS "Job members can update services" ON public.services;

CREATE POLICY "Job members can view services" ON public.services FOR SELECT
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR created_by = auth.uid()
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_members jm 
      WHERE jm.job_id = services.job_id AND jm.user_id = auth.uid()
    )
  );

CREATE POLICY "Job members can create services" ON public.services FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_members jm 
      WHERE jm.job_id = services.job_id AND jm.user_id = auth.uid()
    )
  );

CREATE POLICY "Job members can update services" ON public.services FOR UPDATE
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_members jm 
      WHERE jm.job_id = services.job_id AND jm.user_id = auth.uid()
    )
  );

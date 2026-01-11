-- ONAV Pipeline Schema Migration
-- Run this in your Supabase SQL Editor to add the pipeline feature to the existing ONAV database
-- This combines all the schema from VP-Workflow into a single migration file

-- ============================================
-- MASTER ADMIN CONFIGURATION
-- ============================================
DO $$ BEGIN
  PERFORM set_config('app.master_admin_email', 'nelsonhdvideo@gmail.com', false);
END $$;

-- ============================================
-- PROFILES TABLE (syncs with auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  is_master_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_master_admin boolean DEFAULT false;

-- ============================================
-- PROJECTS TABLE (Creative Kanban Projects)
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('admin', 'team', 'client')) NOT NULL DEFAULT 'team',
  added_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- ============================================
-- COLUMNS TABLE (Kanban Columns)
-- ============================================
CREATE TABLE IF NOT EXISTS public.columns (
  id text PRIMARY KEY,
  title text NOT NULL,
  "order" integer NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE
);

-- ============================================
-- CARDS TABLE (Kanban Cards)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cards (
  id text PRIMARY KEY,
  column_id text REFERENCES public.columns(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  "order" integer DEFAULT 0,
  attachments jsonb DEFAULT '[]',
  comments jsonb DEFAULT '[]',
  history jsonb DEFAULT '[]',
  created_at bigint,
  last_moved_at bigint,
  time_in_columns jsonb DEFAULT '{}'
);

-- ============================================
-- CLIENTS TABLE (Sales Pipeline)
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  notes text,
  client_type text CHECK (client_type IN ('agencia', 'produtora', 'anunciante')),
  custom_fields jsonb DEFAULT '{}',
  stage text NOT NULL DEFAULT 'leads',
  stage_order integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  converted_at timestamp with time zone
);

-- ============================================
-- CLIENT COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- CLIENT ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- JOBS TABLE (Jobs Pipeline)
-- ============================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  value numeric(12, 2),
  notes text,
  agencia text,
  produtora text,
  stage text NOT NULL DEFAULT 'aprovacao',
  stage_order integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- JOB MEMBERS TABLE (Access Control)
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(job_id, user_id)
);

-- ============================================
-- JOB COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- JOB ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- SALES STAGES TABLE (Dynamic Pipeline Columns)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sales_stages (
  id text PRIMARY KEY,
  title text NOT NULL,
  "order" integer NOT NULL,
  color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- JOB STAGES TABLE (Dynamic Pipeline Columns)
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_stages (
  id text PRIMARY KEY,
  title text NOT NULL,
  "order" integer NOT NULL,
  color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_stages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: is_master_admin()
-- ============================================
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT is_master_admin INTO is_admin 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: update_updated_at_column()
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_master_admin)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.email = 'nelsonhdvideo@gmail.com'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- FUNCTION: Auto-add job creator as member
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_add_job_creator_as_member()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.job_members (job_id, user_id, added_by)
  VALUES (NEW.id, NEW.created_by, NEW.created_by)
  ON CONFLICT (job_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_job_created_add_member ON public.jobs;
CREATE TRIGGER on_job_created_add_member
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE PROCEDURE public.auto_add_job_creator_as_member();

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view team member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view team member profiles" ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT pm2.user_id FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES - PROJECTS
-- ============================================
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

CREATE POLICY "Members can view projects" ON public.projects FOR SELECT 
  USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Authenticated users can create projects" ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update projects" ON public.projects FOR UPDATE
  USING (
    id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR public.is_master_admin()
  );

CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE
  USING (
    id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR public.is_master_admin()
  );

-- ============================================
-- RLS POLICIES - PROJECT MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can add project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can delete project members" ON public.project_members;

CREATE POLICY "Members can view project members" ON public.project_members FOR SELECT 
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Admins can add project members" ON public.project_members FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR public.is_master_admin()
  );

CREATE POLICY "Admins can update project members" ON public.project_members FOR UPDATE
  USING (
    (project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    ) AND user_id != auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Admins can delete project members" ON public.project_members FOR DELETE
  USING (
    (project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    ) AND user_id != auth.uid())
    OR public.is_master_admin()
  );

-- ============================================
-- RLS POLICIES - COLUMNS
-- ============================================
DROP POLICY IF EXISTS "Members can view columns" ON public.columns;
DROP POLICY IF EXISTS "Admins can modify columns" ON public.columns;

CREATE POLICY "Members can view columns" ON public.columns FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR public.is_master_admin()
    OR project_id IS NULL
  );

CREATE POLICY "Admins can modify columns" ON public.columns FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR public.is_master_admin()
    OR project_id IS NULL
  );

-- ============================================
-- RLS POLICIES - CARDS
-- ============================================
DROP POLICY IF EXISTS "Members can manage cards" ON public.cards;

CREATE POLICY "Members can manage cards" ON public.cards FOR ALL
  USING (
    column_id IN (
      SELECT c.id FROM public.columns c
      JOIN public.project_members pm ON pm.project_id = c.project_id
      WHERE pm.user_id = auth.uid()
    )
    OR public.is_master_admin()
    OR column_id IN (SELECT id FROM public.columns WHERE project_id IS NULL)
  );

-- ============================================
-- RLS POLICIES - CLIENTS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL OR public.is_master_admin());

CREATE POLICY "Authenticated users can create clients" ON public.clients FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE
  USING (auth.uid() IS NOT NULL OR public.is_master_admin());

CREATE POLICY "Authenticated users can delete clients" ON public.clients FOR DELETE
  USING (created_by = auth.uid() OR public.is_master_admin());

-- ============================================
-- RLS POLICIES - CLIENT COMMENTS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view client comments" ON public.client_comments;
DROP POLICY IF EXISTS "Authenticated users can create client comments" ON public.client_comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.client_comments;

CREATE POLICY "Authenticated users can view client comments" ON public.client_comments FOR SELECT
  USING (auth.uid() IS NOT NULL OR public.is_master_admin());

CREATE POLICY "Authenticated users can create client comments" ON public.client_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can delete own comments" ON public.client_comments FOR DELETE
  USING (author_id = auth.uid() OR public.is_master_admin());

-- ============================================
-- RLS POLICIES - CLIENT ATTACHMENTS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view client attachments" ON public.client_attachments;
DROP POLICY IF EXISTS "Authenticated users can create client attachments" ON public.client_attachments;
DROP POLICY IF EXISTS "Uploaders can delete own attachments" ON public.client_attachments;

CREATE POLICY "Authenticated users can view client attachments" ON public.client_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL OR public.is_master_admin());

CREATE POLICY "Authenticated users can create client attachments" ON public.client_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uploaders can delete own attachments" ON public.client_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR public.is_master_admin());

-- ============================================
-- RLS POLICIES - JOBS
-- ============================================
DROP POLICY IF EXISTS "Job members and admin can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.jobs;

CREATE POLICY "Job members and admin can view jobs" ON public.jobs FOR SELECT
  USING (
    id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR public.is_master_admin()
  );

CREATE POLICY "Authenticated users can create jobs" ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update jobs" ON public.jobs FOR UPDATE
  USING (auth.uid() IS NOT NULL OR public.is_master_admin());

CREATE POLICY "Authenticated users can delete jobs" ON public.jobs FOR DELETE
  USING (created_by = auth.uid() OR public.is_master_admin());

-- ============================================
-- RLS POLICIES - JOB MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Job members can view job members" ON public.job_members;
DROP POLICY IF EXISTS "Job creator or admin can add members" ON public.job_members;
DROP POLICY IF EXISTS "Job creator or admin can remove members" ON public.job_members;

CREATE POLICY "Job members can view job members" ON public.job_members FOR SELECT
  USING (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Job creator or admin can add members" ON public.job_members FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Job creator or admin can remove members" ON public.job_members FOR DELETE
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

-- ============================================
-- RLS POLICIES - JOB COMMENTS
-- ============================================
DROP POLICY IF EXISTS "Job members can view job comments" ON public.job_comments;
DROP POLICY IF EXISTS "Job members can create job comments" ON public.job_comments;
DROP POLICY IF EXISTS "Authors can delete own job comments" ON public.job_comments;

CREATE POLICY "Job members can view job comments" ON public.job_comments FOR SELECT
  USING (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Job members can create job comments" ON public.job_comments FOR INSERT
  WITH CHECK (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Authors can delete own job comments" ON public.job_comments FOR DELETE
  USING (author_id = auth.uid() OR public.is_master_admin());

-- ============================================
-- RLS POLICIES - JOB ATTACHMENTS
-- ============================================
DROP POLICY IF EXISTS "Job members can view job attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Job members can create job attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Uploaders can delete own job attachments" ON public.job_attachments;

CREATE POLICY "Job members can view job attachments" ON public.job_attachments FOR SELECT
  USING (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Job members can create job attachments" ON public.job_attachments FOR INSERT
  WITH CHECK (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Uploaders can delete own job attachments" ON public.job_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR public.is_master_admin());

-- ============================================
-- RLS POLICIES - SERVICES
-- ============================================
DROP POLICY IF EXISTS "Job members can view services" ON public.services;
DROP POLICY IF EXISTS "Job members can create services" ON public.services;
DROP POLICY IF EXISTS "Job members can update services" ON public.services;
DROP POLICY IF EXISTS "Service creator can delete services" ON public.services;

CREATE POLICY "Job members can view services" ON public.services FOR SELECT
  USING (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Job members can create services" ON public.services FOR INSERT
  WITH CHECK (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Job members can update services" ON public.services FOR UPDATE
  USING (
    job_id IN (SELECT job_id FROM public.job_members WHERE user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "Service creator can delete services" ON public.services FOR DELETE
  USING (created_by = auth.uid() OR public.is_master_admin());

-- ============================================
-- RLS POLICIES - SALES STAGES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view sales stages" ON public.sales_stages;
DROP POLICY IF EXISTS "Admin can insert sales stages" ON public.sales_stages;
DROP POLICY IF EXISTS "Admin can update sales stages" ON public.sales_stages;
DROP POLICY IF EXISTS "Admin can delete sales stages" ON public.sales_stages;

CREATE POLICY "Authenticated users can view sales stages" ON public.sales_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert sales stages" ON public.sales_stages FOR INSERT
  WITH CHECK (public.is_master_admin());

CREATE POLICY "Admin can update sales stages" ON public.sales_stages FOR UPDATE
  USING (public.is_master_admin());

CREATE POLICY "Admin can delete sales stages" ON public.sales_stages FOR DELETE
  USING (public.is_master_admin());

-- ============================================
-- RLS POLICIES - JOB STAGES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view job stages" ON public.job_stages;
DROP POLICY IF EXISTS "Admin can insert job stages" ON public.job_stages;
DROP POLICY IF EXISTS "Admin can update job stages" ON public.job_stages;
DROP POLICY IF EXISTS "Admin can delete job stages" ON public.job_stages;

CREATE POLICY "Authenticated users can view job stages" ON public.job_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert job stages" ON public.job_stages FOR INSERT
  WITH CHECK (public.is_master_admin());

CREATE POLICY "Admin can update job stages" ON public.job_stages FOR UPDATE
  USING (public.is_master_admin());

CREATE POLICY "Admin can delete job stages" ON public.job_stages FOR DELETE
  USING (public.is_master_admin());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clients_stage ON public.clients(stage);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON public.clients(client_type);
CREATE INDEX IF NOT EXISTS idx_client_comments_client_id ON public.client_comments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_client_id ON public.client_attachments(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_stage ON public.jobs(stage);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON public.jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_job_members_job_id ON public.job_members(job_id);
CREATE INDEX IF NOT EXISTS idx_job_members_user_id ON public.job_members(user_id);
CREATE INDEX IF NOT EXISTS idx_job_comments_job_id ON public.job_comments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON public.job_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_services_job_id ON public.services(job_id);
CREATE INDEX IF NOT EXISTS idx_services_project_id ON public.services(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_stages_order ON public.sales_stages("order");
CREATE INDEX IF NOT EXISTS idx_job_stages_order ON public.job_stages("order");

-- ============================================
-- SEED DEFAULT SALES STAGES
-- ============================================
INSERT INTO public.sales_stages (id, title, "order", color) VALUES
  ('leads', 'Leads', 0, 'from-blue-500 to-blue-600'),
  ('appointments', 'Agendamentos', 1, 'from-amber-500 to-orange-500'),
  ('presentations', 'Apresentações', 2, 'from-purple-500 to-pink-500'),
  ('sales', 'Vendas', 3, 'from-green-500 to-emerald-500')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DEFAULT JOB STAGES
-- ============================================
INSERT INTO public.job_stages (id, title, "order", color) VALUES
  ('aprovacao', 'Aprovação', 0, 'from-blue-500 to-cyan-500'),
  ('contrato_enviado', 'Contrato Enviado', 1, 'from-cyan-500 to-teal-500'),
  ('contrato_assinado', 'Contrato Assinado', 2, 'from-teal-500 to-green-500'),
  ('cadastro', 'Cadastro', 3, 'from-green-500 to-emerald-500'),
  ('nota_emitida', 'Nota Emitida', 4, 'from-emerald-500 to-lime-500'),
  ('em_producao', 'Em Produção', 5, 'from-amber-500 to-orange-500'),
  ('entrega_executada', 'Entrega Executada', 6, 'from-orange-500 to-red-500'),
  ('pagamento_efetuado', 'Pagamento Efetuado', 7, 'from-purple-500 to-pink-500')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- UPDATE MASTER ADMIN IF EXISTS
-- ============================================
UPDATE public.profiles 
SET is_master_admin = true 
WHERE email = 'nelsonhdvideo@gmail.com';

-- ============================================
-- END OF MIGRATION
-- ============================================

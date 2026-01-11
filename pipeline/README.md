# ONAV Pipeline - VP Workflow Integration

This is the integrated pipeline/kanban feature for the ONAV dashboard. It provides:
- **Leads Pipeline** (`/leads`) - Sales pipeline for managing leads, appointments, presentations, and sales
- **Jobs Pipeline** (`/jobs`) - Job management pipeline from approval to payment
- **Project Kanban** (`/project/:id`) - Creative project kanban boards

## Setup Instructions

### 1. Database Migration

Run the SQL migration to add the pipeline schema to your existing ONAV database:

```bash
# Open your Supabase SQL Editor and run the contents of:
# onav/add-pipeline-schema.sql
```

This will create all necessary tables:
- `profiles` - User profiles with admin status
- `projects` - Creative kanban projects
- `project_members` - Project access control
- `columns` - Kanban columns
- `cards` - Kanban cards
- `clients` - Sales pipeline (leads)
- `jobs` - Jobs pipeline
- `services` - Services linked to jobs
- `sales_stages` - Dynamic sales pipeline columns
- `job_stages` - Dynamic job pipeline columns
- Plus all related tables for comments, attachments, and members

### 2. Install Dependencies

```bash
cd onav/pipeline
npm install
```

### 3. Environment Configuration

Create a `.env` file in the pipeline folder:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials (use the same as main ONAV):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key  # Optional
```

### 4. Development

Run the pipeline development server:

```bash
cd onav/pipeline
npm run dev
```

This will start the pipeline on `http://localhost:3001`

### 5. Production Build

```bash
cd onav/pipeline
npm run build
```

The built files will be in `onav/pipeline/dist/`

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Authentication page |
| `/dashboard` | Admin dashboard (master admin only) |
| `/leads` | Sales pipeline (leads → appointments → presentations → sales) |
| `/jobs` | Jobs pipeline (approval → contract → production → payment) |
| `/project/:id` | Individual project kanban board |

## Access Control

- **Master Admin** (`nelsonhdvideo@gmail.com`) - Full access to all features
- **Team Members** - Access to assigned projects and jobs
- **Clients** - Limited access to specific projects they're invited to

## Dashboard URL

Access the pipeline from: `dashboard.onav.com.br`

After login, you'll be redirected to:
- `/dashboard` if you're a master admin
- `/leads` if you're a regular user

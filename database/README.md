# ONAV Database Migration Guide

This directory contains SQL files to recreate the ONAV calculator database on any PostgreSQL-compatible provider (Supabase, Neon, or other).

## Files

| File | Description |
|------|-------------|
| `01_schema.sql` | Creates all tables, indexes, and triggers |
| `02_rls_policies.sql` | Row Level Security policies (Supabase only) |
| `03_seed_products.sql` | Inserts all rental products data |

## Database Structure

### Tables

1. **products** - Rental equipment catalog (cameras, LED modules, crew, etc.)
2. **user_profiles** - User profiles linked to authentication
3. **leads** - Potential client/lead database
4. **client_sales_rep_relationships** - Client-to-Sales Rep assignments
5. **proposals** - Quote/proposal records with LED configurations
6. **quote_history** - Audit log of quote modifications

## Setup Instructions

### Option 1: Supabase

1. Go to your Supabase project → SQL Editor
2. Run the files in order:
   - First: `01_schema.sql`
   - Second: `02_rls_policies.sql`
   - Third: `03_seed_products.sql`

### Option 2: Neon or Other PostgreSQL

1. Connect to your database using psql or a GUI tool
2. Run the files in order:
   - First: `01_schema.sql`
   - Third: `03_seed_products.sql`

> **Note:** Skip `02_rls_policies.sql` for non-Supabase providers as RLS is Supabase-specific. Implement your own access control at the application level.

### Option 3: Using psql CLI

```bash
# Connect to your database
psql -h your-host -U your-user -d your-database

# Run scripts in order
\i 01_schema.sql
\i 02_rls_policies.sql  # Skip for non-Supabase
\i 03_seed_products.sql
```

## Environment Variables

After setting up the database, update your `.env` file:

```env
# For Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# For Neon or other PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Important Notes

1. **UUID Extension**: The schema requires the `uuid-ossp` extension. It's auto-enabled in Supabase but may need manual setup in other providers.

2. **Auth Integration**: The `user_profiles` table references `auth.users` which is Supabase-specific. For other providers, modify the foreign key or remove it.

3. **RLS Policies**: Only applicable to Supabase. Other providers need application-level access control.

4. **Triggers**: Auto-update `updated_at` timestamps on all tables with that column.

## Modifying for Non-Supabase Providers

If using Neon or another PostgreSQL provider, make these changes to `01_schema.sql`:

```sql
-- Replace this line in user_profiles table:
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

-- With this (standalone UUID):
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
```

Then handle user authentication at the application level.

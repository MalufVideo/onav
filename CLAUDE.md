# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development Server**:
```bash
npm start  # or npm run dev
```
Runs Express server on port 3000 with Supabase integration, Socket.IO, and static file serving.

**Testing**: No automated test suite. Manually test via browser or curl commands to API endpoints.

**Build**: No build process required - static HTML/CSS/JS files are served directly.

**Database CLI**: Use Supabase CLI (`supabase`) for database management and migrations.

## Project Architecture

### Technology Stack
- **Frontend**: Vanilla HTML/CSS/JS with Tailwind CSS
- **Backend**: Node.js Express server (3000 lines in `server.js`)
- **Real-time**: Socket.IO for AI chat functionality
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with custom wrapper
- **Email**: Resend service for transactional emails
- **Deployment**: Vercel (configured via `vercel.json`)

### Core Systems

#### 1. LED Wall Pricing Calculator (`/led/`)
A complex quotation system for LED wall rentals with multiple pricing modes:

**Entry Point**: `/led/index.html` - Authenticated-only calculator interface

**Authentication Flow** (`/led/auth.js`, `auth-config.js`, `auth-protection.js`):
- Custom Supabase Auth wrapper with session persistence
- Role-based access (admin/sales_rep vs. clients)
- Auto-redirects unauthenticated users to `/led/login.html`
- Profile management integrated with proposals table

**Pricing Engine** (`/led/pricing-pods.js`):
- Dynamic pricing for 2D vs 3D LED configurations
- Calculates costs for: LED modules, Disguise processors/servers, RXII tracking units, Rube Draco camera systems
- Studio size pricing categories
- Multi-day rental rates with discount support
- Known bug fix in `inject-fix.js` for Rube Draco display issues

**Quote Management**:
- `quote-service.js`: Saves proposals to Supabase `proposals` table
- `quote-cart-modal.js`: Modal-based quote summary and submission
- `my-quotes.js`: User dashboard to view submitted quotes
- `webhook-service.js`: N8N/CRM integration via webhook proxy

**Dashboard Integration** (`dashboard-integration.js`):
- Links calculator to admin dashboard
- Lead management and quote tracking

#### 2. Admin Dashboard (`/admin/`)
Comprehensive admin interface for managing the business:

**Entry Points**:
- `/admin/admin.html` - Legacy product CRUD interface
- `/admin/dashboard.html` - **Main dashboard** (recommended)

**Dashboard Features** (`dashboard.js`):
- User management (create/edit/delete users with service role key)
- Lead management with search capabilities
- Proposal/quote viewing and discount application
- Real-time notifications system
- Quote history tracking with `quote_history` table
- Calendar view for scheduled shoots

**Product Management** (`admin.js`):
- CRUD operations for LED equipment catalog via `/api/products`
- Product categories: LED modules, processors, servers, tracking, cameras

#### 3. Backend API (`server.js`)
Express server with 50+ API endpoints organized by domain:

**Products API**:
- `GET/POST /api/products` - List/create products
- `PUT/DELETE /api/products/:id` - Update/delete products

**Proposals API**:
- `GET /api/proposals` - List all proposals (with user filtering)
- `POST /api/save-proposal` - Create new proposal
- `PUT /api/proposals/:id/apply-discount` - Apply discount to quote
- `POST /api/proposals/:id/generate-slug` - Generate shareable link
- `GET /api/quotes/public/:slug` - Public quote view
- `POST /api/quotes/approve/:slug` - Client approval endpoint

**Users & Auth API**:
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user with service role key
- `PUT/DELETE /api/users/:id` - User management
- `GET /api/auth/profile` - Current user profile
- `POST /api/check-user-by-email` - Email lookup
- `POST /api/create-client-user` - Client registration
- `PUT /api/update-user-profile` - Profile updates

**Leads API**:
- `GET /api/leads` - List all leads
- `GET /api/leads/search` - Search leads by email/phone
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead

**Quote History API**:
- `GET /api/quote-history/:proposalId` - Get history for proposal
- `POST /api/quote-history` - Log history entry
- `POST /api/setup-quote-history` - Initialize history tracking

**Utilities**:
- `POST /api/send-email` - Resend email service
- `POST /api/webhook-proxy` - CORS proxy for N8N webhooks
- `GET /api/debug/*` - Various debug endpoints

**Socket.IO**:
- AI chat functionality (audio/text input)
- Connected on port 3000

#### 4. Database Schema

**Main Tables**:
- `proposals` - Complete quote data (LED specs, pricing, client info, shooting dates)
- `products` - Equipment catalog
- `quote_history` - Audit trail for quote changes (discounts, status updates)
- `leads` - CRM lead management
- `profiles` - Extended user profiles (linked to `auth.users`)

**Key Schema Files**:
- `/led/unused_files_backup/sql/proposals_table.sql` - Main proposals schema
- `/admin/quote_history_schema.sql` - Quote history tracking schema

**Important Fields in `proposals`**:
- Client: `client_name`, `client_email`, `client_phone`, `client_company`
- Project: `project_name`, `shooting_dates_start`, `shooting_dates_end`, `days_count`
- LED Config: `led_principal_*`, `led_teto_*` (ceiling)
- Pricing: `price_modules_principal`, `price_processors_principal`, `price_server`, `price_rxii`, `price_tracking`, `total_price_2d`, `total_price_3d`
- Mode: `selected_pod_type` ('2d' or '3d')
- Discount: `discount_percentage`, `discount_description`, `original_total_price`
- Sales: `sales_rep_id`, `sales_rep_name`, `lead_id`

### Environment Configuration

**Required `.env` variables**:
```
SUPABASE_URL=https://qhhjvpsxkfjcxitpnhxi.supabase.co
SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_key]  # Required for user management
```

**Deployment**:
- Production: Vercel serverless (see `DEPLOYMENT.md`)
- Frontend can be deployed separately to Hostinger
- Uses `config.js` for environment detection (local vs. production)

### Static Portfolio Site
- Main landing page: `/index.html`
- Service pages: `/producao-virtual-xr.html`, `/projecao-mapeada.html`, etc.
- Concert case studies: `/tours/` (U2, Adele, Coldplay, Beyoncé, Ed Sheeran, etc.)
- Optimized media: `/img/` (mostly WebP format), raw assets in `/img/raw/`
- Portuguese language (Brazilian market)

### Important Notes

**Authentication**:
- Service role key is required for admin user creation from dashboard
- Without it, user management will fail (warning in console)
- Two Supabase clients: `supabase` (anon) and `supabaseAdmin` (service role)

**Known Issues**:
- Rube Draco pricing display bug (fixed in `inject-fix.js`)
- Some UTF-8 encoding issues in legacy README files
- Quote service handles missing database columns gracefully

**File Organization**:
- `/led/unused_files_backup/` - Deprecated/backup files (DO NOT USE)
- `/admin/` - Admin dashboard and database setup tools
- `/tours/` - Case study pages
- `/img/raw/` - Unprocessed media assets

**Multi-User System**:
- Sales reps create quotes for clients
- Clients can view their own quotes at `/led/my-quotes.html`
- Admins see all quotes in dashboard
- Lead capture integrated with quote system

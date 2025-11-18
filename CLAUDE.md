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
- **Backend**: Node.js Express server (~3000 lines in `server.js`)
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
- **Guest Access Mode**: Authentication is DISABLED for calculator access (commented out in `auth-protection.js`)
  - Guests can use calculator and view pricing without login
  - Authentication only required when submitting quote ("Gerar Proposta" button)
  - Guest submission flow: collects email/phone/name → creates guest account → sends magic login link
  - Guest account creation via `/api/register-guest` endpoint
- `quote-service.js` creates public Supabase client for guest users to fetch product prices
- Profile management integrated with proposals table

**Pricing Engine** (`/led/pricing-pods.js`, `/led/led-wall.js`, `/led/discount-calculator.js`):
- **CRITICAL**: `pricing-pods.js` is the SINGLE SOURCE OF TRUTH for pricing display and calculations
- `led-wall.js` handles 3D visualization and LED wall geometry calculations only
- Dynamic pricing for 2D vs 3D LED configurations
- Calculates costs for: LED modules, Disguise processors/servers, RXII tracking units, Stype tracking
- Studio size pricing categories ("Estúdio de 436", etc.) - automatically added to cart
- Multi-day rental rates with progressive discount system (1 day = 0%, 2 days = 25%, up to 720 days = 96%)
- Discount calculator (`discount-calculator.js`) applies tiered discounts based on rental duration, interpolates between defined tiers
- **Pricing Data Flow**:
  1. `led-wall.js` calculates LED geometry → dispatches `ledWallDataCalculated` event
  2. `pricing-pods.js` listens to event → fetches prices from Supabase `products` table
  3. `pricing-pods.js` performs all price calculations and DOM updates
  4. All price display elements (`#rxii-price`, `#tracking-price`, `#total-price`, etc.) controlled exclusively by `pricing-pods.js`
- **Known Issue**: DO NOT add duplicate event handlers or price updates in `led-wall.js` - causes display conflicts

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
- `POST /api/register-guest` - **Public endpoint** for guest user registration (no auth required)
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
- `products` - Equipment catalog with daily rental prices
  - **CRITICAL**: Product names must match exactly in code (case-sensitive):
    - `LED Module` - Per module daily rate
    - `MX-40 Pro Processor` - Disguise processor daily rate
    - `Disguise VX4n (Base)` - Base server daily rate
    - `Disguise VX4n (Backup)` - Backup server daily rate
    - `Disguise RXII Unit` - Per RXII unit daily rate
    - `Stype Tracking` - Tracking system daily rate
    - `Estúdio` - Studio rental (e.g., "Estúdio de 436")
    - `Equipe Técnica Diária` - Technical crew daily rate
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

### Critical Architectural Patterns

**Event-Driven Communication**:
- `led-wall.js` dispatches `ledWallDataCalculated` event when geometry changes
- `pricing-pods.js` listens and recalculates prices
- `quote-cart-modal.js` dispatches `updateProposalSummary` for cart updates
- Always use custom events for cross-module communication

**Price Data Management**:
- All prices stored in Supabase `products` table (not hardcoded)
- `quote-service.js` provides `getProductPrices()` function
- Creates public Supabase client for guest users (no auth required)
- Implements retry logic waiting for Supabase library to load (up to 5 seconds)
- Price format: Use `formatPrice()` helper for Brazilian Real formatting (R$ X.XXX,XX)

**DOM Element Ownership**:
- Each module owns specific DOM elements - DO NOT create duplicate handlers
- `pricing-pods.js` owns: `#rxii-price`, `#tracking-price`, `#total-price`, `#modules-price`, `#processors-price`, `#server-price`, `#studio-price`, `#team-price`
- `led-wall.js` owns: LED 3D visualization canvas and geometry inputs only
- Violating ownership causes race conditions and display bugs

**Supabase Client Patterns**:
- Authenticated users: Use `window.auth.getSupabaseClient()`
- Guest users: Create public client with `window.supabase.createClient(supabaseUrl, window.SUPABASE_KEY)`
- Admin operations: Use `supabaseAdmin` with service role key (server-side only)

### Important Notes

**Authentication**:
- Service role key is required for admin user creation from dashboard
- Without it, user management will fail (warning in console)
- Two Supabase clients: `supabase` (anon) and `supabaseAdmin` (service role)

**Recent Changes** (see git history for details):
- Progressive discount system now applies to all equipment items
- Estúdio pricing automatically added to cart on page load
- Zero-quantity items hidden from shopping cart display
- WhatsApp contact integration in hero section

**Known Issues**:
- Some UTF-8 encoding issues in legacy README files
- Quote service handles missing database columns gracefully

**Fixed Issues**:
- ~~RXII and Tracking prices showing 0 on slider interaction~~ - Fixed by disabling duplicate event handlers in `led-wall.js`
- Rube Draco pricing display bug (fixed in `inject-fix.js`)

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

### Debugging and Troubleshooting

**Common Issues**:

1. **Prices showing as 0 or "Calculating..."**:
   - Check browser console for `[quote-service]` logs showing Supabase client creation
   - Verify `products` table has entries with exact product names (see Database Schema section)
   - Check `[pricing-pods.js]` logs for "Prices fetched successfully" message
   - Ensure `window.SUPABASE_KEY` is loaded (check for `supabaseConfigReady` event)

2. **"Product prices not loaded yet" warning**:
   - Normal on first load - retry logic handles this automatically
   - If persists, check network tab for failed Supabase requests
   - Verify Supabase RLS policies allow public SELECT on `products` table

3. **Display elements not updating**:
   - Check for duplicate event handlers in browser DevTools Event Listeners
   - Verify only `pricing-pods.js` is updating price display elements
   - Look for JavaScript errors in console interrupting calculation flow

4. **Authentication issues for guests**:
   - Verify `auth-protection.js` has redirect logic commented out
   - Check `/api/register-guest` endpoint is accessible without auth
   - Ensure Supabase anon key has permissions to create users

5. **Total price incorrect**:
   - Enable console logging in `pricing-pods.js` `calculateTotal()` method
   - Verify all items are included in calculation (LED, processors, server, RXII, tracking, studio, team)
   - Check if discount is being applied correctly via `discount-calculator.js`

**Useful Console Commands**:
```javascript
// Check if prices are loaded
window.pricingPodsController?.productPrices

// Get current Supabase client
window.auth?.getSupabaseClient()

// Check authentication state
window.auth?.isAuthenticated()

// Manually trigger price recalculation
document.dispatchEvent(new CustomEvent('ledWallDataCalculated', { detail: { totalModules: 100, moduleUnitPrice: 55 }}))
```

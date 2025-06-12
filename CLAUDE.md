# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Since this is a static website with a Node.js backend, use these commands:

- **Start server**: `node server.js` - Runs Express server on port 3000 with Supabase integration
- **Test server**: No specific test scripts defined - manually test endpoints via browser/curl
- **No build process**: Static HTML/CSS/JS files served directly

## Project Architecture

### Core Structure
- **Frontend**: Vanilla HTML/CSS/JS using Tailwind CSS for styling
- **Backend**: Express.js server with Socket.IO and Supabase integration
- **Database**: Supabase (PostgreSQL) for proposals, quotes, and user management
- **Authentication**: Supabase Auth with custom auth wrapper in `/led/auth.js`

### Key Systems

#### LED Wall Pricing Calculator (`/led/`)
Complex pricing system with multiple components:
- **Entry point**: `/led/index.html` - Main configurator interface
- **Authentication**: Uses Supabase auth via `auth.js`, `auth-config.js`, `auth-protection.js`
- **Pricing logic**: `pricing-pods.js` handles dynamic pricing calculations for 2D/3D modes
- **Quote system**: `quote-service.js` saves proposals to Supabase `proposals` table
- **Cart functionality**: `quote-cart-modal.js` manages quote summaries and submissions
- **Bug fixes**: `inject-fix.js` contains fixes for Rube Draco pricing display issues

Key pricing components:
- LED modules, processors, servers
- 3D mode: RXII units, tracking systems
- 2D mode: Different pricing structure
- Studios: Separate pricing category

#### Admin Dashboard (`/admin/`)
Product and quote management system:
- **Main interface**: `admin.html` with product CRUD operations
- **Data management**: `admin.js` handles API calls to `/api/products` endpoint
- **Database schema**: `database_schema.sql` defines product and proposal structures

#### Static Portfolio Pages
- Main services: Virtual production, XR, LED walls, projection mapping
- Case studies: `/tours/` directory with major concert productions (U2, Adele, Coldplay)
- Extensive media library in `/img/` with optimized WebP images

### Important Technical Details

#### Supabase Integration
- URL: `https://qhhjvpsxkfjcxitpnhxi.supabase.co`
- Tables: `proposals`, `products` (see `/admin/database_schema.sql`)
- Auth: Email/password based authentication for LED calculator access

#### Database Schema
The `proposals` table includes:
- User identification and session data
- Client information (name, company, email, phone)
- Project details and shooting dates  
- LED specifications (modules, processors, servers)
- Pricing calculations for different modes (2D/3D)
- Studios and additional equipment pricing

#### Known Issues & Fixes
- Rube Draco pricing display fixed via `inject-fix.js`
- Character encoding issues in README (UTF-8 problems)
- Missing database columns handled in quote service

### Environment Setup
Requires `.env` file with:
```
SUPABASE_URL=https://qhhjvpsxkfjcxitpnhxi.supabase.co
SUPABASE_ANON_KEY=[key]
```

### File Structure Notes
- `/led/unused_files_backup/` contains deprecated components
- `/img/raw/` has unprocessed media assets
- Most images optimized to WebP format for performance
- Portuguese language throughout (Brazil market focus)
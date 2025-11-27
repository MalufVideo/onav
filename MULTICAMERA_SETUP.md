# Multi-Camera / Live Calculator Setup Guide

This guide explains how to set up the database products for the Multi-Camera / Live calculator and manage them through the admin interface.

## Overview

The Multi-Camera calculator (`/led/multicamera.html`) is a 3D interactive tool for pricing live streaming and multi-camera recording setups. It includes:

- **LED Wall** - Same as the main LED calculator
- **Professional Cameras** - Sony EX3, FX6, FX9
- **Camera Support** - Tripods
- **Switchers** - Panasonic HS400
- **Servers** - vMix streaming/recording server
- **Crew** - Camera operators and director

## Required Products in Database

The calculator requires these products in the `products` table:

| Product Name | Price (R$) | Category | Description |
|-------------|-----------|----------|-------------|
| Camera Sony EX3 | 500 | Cameras | Câmera Sony EX3 - Diária |
| Camera Sony FX6 | 1,200 | Cameras | Câmera Sony FX6 - Diária |
| Camera Sony FX9 | 1,800 | Cameras | Câmera Sony FX9 - Diária |
| Tripé | 125 | Camera Support | Tripé para câmera - Diária |
| Operador de Câmera | 800 | Crew | Operador de Câmera Profissional - Diária |
| Switcher Panasonic HS400 | 650 | Switchers | Mesa de Corte Panasonic HS400 - Diária |
| Servidor vMix | 3,500 | Servers | Servidor vMix para Live Streaming/Recording - Diária |
| Diretor de Corte | 1,500 | Crew | Diretor de Corte Profissional - Diária |

**Note:** LED-related products (LED Module, MX-40 Pro Processor, Estúdio) should already exist from the LED calculator setup.

## Setup Methods

### Method 1: Using Node.js Script (Recommended)

The easiest way to populate the database is using the automated script:

```bash
# 1. Ensure you have a .env file with Supabase credentials
# Your .env should contain:
# SUPABASE_URL=https://qhhjvpsxkfjcxitpnhxi.supabase.co
# SUPABASE_ANON_KEY=your_anon_key_here

# 2. Install dependencies (if not already installed)
npm install

# 3. Run the setup script
node scripts/setup-multicamera-products.js
```

The script will:
- Check if each product exists
- Insert new products or update existing ones
- Display a verification table showing all multi-camera products
- Report success/failure for each operation

### Method 2: Using Supabase SQL Editor

If you prefer to use SQL directly:

```bash
# 1. Open your Supabase project dashboard
# 2. Go to SQL Editor
# 3. Copy the contents of led/setup-multicamera-products.sql
# 4. Execute the SQL script
```

The SQL script uses `INSERT ... ON CONFLICT ... DO UPDATE` to safely upsert products without creating duplicates.

### Method 3: Manual Entry via Admin Interface

You can also add products manually through the web interface:

```bash
# 1. Start the development server
npm start

# 2. Navigate to the admin interface
http://localhost:3000/admin/admin.html

# 3. Click "Add New Product" for each item
# 4. Use the updated category dropdown to select the correct category
# 5. Set Unit Type to "Diária (Daily)"
```

## Admin Interface Improvements

The admin interface (`/admin/admin.html`) has been enhanced with:

### Category Dropdown
Now includes organized categories:
- **LED Wall Equipment**: LED Modules, Processors, Servers, Tracking
- **Multi-Camera / Live**: Cameras, Camera Support, Switchers
- **Studio & Crew**: Studio, Crew
- **Other**: Other

### Unit Type Dropdown
Updated to include:
- **Diária (Daily)** - Primary option for multicamera equipment
- Per Day
- Per Unit
- Per Module
- Fixed

## How the Calculator Uses Products

The multicamera calculator (`led/multicamera-calculator.js`) fetches products via:

```javascript
// Fetches all products from /api/products
const response = await fetch('/api/products');
const products = await response.json();

// Maps products by name
this.productPrices = products.reduce((acc, product) => {
  acc[product.name] = parseFloat(product.price);
  return acc;
}, {});

// Updates camera prices from database
if (this.productPrices['Camera Sony EX3'])
  this.cameraPrices['ex3'] = this.productPrices['Camera Sony EX3'];
```

**Important:** Product names must match exactly (case-sensitive) as specified in the table above.

## Pricing Logic

### Daily Rates
All multicamera equipment is priced per day (diária).

### Progressive Discounts
The same discount system from the LED calculator applies:
- Uses `discount-calculator.js`
- Applies tiered discounts based on rental duration
- Example: 2 days = 25% discount, 7 days = 50%, etc.

### Total Calculation
```
Daily Total =
  (LED Modules × Module Price) +
  (Processors × Processor Price) +
  (Cameras × Camera Price) +
  (Tripods × Tripod Price) +
  (Operators × Operator Price) +
  Switcher Price +
  vMix Server Price +
  Director Price +
  Studio Price

Final Total = Daily Total × Days × (1 - Discount%)
```

## Database Schema

The `products` table should have this structure:

```sql
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  unit_type TEXT DEFAULT 'diária',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Updating Prices

To update prices, you have three options:

### 1. Via Admin Interface
- Go to https://www.onav.com.br/admin/admin.html
- Find the product in the table
- Click "Edit"
- Update the price
- Click "Save Product"

### 2. Via Node.js Script
Edit `scripts/setup-multicamera-products.js` and update the price values, then re-run:
```bash
node scripts/setup-multicamera-products.js
```

### 3. Via SQL
```sql
UPDATE public.products
SET price = 1500, updated_at = now()
WHERE name = 'Camera Sony FX6';
```

## Troubleshooting

### Products showing as R$ 0.00 or "..."
**Problem:** Calculator can't find products in database

**Solutions:**
1. Check browser console for errors (F12)
2. Verify product names match exactly (case-sensitive)
3. Run verification: `node scripts/setup-multicamera-products.js`
4. Check API endpoint: `curl http://localhost:3000/api/products`

### "Calculating..." never updates
**Problem:** JavaScript not loading or Supabase client error

**Solutions:**
1. Check browser console for errors
2. Verify `/api/products` endpoint is accessible
3. Check network tab for failed requests
4. Verify `.env` file has correct Supabase credentials

### Prices don't update after changing in admin
**Problem:** Browser cache or stale data

**Solutions:**
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check that the product was actually updated in database

## Files Reference

- **Calculator**: `/led/multicamera.html`, `/led/multicamera-calculator.js`
- **Styles**: `/led/multicamera-styles.css`
- **SQL Setup**: `/led/setup-multicamera-products.sql`
- **Node Script**: `/scripts/setup-multicamera-products.js`
- **Admin Interface**: `/admin/admin.html`, `/admin/admin.js`
- **API Endpoint**: `server.js` - `/api/products`

## Next Steps

After setting up the products:

1. **Test the calculator**: Navigate to `/led/multicamera.html`
2. **Verify pricing**: Check that all prices display correctly
3. **Test quote generation**: Create a test quote with different configurations
4. **Check admin access**: Ensure you can edit prices from the admin interface
5. **Document custom pricing**: If you offer custom pricing tiers, document them for your sales team

## Production Deployment

When deploying to production:

1. Run the setup script against production Supabase:
   ```bash
   # Use production .env
   cp .env.production .env
   node scripts/setup-multicamera-products.js
   ```

2. Or execute the SQL script in production Supabase SQL Editor

3. Verify products are accessible from production admin interface

4. Test the calculator on production URL

## Support

For issues or questions:
- Check browser console for errors
- Review network requests in DevTools
- Verify Supabase RLS policies allow public SELECT on `products` table
- Check server logs for API errors

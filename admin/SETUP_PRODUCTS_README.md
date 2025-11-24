# Products Table Setup Guide

## Overview
The LED calculator requires a `products` table in Supabase with specific product names and prices. If prices are not displaying (showing "..." instead), the products table is likely empty or has incorrect data.

## How to Fix Missing Prices

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project: `qhhjvpsxkfjcxitpnhxi`
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Setup Script
1. Open the file: `/admin/setup_products_table.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" to execute the script

### Step 3: Verify the Data
After running the script, you should see output showing 8 products:

| Name | Category | Price | Unit Type |
|------|----------|-------|-----------|
| LED Module | LED | 74.00 | daily |
| MX-40 Pro Processor | Processors | 1000.00 | daily |
| Disguise VX4n (Base) | Servers | 5000.00 | daily |
| Disguise VX4n (Backup) | Servers | 5000.00 | daily |
| Disguise RXII Unit | Tracking | 3750.00 | daily |
| Stype Tracking | Tracking | 2500.00 | daily |
| Estúdio | Studio | 6000.00 | daily |
| Equipe Técnica Diária | Services | 3000.00 | daily |

### Step 4: Test the Calculator
1. Refresh the LED calculator page: https://www.onav.com.br/led/
2. Open browser console (F12) to see detailed logs
3. Prices should now display correctly instead of "..."

## Important Notes

### Product Names Must Match Exactly
The product names in the database must match exactly what the code expects (case-sensitive):
- ✅ `LED Module` (correct)
- ❌ `Led Module` (wrong)
- ❌ `LED Modules` (wrong)

### Row Level Security (RLS)
The setup script configures RLS policies to allow:
- **Public read access**: Guest users can view products and calculate prices
- **Authenticated write access**: Only logged-in users can modify products

### Updating Prices
To update prices later, you can either:
1. Use the admin dashboard at `/admin/admin.html`
2. Run SQL updates directly:
```sql
UPDATE products SET price = 80.00 WHERE name = 'LED Module';
```

## Troubleshooting

### Prices Still Showing "..."
1. Open browser console (F12) and refresh the page
2. Look for logs starting with `[quote-service][getProductPrices]`
3. Check for errors:
   - "No products found" → Table is empty, run setup script
   - "RLS policy" error → RLS policies not configured, run setup script
   - "Supabase library not loaded" → Check if CDN is accessible

### Testing Products API Directly
You can test if the products are accessible via the API:
```bash
curl https://www.onav.com.br/api/products
```

Expected response: JSON array with 8 products

### Verifying in Supabase Dashboard
1. Go to Supabase Dashboard → Table Editor
2. Open the `products` table
3. Verify you see 8 rows with the correct names
4. Check Authentication → Policies → products table
5. Verify there's a policy allowing SELECT for `anon` role

## Database Schema

The products table structure:
```sql
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    unit_type TEXT NOT NULL DEFAULT 'daily',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Support

If you continue to experience issues after running the setup script:
1. Check browser console for detailed error messages
2. Verify Supabase project is accessible
3. Confirm RLS policies are correctly configured
4. Contact technical support with console logs

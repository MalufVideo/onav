# Mobile Calculator - Supabase Price Integration

## How It Works

The mobile LED calculator fetches prices from your Supabase `products` table in real-time. Here's the flow:

### 1. Initialization Sequence

```
1. config.js loads → Sets up Supabase URL
2. auth-config.js loads → Fetches Supabase anon key from /api/config/supabase-key
3. auth.js loads → Downloads Supabase JS library from CDN
4. quote-service.js loads → Provides getProductPrices() function
5. mobile-calculator.js loads → Waits for quote-service, then fetches prices
```

### 2. Price Fetching Logic

**File:** `mobile-calculator.js` (lines 193-242)

```javascript
async fetchProductPrices() {
  // 1. Wait for quote-service to be available
  await this.waitForQuoteService();

  // 2. Call getProductPrices() from quote-service.js
  const result = await window.quoteService.getProductPrices();

  // 3. Store prices in this.productPrices object
  this.productPrices = result.data;
  // Example: { "LED Module": 55, "MX-40 Pro Processor": 1000, ... }
}
```

**File:** `quote-service.js` (lines 358-412)

- Creates public Supabase client (for guest users)
- Queries `products` table: `SELECT name, price FROM products`
- Returns object mapping product names to prices
- Includes retry logic (waits up to 5 seconds for Supabase library)

### 3. Required Products in Database

The calculator expects these exact product names in your `products` table:

| Product Name | Used For |
|-------------|----------|
| `LED Module` | Individual LED module price |
| `MX-40 Pro Processor` | Disguise processor price |
| `Disguise VX4n (Base)` | Base server price |
| `Disguise VX4n (Backup)` | Backup server price |
| `Disguise RXII Unit` | RXII unit price (3D mode) |
| `Stype Tracking` | Camera tracking price (3D mode) |
| `Estúdio` | Studio rental price |
| `Equipe Técnica Diária` or `Equipe Técnica da Diária` | Technical team price |

**⚠️ Important:** Product names must match exactly (case-sensitive)!

### 4. Database Schema

Your `products` table should have:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Row Level Security (RLS)

Make sure your `products` table allows public read access:

```sql
-- Allow anyone to read products
CREATE POLICY "Allow public read access" ON products
  FOR SELECT
  USING (true);
```

## Troubleshooting

### Prices Show "Carregando..." Forever

**Problem:** Calculator can't fetch prices from Supabase.

**Check:**
1. Open browser console (F12)
2. Look for error messages from `[MobileLEDCalculator]` or `[quote-service]`
3. Common issues:
   - Supabase key not loaded
   - Network error (no internet)
   - RLS policy blocking public access
   - Product names don't match exactly

**Fix:**
```javascript
// Test in browser console:
await window.quoteService.getProductPrices()
// Should return: { success: true, data: {...} }
```

### Prices Show "R$ 0" or Wrong Values

**Problem:** Products not in database or wrong names.

**Check:**
```sql
-- Run in Supabase SQL editor:
SELECT name, price FROM products ORDER BY name;
```

Compare the `name` column with the required names above.

**Fix:**
- Update product names to match exactly
- Or update `mobile-calculator.js` lines 271-278 to match your names

### "Quote service not available" Error

**Problem:** quote-service.js didn't load properly.

**Check:**
1. Verify file exists: `/led/quote-service.js`
2. Check browser console for 404 errors
3. Verify script tag in mobile.html:
   ```html
   <script src="quote-service.js" defer></script>
   ```

### Prices Work But Quote Won't Save

**Problem:** User authentication issue.

**Check:**
```javascript
// Test in browser console:
window.auth.isAuthenticated()
// Should return: true (if logged in)

window.auth.getCurrentUser()
// Should return: { id: "...", email: "..." }
```

**Fix:**
- User must be logged in to save quotes
- Click "Gerar Proposta" → Login modal should appear
- After login, try again

## Testing Prices Locally

### Step 1: Open Browser Console

Press F12 and go to Console tab.

### Step 2: Check Quote Service

```javascript
// Should be defined:
window.quoteService
// Returns: { saveQuote: ƒ, getProposals: ƒ, getProductPrices: ƒ, ... }
```

### Step 3: Fetch Prices Manually

```javascript
const result = await window.quoteService.getProductPrices();
console.log(result);

// Expected output:
// {
//   success: true,
//   data: {
//     "LED Module": 55,
//     "MX-40 Pro Processor": 1000,
//     "Disguise VX4n (Base)": 5000,
//     "Disguise VX4n (Backup)": 5000,
//     "Disguise RXII Unit": 3750,
//     "Stype Tracking": 5000,
//     "Estúdio": 6000,
//     "Equipe Técnica Diária": 0
//   }
// }
```

### Step 4: Check Calculator Prices

```javascript
// Should show loaded prices:
window.mobileCalculator.productPrices

// Should be true:
window.mobileCalculator.pricesLoaded
```

## API Endpoint for Supabase Key

The mobile calculator needs the Supabase anon key to connect.

**Endpoint:** `GET /api/config/supabase-key`

**Expected Response:**
```json
{
  "key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Implementation:** Check your `server.js` file for:
```javascript
app.get('/api/config/supabase-key', (req, res) => {
  res.json({ key: process.env.SUPABASE_ANON_KEY });
});
```

## Success Indicators

✅ **Prices Loaded Successfully:**
- All prices show "R$ X.XXX" format (not "Carregando..." or "R$ 0")
- Console shows: `[MobileLEDCalculator] Prices fetched successfully`
- Sliders update prices in real-time

✅ **Calculator Working:**
- Adjusting LED width/height updates module count
- Module count × price = LED total
- Switching 2D/3D mode shows/hides RXII and Tracking
- Total price updates instantly

✅ **Quote Saving:**
- After login, "Gerar Proposta" opens quote form
- Filling form and submitting shows success message
- Quote appears in "Minhas Propostas" page

## Support

If prices still don't load:

1. Check Supabase dashboard → Table Editor → `products` table
2. Verify RLS policies allow SELECT for anon role
3. Test API endpoint in browser: `https://yourdomain.com/api/config/supabase-key`
4. Check browser console for detailed error messages
5. Verify `.env` file has `SUPABASE_ANON_KEY` set

For additional help, see `/led/CLAUDE.md` documentation.

# Multi-Camera Calculator - Quick Start

## 🚀 One-Command Setup

```bash
# Make sure you have a .env file with your Supabase credentials, then run:
node scripts/setup-multicamera-products.js
```

This will add all 8 required products to your database.

## 📋 What Gets Added

- **3 Cameras**: Sony EX3 (R$500), FX6 (R$1,200), FX9 (R$1,800)
- **1 Tripod**: R$125 per unit
- **1 Switcher**: Panasonic HS400 (R$650)
- **1 Server**: vMix (R$3,500)
- **2 Crew**: Camera Operator (R$800), Director (R$1,500)

## 🔧 Managing Prices

**Update prices anytime at:**
```
https://www.onav.com.br/admin/admin.html
```

Or update the script and re-run it.

## ✅ Verify Setup

After running the script, check:
1. Visit `/led/multicamera.html`
2. Prices should display correctly (not R$ 0.00)
3. Cart should calculate totals properly

## 🛠️ Troubleshooting

**Prices showing R$ 0.00?**
```bash
# Check if products exist:
node scripts/setup-multicamera-products.js

# Check API is working:
curl http://localhost:3000/api/products | jq '.[] | select(.category | contains("Camera"))'
```

**Need to update a single price?**
- Go to admin interface
- Click "Edit" next to the product
- Update price
- Click "Save Product"

## 📚 Full Documentation

See `MULTICAMERA_SETUP.md` for complete details.

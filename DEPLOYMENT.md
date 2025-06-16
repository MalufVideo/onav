# Production Deployment Guide

## Architecture Overview

Your application uses a hybrid deployment model:
- **Frontend**: Static files hosted on Hostinger
- **Backend**: Supabase Edge Functions (serverless)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth

## Deployment Steps

### 1. Frontend Deployment (Hostinger)

Upload these files to your Hostinger hosting:
```
/index.html
/auth.html
/config.js
/led/ (entire folder)
/admin/ (entire folder) 
/img/ (entire folder)
/styles.css (if exists)
```

**Important**: Make sure `config.js` is loaded before any API calls.

### 2. Backend Deployment (Supabase Edge Functions)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Deploy the Edge Function:
```bash
supabase functions deploy api --project-ref qhhjvpsxkfjcxitpnhxi
```

### 3. Environment Variables

Set these in your Supabase project dashboard under Edge Functions:
```
SUPABASE_URL=https://qhhjvpsxkfjcxitpnhxi.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 4. Update Frontend Configuration

In your uploaded files, update any hardcoded URLs to use the config.js system:

Replace:
```javascript
fetch('/api/products')
```

With:
```javascript
fetch(window.getApiUrl('/products'))
```

### 5. Domain Configuration

Update CORS settings in Supabase:
1. Go to your Supabase project dashboard
2. Navigate to Authentication > URL Configuration
3. Add your Hostinger domain to:
   - Site URL
   - Redirect URLs

## File Structure After Deployment

```
Hostinger (yourdomain.com):
├── index.html (entry point)
├── auth.html (centralized login)
├── config.js (environment detection)
├── led/
│   ├── index.html (calculator - auth required)
│   ├── auth.js (authentication logic)
│   └── ...
└── admin/
    ├── dashboard.html (admin interface)
    └── ...

Supabase Edge Functions:
└── functions/
    └── api/
        └── index.ts (API endpoints)
```

## Authentication Flow

1. **Landing Page**: `yourdomain.com/` (index.html)
2. **User clicks "Simular Orçamento"**: Redirects to `auth.html`
3. **After login**:
   - **Admin/Sales Rep**: Auto-redirect to `/admin/dashboard.html`
   - **End Users**: Auto-redirect to `/led/index.html` (calculator)

## API Endpoint Changes

| Local Development | Production |
|-------------------|------------|
| `http://localhost:3000/api/products` | `https://qhhjvpsxkfjcxitpnhxi.supabase.co/functions/v1/api/products` |
| `http://localhost:3000/api/proposals` | `https://qhhjvpsxkfjcxitpnhxi.supabase.co/functions/v1/api/proposals` |

The `config.js` file handles this automatically.

## Testing Deployment

1. Test the main page loads correctly
2. Test login redirects work for different user types
3. Test API calls from the calculator work
4. Test dashboard functionality for admin users

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Check Supabase CORS settings and Edge Function cors headers
2. **Auth Redirects Not Working**: Verify `auth.js` is loading properly
3. **API Calls Failing**: Check Edge Function deployment status
4. **Environment Detection**: Verify `config.js` is loading before other scripts

### Debug URLs:

- Test Edge Function: `https://qhhjvpsxkfjcxitpnhxi.supabase.co/functions/v1/api/test`
- Check Auth: Open browser dev tools and check for auth-related console logs
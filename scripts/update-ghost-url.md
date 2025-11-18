# Fixing Ghost URL Configuration

## Problem
Ghost is generating URLs with `http://ghost-pkocccco88s0wcssk048ks8g.109.123.248.87.sslip.io/` instead of `https://insights.onav.com.br`

## Root Cause
The Ghost installation has the wrong site URL configured in its settings.

## Solutions

### Option 1: Via Ghost Admin Panel (Easiest)
1. Log into Ghost Admin: `https://insights.onav.com.br/ghost/`
2. Go to **Settings** → **General**
3. Look for **Site URL** or **Publication URL**
4. Update to: `https://insights.onav.com.br`
5. Click **Save**

### Option 2: Via Ghost Configuration File
If you have access to the Ghost server:

1. **Locate Ghost installation directory**
   ```bash
   cd /var/www/ghost  # or wherever Ghost is installed
   ```

2. **Edit configuration file**
   ```bash
   nano config.production.json
   ```

3. **Update the URL field**
   ```json
   {
     "url": "https://insights.onav.com.br",
     "server": {
       "port": 2368,
       "host": "0.0.0.0"
     },
     ...
   }
   ```

4. **Restart Ghost**
   ```bash
   ghost restart
   # or if using systemd:
   sudo systemctl restart ghost
   # or if using Docker:
   docker restart ghost
   ```

### Option 3: Via Environment Variables
If Ghost is running via Docker or environment variables:

1. **Update environment variable**
   ```bash
   export url=https://insights.onav.com.br
   ```

2. **Or in Docker Compose:**
   ```yaml
   environment:
     - url=https://insights.onav.com.br
   ```

3. **Restart container/service**

### Option 4: Via Ghost CLI
If you have Ghost CLI installed:

```bash
cd /var/www/ghost
ghost config url https://insights.onav.com.br
ghost restart
```

## Verification

After making changes:

1. Check a post URL - it should now show:
   `https://insights.onav.com.br/post-slug/`

2. Run our check script:
   ```bash
   npm run check-config
   ```

## Important Notes

- **All post URLs will automatically update** once Ghost is restarted with the correct URL
- **No need to re-upload posts** - Ghost will handle URL changes
- **RSS feeds and sitemaps** will also update automatically
- **Existing links** from old URL will need to be redirected (optional)

## If You're Using a Hosting Provider

### Ghost(Pro)
- Contact Ghost support or update in Ghost Admin panel

### DigitalOcean/Linode/AWS
- SSH into server and follow Option 2 or 4

### Docker/Portainer
- Update environment variables and restart container

### cPanel/DirectAdmin
- Access file manager, edit config file, restart Ghost service

## After Fixing

1. Clear browser cache
2. Check that posts load correctly at `insights.onav.com.br`
3. Update any bookmarks or saved links
4. Consider setting up 301 redirects from old URL (optional)

## Need Help?

If you're not sure where Ghost is installed or how it's configured:

1. Check your hosting dashboard
2. Look for Ghost service/container logs
3. Contact your hosting provider
4. Check Ghost documentation: https://ghost.org/docs/config/

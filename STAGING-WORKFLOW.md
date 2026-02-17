# Staging Workflow Guide

## Branch Structure

- **`main`** - Production branch (live website)
- **`staging`** - Testing branch (staging website)

## Workflow: Test Before Merging to Production

### Step 1: Make Changes on Staging

```bash
# Switch to staging branch
git checkout staging

# Make your changes to files...

# Stage and commit
git add .
git commit -m "Your changes description"

# Push to staging
git push origin staging
```

### Step 2: Deploy Staging to Test URL

You need to set up hosting for the `staging` branch:

**Option A: GitHub Pages (Free)**
- Go to your repo settings → Pages
- Set source to `staging` branch
- Staging URL will be: `https://malufvideo.github.io/onav/`

**Option B: Netlify/Vercel/Render (Free)**
- Connect your GitHub repo
- Create TWO sites:
  - Site 1: Deploy from `staging` branch → staging URL
  - Site 2: Deploy from `main` branch → production URL

**Option C: Manual FTP/Server**
- Upload `staging` branch files to test server
- Upload `main` branch files to production server

### Step 3: Test Your Changes

Visit your staging URL and test all changes thoroughly.

### Step 4: Merge to Main (Production)

Once you approve the changes on staging:

```bash
# Switch to main
git checkout main

# Merge staging into main
git merge staging

# Push to production
git push origin main
```

Your production site will now update with the tested changes!

### Step 5: Keep Staging in Sync

After merging, make sure staging stays updated:

```bash
git checkout staging
git merge main
git push origin staging
```

---

## Quick Reference

```bash
# Work on staging
git checkout staging
# ... make changes ...
git add .
git commit -m "Description"
git push origin staging
# → Test on staging URL

# Approve and merge to production
git checkout main
git merge staging
git push origin main
# → Live on production URL

# Sync staging back
git checkout staging
git merge main
git push origin staging
```

## Emergency Rollback

If production breaks:

```bash
git checkout main
git revert HEAD
git push origin main
```

Or revert to a specific commit:

```bash
git checkout main
git reset --hard <commit-hash>
git push origin main --force
```

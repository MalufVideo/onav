# Email Configuration Guide

## Overview
The contact form uses either **Resend** (recommended) or **SMTP** to send emails. You need to configure at least one of these services.

## Option 1: Resend (Recommended)

### Steps:
1. Go to [resend.com](https://resend.com) and create an account
2. Generate an API key from your dashboard
3. Add the following environment variables:

**Local Development (.env file):**
```
RESEND_API_KEY=re_your_actual_api_key_here
SENDER_EMAIL_ADDRESS=contato@onav.com.br
CONTACT_FORM_RECIPIENT=nelsonhdvideo@gmail.com
```

**Vercel Production:**
```bash
vercel env add RESEND_API_KEY
# Enter your API key when prompted

vercel env add SENDER_EMAIL_ADDRESS
# Enter: contato@onav.com.br

vercel env add CONTACT_FORM_RECIPIENT
# Enter: nelsonhdvideo@gmail.com
```

### Domain Verification (Required for production):
1. In Resend dashboard, add your domain: `onav.com.br`
2. Add the provided DNS records to your domain registrar
3. Wait for verification (usually takes a few minutes)
4. Update `SENDER_EMAIL_ADDRESS` to use your verified domain

## Option 2: SMTP (Fallback)

If Resend is not configured, the system will automatically use SMTP.

**Environment Variables:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SENDER_EMAIL_ADDRESS=contato@onav.com.br
CONTACT_FORM_RECIPIENT=nelsonhdvideo@gmail.com
```

### Gmail Setup:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use that App Password in `SMTP_PASS`

## Testing

### Local Testing:
1. Update your `.env` file with the credentials
2. Start the server: `npm start`
3. Open `http://localhost:3000`
4. Fill out and submit the contact form

### Production Testing:
1. Add environment variables to Vercel dashboard or via CLI
2. Deploy: `git push origin main`
3. Visit `www.onav.com.br` and test the form

## Current Email Flow

The server (`server.js`) has this logic:
1. First, tries to send via **Resend** (if `RESEND_API_KEY` is configured)
2. If Resend fails or isn't configured, falls back to **SMTP** (if SMTP credentials are configured)
3. If neither is configured, returns an error

## Form Features

✅ **Improved Features:**
- Animated loading spinner during submission
- Beautiful success/error messages (no more alerts!)
- Auto-dismiss success message after 5 seconds
- Form validation (required fields)
- Smooth scroll to message
- Prevents duplicate submissions

## Troubleshooting

**Issue:** "Nenhum provedor de email configurado"
- **Solution:** Add `RESEND_API_KEY` or SMTP credentials to environment variables

**Issue:** "Domain not verified" (Resend)
- **Solution:** Complete domain verification in Resend dashboard

**Issue:** Emails not arriving
- **Solution:** Check spam folder, verify email addresses, check server logs

**Issue:** Gmail SMTP authentication failed
- **Solution:** Use App Password, not regular password

## Environment Variables Summary

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | One of Resend/SMTP | `re_123abc...` | Resend API key |
| `SMTP_HOST` | One of Resend/SMTP | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | With SMTP | `587` | SMTP server port |
| `SMTP_SECURE` | With SMTP | `false` | Use TLS (true/false) |
| `SMTP_USER` | With SMTP | `user@gmail.com` | SMTP username |
| `SMTP_PASS` | With SMTP | `app-password` | SMTP password |
| `SENDER_EMAIL_ADDRESS` | Optional | `contato@onav.com.br` | From email address |
| `CONTACT_FORM_RECIPIENT` | Optional | `nelsonhdvideo@gmail.com` | Where to send form submissions |

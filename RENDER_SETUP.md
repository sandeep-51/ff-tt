# Render Deployment Guide - Email Setup

## Quick Setup for Render (Recommended)

### Step 1: Create a SendGrid Account (FREE)

SendGrid is the recommended email provider for Render deployments:
- **Free Tier**: 100 emails/day (perfect for most events)
- **Easy Setup**: Just 2 environment variables needed
- **Reliable**: Industry-standard email delivery

1. **Sign up for SendGrid**: https://signup.sendgrid.com/
2. **Verify your email** (check your inbox)
3. **Create an API Key**:
   - Go to: https://app.sendgrid.com/settings/api_keys
   - Click "Create API Key"
   - Name it: "Render Event App"
   - Select "Full Access"
   - Copy the API key (you'll only see it once!)

### Step 2: Verify Your Sender Email

SendGrid requires you to verify who you're sending emails from:

1. Go to: https://app.sendgrid.com/settings/sender_auth
2. Click "Verify a Single Sender"
3. Fill in your details:
   - From Name: "Event Registration" (or your event name)
   - From Email: "noreply@yourdomain.com" (use a real email you control)
   - Reply To: Your actual email
4. Check your email and click the verification link
5. Use this verified email as `EMAIL_FROM` in Render

### Step 3: Configure Render Environment Variables

Go to your Render dashboard → Your Web Service → Environment tab

Add these **exact** variables:

```
# SendGrid SMTP Settings (Required)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY_HERE

# Email Settings (Required)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Event Registration

# Other Required Variables
MONGODB_URI=your-mongodb-connection-string
DATABASE_NAME=event_registration
ADMIN_PASS=your-secure-admin-password
SESSION_SECRET=your-random-secret-key
NODE_ENV=production
SITE_URL=https://your-app.onrender.com
```

### Step 4: Deploy and Test

After setting the environment variables:
1. Your Render app will automatically redeploy
2. Check the logs for: `✅ SMTP connection verified successfully`
3. Register a test user to receive a QR code email
4. Check your inbox (and spam folder)

---

## Alternative SMTP Providers

### Option 2: Mailgun (Free Tier: 100 emails/day)

1. Sign up at: https://signup.mailgun.com/
2. Verify your domain or use their sandbox domain
3. Get SMTP credentials from: Settings → SMTP Credentials

```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-smtp-username
SMTP_PASS=your-mailgun-smtp-password
```

### Option 3: AWS SES (Very Cheap but Complex Setup)

1. Sign up for AWS and enable SES
2. Verify your sending email/domain
3. Create SMTP credentials in IAM

```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

### Option 4: Gmail (Development Only - NOT for Production)

⚠️ **Not recommended for Render** - Gmail has strict sending limits and may block automated emails.

If you must use Gmail for testing:
1. Enable 2-Factor Authentication
2. Create App Password: https://myaccount.google.com/apppasswords

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

---

## Troubleshooting

### "SMTP connection failed"
- Double-check your API key is copied correctly (no extra spaces)
- Verify `SMTP_USER=apikey` (literally the word "apikey" for SendGrid)
- Check SendGrid dashboard for account status

### "Sender email not verified"
- Go to SendGrid Sender Authentication
- Verify your `EMAIL_FROM` address
- Wait for verification email and click the link

### Emails going to spam
- Use a verified sender domain (not gmail.com or yahoo.com)
- Add SPF and DKIM records to your domain (SendGrid provides these)
- Keep email content professional (avoid spam trigger words)

### Still not working?
Check Render logs:
```bash
# In Render dashboard → Logs tab, look for:
📧 Email Service Configuration:
- Service: SMTP (Nodemailer)
- Host: smtp.sendgrid.net
- Auth: ✅ SET (apikey)
```

---

## Security Best Practices

✅ **DO:**
- Use SendGrid API keys (they're designed for this)
- Set `NODE_ENV=production` on Render
- Use strong, random `SESSION_SECRET`
- Keep API keys in Render environment variables (never in code)

❌ **DON'T:**
- Commit `.env` files to Git
- Use Gmail for production (it will get blocked)
- Share your SendGrid API key
- Use default admin password

---

## Cost Comparison

| Provider | Free Tier | Cost After Free |
|----------|-----------|-----------------|
| **SendGrid** | 100/day | $15/month for 40k |
| **Mailgun** | 100/day (5k first month) | $35/month for 50k |
| **AWS SES** | 62k/month (1st year) | $0.10 per 1,000 |
| **Gmail** | ~100/day (not reliable) | Not for production |

**Recommendation**: Start with SendGrid free tier. It's perfect for most event registrations.

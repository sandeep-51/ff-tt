# Render Deployment Guide

## Email Configuration for Render

This application now uses standard SMTP email (via Nodemailer) instead of third-party API services. This makes it easy to deploy on Render or any other hosting platform.

### Environment Variables to Set on Render

Go to your Render dashboard → Your Web Service → Environment tab, and add the following environment variables:

#### Required SMTP Settings

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Email Sender Information

```
EMAIL_FROM=noreply@yourevent.com
EMAIL_FROM_NAME=Event Registration
```

#### Other Required Variables

```
MONGODB_URI=your-mongodb-connection-string
DATABASE_NAME=event_registration
ADMIN_PASS=your-secure-admin-password
SESSION_SECRET=your-random-secret-key
NODE_ENV=production
SITE_URL=https://your-app.onrender.com
```

### Using Gmail SMTP

If you're using Gmail:

1. **Enable 2-Factor Authentication** on your Google account
2. **Create an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password
3. **Set Environment Variables**:
   - `SMTP_USER`: Your Gmail address (e.g., `yourname@gmail.com`)
   - `SMTP_PASS`: The 16-character app password (no spaces)
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_SECURE`: `false`

### Using Other SMTP Providers

#### SendGrid
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-smtp-username
SMTP_PASS=your-mailgun-smtp-password
```

#### AWS SES
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

### Testing Email Configuration

After deployment, the server will log the email configuration on startup:

```
📧 Email Service Configuration:
- Service: SMTP (Nodemailer)
- Host: smtp.gmail.com
- Port: 587
- Secure: false
- Auth: ✅ SET (your-email@gmail.com)
- From: Event Registration <noreply@yourevent.com>
```

Check your Render logs to verify the configuration is correct.

### Troubleshooting

**Emails not sending?**
1. Check Render logs for error messages
2. Verify SMTP credentials are correct
3. For Gmail, ensure you're using an App Password, not your regular password
4. Check spam folder for test emails
5. Verify `EMAIL_FROM` is a valid email format

**Connection timeout?**
1. Try `SMTP_PORT=465` with `SMTP_SECURE=true`
2. Check if your SMTP provider requires allowlisting of IPs
3. Verify SMTP provider credentials are active

### Security Notes

- Never commit `.env` files to version control
- Use strong, unique passwords for `ADMIN_PASS` and `SESSION_SECRET`
- For `SESSION_SECRET`, generate a random string:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

# Deployment Guide

This guide will help you deploy the Event Registration System to a hosting platform.

## Prerequisites

Before deploying, you need:
1. A MongoDB database (MongoDB Atlas recommended - free tier available)
2. A hosting platform that supports Node.js (Replit, Vercel, Railway, Render, etc.)
3. (Optional) Gmail account with App Password for email functionality

## Environment Variables

The app requires the following environment variables. Copy `.env.example` to `.env` and fill in the values:

### Required Variables

```env
# MongoDB Configuration (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=YourAppName
DATABASE_NAME=event_registration

# Admin Password (REQUIRED - SECURITY CRITICAL!)
# This password protects your entire admin panel
# Use a strong, unique password - do NOT use the default
ADMIN_PASS=your_secure_password

# Site URL (REQUIRED - your deployed URL)
SITE_URL=https://yourdomain.com

# Session Secret (REQUIRED - generate a random string)
SESSION_SECRET=your_random_secret_key

# Node Environment (REQUIRED for production)
NODE_ENV=production
```

**IMPORTANT**: Make sure `NODE_ENV=production` is set in your deployment platform for proper session cookie handling!

### Optional Variables (for email functionality)

```env
EMAIL_SERVICE=Gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

## MongoDB Setup (MongoDB Atlas - Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create a database user with read/write permissions
4. Get your connection string (it looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
5. Whitelist all IP addresses (0.0.0.0/0) or your hosting platform's IPs
6. Use this connection string as your `MONGODB_URI`

## Deployment Steps

### Option 1: Deploy on Replit (Easiest)

1. Open your Repl
2. Go to the "Secrets" tab (🔒 icon in the left sidebar)
3. Add all required environment variables from above
4. Click the "Run" button
5. Your app will be available at `https://your-repl-name.repl.co`

### Option 2: Deploy on Render

1. Push your code to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repository
4. Set the build command: `npm install`
5. Set the start command: `npm start`
6. Add all environment variables in the "Environment" section
7. Deploy!

### Option 3: Deploy on Railway

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Railway will auto-detect Node.js
5. Add environment variables in the Variables section
6. Deploy!

### Option 4: Deploy on Vercel

1. Push your code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Set build command: `npm run build`
4. Add environment variables
5. Deploy!

## Gmail App Password Setup (Optional)

If you want to send QR codes via email:

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Create a new app password for "Mail"
4. Use this password as `EMAIL_PASS` (not your regular Gmail password)

## Post-Deployment

After deployment:

1. Visit `/admin` to access the admin dashboard
2. Login with the password you set in `ADMIN_PASS`
3. Create your first event registration form
4. Publish it to make it available to users
5. Share your site URL with attendees

## Troubleshooting

### Database Connection Failed
- Check your MongoDB URI is correct
- Ensure your MongoDB cluster allows connections from your hosting platform
- Verify database user credentials

### Session/Login Issues (COMMON IN PRODUCTION)

**CRITICAL**: You MUST set `NODE_ENV=production` for production deployments. This enables secure HTTPS cookies required for authentication.

**Quick Fixes:**
1. Set `NODE_ENV=production` in your deployment platform
2. Set `SESSION_SECRET` to a strong random value (not the default)
3. Clear browser cookies and try again
4. Check server logs for errors about missing environment variables

**How to verify:**
- Check server logs on startup - you should NOT see errors about missing NODE_ENV
- Browser DevTools → Application → Cookies should show a session cookie with Secure flag
- Logout, save, publish, and edit functions should work without 401 errors

**Platform-Specific Setup:**
- **Replit**: Add `NODE_ENV=production` to Secrets tab
- **Vercel**: Add to Environment Variables in project settings  
- **Railway/Render**: Add to environment variables in dashboard

**If sessions still fail after setting NODE_ENV:**
1. Verify `SESSION_SECRET` is set and not the default value
2. Check browser console for cookie errors
3. Ensure cookies are enabled in your browser
4. Check server logs for environment variable errors

### Forms Not Saving / 401 Unauthorized Errors
This is typically a session cookie issue. The app will show warnings on startup if critical environment variables are missing.

**Fix:**
1. Check server logs for environment variable warnings
2. Verify `SESSION_SECRET` is configured (not the default value)
3. Ensure cookies are enabled in your browser
4. Clear cookies and log in again

### Email Not Sending
- Verify Gmail App Password is correct
- Check EMAIL_USER and EMAIL_PASS are set
- Enable "Less secure app access" might be needed for some accounts

## Security Notes

1. **Always** change `ADMIN_PASS` in production
2. **Always** use a strong random `SESSION_SECRET` 
3. **Never** commit `.env` file to git
4. Keep your MongoDB credentials secure
5. Use HTTPS in production (most platforms provide this automatically)

## Support

For issues or questions, check the application logs in your hosting platform's dashboard.

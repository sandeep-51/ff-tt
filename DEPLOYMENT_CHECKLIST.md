# Deployment Checklist ✅

Use this checklist to ensure your deployment is configured correctly.

## 🔧 Environment Variables (MUST SET ALL)

- [ ] `MONGODB_URI` - Your MongoDB connection string
- [ ] `DATABASE_NAME` - Database name (default: event_registration)
- [ ] `ADMIN_PASS` - **SECURITY CRITICAL** - Strong admin password (NOT the default!)
- [ ] `SESSION_SECRET` - Random secret key (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] `NODE_ENV` - **MUST be set to `production`**
- [ ] `SITE_URL` - Your deployed URL (e.g., https://yourdomain.com)

## 📧 Optional Email Variables

- [ ] `EMAIL_SERVICE` - Email service (e.g., Gmail)
- [ ] `EMAIL_USER` - Your email address
- [ ] `EMAIL_PASS` - App-specific password
- [ ] `EMAIL_FROM` - From email address

## 🚀 Pre-Deployment Steps

1. [ ] MongoDB database is created and accessible
2. [ ] Database user has read/write permissions
3. [ ] IP whitelist allows connections (0.0.0.0/0 for cloud platforms)
4. [ ] All environment variables are set in deployment platform
5. [ ] `NODE_ENV=production` is confirmed

## 🧪 Post-Deployment Testing

### Test Admin Functions:
1. [ ] Can access `/admin` page
2. [ ] Can login with `ADMIN_PASS`
3. [ ] Can create a new form
4. [ ] Can save form changes
5. [ ] Can publish a form
6. [ ] Can unpublish a form
7. [ ] Can delete a form
8. [ ] Can logout successfully

### Test Public Functions:
1. [ ] Published form appears on homepage
2. [ ] Can submit a registration
3. [ ] QR code is generated
4. [ ] Can view registrations in admin
5. [ ] Can export data (CSV/Excel/PDF)
6. [ ] Can scan QR codes

## 🐛 Common Issues & Fixes

### Issue: "401 Unauthorized" when saving forms
**Fix**: Set `NODE_ENV=production` in your deployment environment

### Issue: Login doesn't persist / keeps logging out
**Fix**: 
1. Verify `SESSION_SECRET` is set
2. Verify `NODE_ENV=production` is set
3. Clear browser cookies and try again

### Issue: "Cannot connect to database"
**Fix**:
1. Check `MONGODB_URI` is correct
2. Verify IP whitelist in MongoDB Atlas
3. Verify database user credentials

### Issue: Forms not appearing after refresh
**Fix**: Check browser console for errors, verify database connection

## 📱 Platform-Specific Notes

### Replit
- Environment variables go in "Secrets" tab
- Sessions work automatically
- No additional configuration needed

### Vercel
- Set environment variables in project settings
- May need serverless-friendly session storage for production
- Ensure `NODE_ENV=production` is set

### Railway / Render
- Add environment variables in dashboard
- Sessions work with Express
- Ensure `NODE_ENV=production` is set

## ✅ Ready to Deploy!

Once all checkboxes are complete, your app is ready for production use!

# Authentication System Deployment Checklist

Quick checklist for deploying the SaLKo website with the new authentication system.

## ✅ Pre-Deployment Checklist

### 1. GitHub Secrets Configuration

- [ ] Add `NEXTAUTH_SECRET` (development)
- [ ] Add `NEXTAUTH_SECRET_PROD` (production)
- [ ] Add `GOOGLE_CLIENT_ID` (development)
- [ ] Add `GOOGLE_CLIENT_SECRET` (development)
- [ ] Add `GOOGLE_CLIENT_ID_PROD` (production)
- [ ] Add `GOOGLE_CLIENT_SECRET_PROD` (production)

**Guide:** See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)

### 2. Google Workspace OAuth Setup

- [ ] Create Google Cloud project
- [ ] Enable Google+ API
- [ ] Configure OAuth consent screen (Internal)
- [ ] Create OAuth Client ID (Web application)
- [ ] Add redirect URIs:
  - [ ] `https://kehitys.savonlinnanlentokerho.fi/api/auth/callback/google`
  - [ ] `https://savonlinnanlentokerho.fi/api/auth/callback/google`
- [ ] Copy Client ID and Secret to GitHub Secrets

**Guide:** See [AUTH_SETUP.md](AUTH_SETUP.md#google-workspace-oauth-setup)

### 3. Database Schema Verification

Files that will be executed on deployment:
- [ ] `postgres/init/01-schema.sql` - Contains auth tables
- [ ] `postgres/init/02-seed-users.sql` - Contains admin user with bcrypt password

### 4. Workflow Files Updated

- [ ] `.github/workflows/deploy-app-dev.yaml` - Includes NextAuth variables
- [ ] `.github/workflows/deploy-app-prod.yaml` - Includes NextAuth variables

---

## 🚀 Deployment Steps

### Development Environment

1. **Commit and push changes:**
   ```bash
   git add .
   git commit -m "Add authentication system with Google Workspace OAuth"
   git push origin dev
   ```

2. **Build and publish Docker image:**
   - Trigger `build-and-publish-dev.yaml` workflow
   - Or: Automated on push to `dev` branch

3. **Deploy to development server:**
   - Trigger `deploy-app-dev.yaml` workflow
   - Select branch: `dev`
   - Select image version: `latest`

4. **Verify deployment:**
   - Visit: `https://kehitys.savonlinnanlentokerho.fi`
   - Check database was recreated (dev destroys volumes)
   - Test admin login
   - Test Google OAuth

### Production Environment

1. **Merge to main branch:**
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

2. **Build and publish Docker image:**
   - Trigger `build-and-publish-prod.yaml` workflow

3. **Deploy to production server:**
   - Trigger `deploy-app-prod.yaml` workflow
   - Select branch: `main`
   - Select image version: `latest` or specific version

4. **Verify deployment:**
   - Visit: `https://savonlinnanlentokerho.fi`
   - Test admin login
   - Test Google OAuth

---

## 🧪 Post-Deployment Testing

### Test Credentials Login

1. Navigate to the site
2. Click "Jäsenalue" → "Kirjaudu sisään"
3. Enter credentials:
   - **Email:** `admin@savonlinnanlentokerho.fi`
   - **Password:** `Admin123!`
4. Should redirect to homepage
5. User name should appear in navbar

✅ **Expected:** Successful login, no errors

### Test Google OAuth Login

1. Navigate to login page
2. Click "Kirjaudu Google Workspacella"
3. Select `@savonlinnanlentokerho.fi` account
4. Grant permissions if prompted
5. Should redirect to homepage
6. User name should appear in navbar

✅ **Expected:** Successful login, user auto-created on first login

### Test Guest Booking

1. **Without logging in**, navigate to `/kalusto/varauskalenteri`
2. Calendar should be visible
3. Try to create a booking
4. Should require: name, email, phone number
5. Submit booking

✅ **Expected:** Booking created, appears on calendar with contact name

### Test Role-Based Access

1. **As admin:**
   - Navigate to `/admin` → Should have access
   - View all bookings including guest contact info

2. **As regular user:**
   - Login with test account
   - Navigate to `/admin` → Should redirect with error
   - Can manage own bookings only

3. **As guest (unauthenticated):**
   - Navigate to `/admin` → Should redirect to login
   - Navigate to `/profiili` → Should redirect to login
   - Navigate to `/kalusto/varauskalenteri` → Should have access

✅ **Expected:** Proper access control based on roles

---

## 🔧 Troubleshooting

### Issue: "NEXTAUTH_SECRET is not defined"

**Cause:** Missing GitHub secret

**Fix:**
1. Go to GitHub → Settings → Secrets → Actions
2. Add `NEXTAUTH_SECRET` with value from `openssl rand -base64 32`
3. Re-run deployment

### Issue: Google OAuth redirect_uri_mismatch

**Cause:** Redirect URI doesn't match Google Cloud Console

**Fix:**
1. Check redirect URI in Google Cloud Console
2. Must exactly match: `https://kehitys.savonlinnanlentokerho.fi/api/auth/callback/google`
3. No trailing slash
4. Must use `https://`

### Issue: "Invalid client" during Google login

**Cause:** Wrong Client ID/Secret

**Fix:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in GitHub Secrets
2. Must match values from Google Cloud Console
3. Check for extra spaces or characters

### Issue: Database initialization fails

**Cause:** SQL syntax error or missing files

**Fix:**
1. Check workflow logs for specific error
2. Verify all files in `postgres/init/` were transferred
3. Check file permissions (should be 777 per workflow)

### Issue: Admin login fails

**Cause:** Password not hashed correctly

**Fix:**
1. Check `02-seed-users.sql` contains bcrypt hash
2. Hash should start with `$2b$10$`
3. Re-generate hash if needed:
   ```bash
   cd nextjs
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin123!', 10).then(console.log)"
   ```

---

## 📝 Important Notes

### Development Environment

- Database is **destroyed and recreated** on every deployment
- All data is lost (including users, bookings)
- Fresh seed data is loaded each time
- Use for testing only

### Production Environment

- Database is **persistent**
- Data is preserved across deployments
- Be careful with schema changes
- Consider migrations for production

### Default Passwords

⚠️ **Change in production!**

- Admin: `admin@savonlinnanlentokerho.fi` / `Admin123!`
- User: `kayttaja@savonlinnanlentokerho.fi` / `Kayttaja123!`

### Google Workspace Restriction

- Only `@savonlinnanlentokerho.fi` emails can use Google OAuth
- Configured via `hd` parameter in `auth.ts`
- Other emails will be rejected

---

## 📚 Related Documentation

- [AUTH_SETUP.md](AUTH_SETUP.md) - Complete authentication setup guide
- [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) - GitHub secrets configuration
- [README.md](README.md) - General project documentation

---

## 🎯 Quick Commands

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate bcrypt password hash
cd nextjs && node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword', 10).then(console.log)"

# Check if container is running
docker ps | grep salko

# View container logs
docker logs salko-nextjs-dev

# Check database connection
docker exec -it salko-postgres-dev psql -U salko_admin -d salko

# View users table
docker exec -it salko-postgres-dev psql -U salko_admin -d salko -c "SELECT email, role, auth_provider FROM users;"
```

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Version:** _________________

**Status:** ⬜ Dev ⬜ Prod ⬜ Both

**Issues Encountered:** _________________

---

**Last Updated:** 2025-10-30

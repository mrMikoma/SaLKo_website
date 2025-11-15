# Authentication System Setup Guide

This document explains how to set up and use the authentication system for the SaLKo website.

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [User Roles](#user-roles)
4. [Google Workspace OAuth Setup](#google-workspace-oauth-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Testing Authentication](#testing-authentication)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The SaLKo website uses **NextAuth v5** with dual authentication:
- **Credentials** (email/password) for traditional login
- **Google Workspace OAuth** for workspace members (@savonlinnanlentokerho.fi emails only)

### Key Features
- ✅ Dual authentication (credentials + Google OAuth)
- ✅ Role-based access control (admin, user, guest)
- ✅ Public booking calendar with guest bookings
- ✅ Secure password hashing with bcrypt
- ✅ HTTP-only cookies for session management
- ✅ Works behind Traefik reverse proxy

---

## Authentication Methods

### 1. Credentials Login
- Users with `@savonlinnanlentokerho.fi` or other email addresses
- Requires manual account creation by admin
- Password requirements:
  - 8-32 characters
  - At least 1 letter
  - At least 1 number
  - At least 1 special character

### 2. Google Workspace Login
- Automatic for `@savonlinnanlentokerho.fi` email addresses
- First-time login creates user account automatically
- Uses existing Google account authentication
- No password needed

---

## User Roles

### Admin (`admin`)
- Full access to all features
- Can manage all bookings (view, edit, delete)
- Access to admin site (`/admin`)
- Can create/invite users
- Can view guest booking contact information

**Default Admin Account:**
- Email: `admin@savonlinnanlentokerho.fi`
- Password: `Admin123!` (⚠️ **Change in production!**)

### User (`user`)
- Regular club members
- Can create and manage own bookings
- Can view profile page
- Cannot access admin features

**Development Test User:**
- Email: `kayttaja@savonlinnanlentokerho.fi`
- Password: `Kayttaja123!`

### Guest (`guest`)
- Unauthenticated users
- Can view booking calendar
- Can create bookings (requires contact info)
- Cannot edit or delete bookings
- Bookings linked to system user: `vieras@savonlinnanlentokerho.fi`

---

## Google Workspace OAuth Setup

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing: **"SaLKo Website Auth"**

### Step 2: Enable Google+ API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **Internal** (for Workspace only)
3. Fill in details:
   - App name: `SaLKo Jäsenalue`
   - User support email: `admin@savonlinnanlentokerho.fi`
   - Developer contact: `admin@savonlinnanlentokerho.fi`
4. Scopes: Add these scopes
   - `email`
   - `profile`
   - `openid`
5. Save and continue

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `SaLKo Website`
5. **Authorized redirect URIs** (add both):
   ```
   https://kehitys.savonlinnanlentokerho.fi/api/auth/callback/google
   https://savonlinnanlentokerho.fi/api/auth/callback/google
   ```
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

### Step 5: Update Environment Variables

Add to `.env`:
```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

---

## Environment Configuration

### Development Environment

File: `nextjs/.env`

```bash
# Database
DATABASE_CONNECTION_STRING="postgresql://salko_app:app_password@postgres:5432/salko"

# NextAuth
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
NEXTAUTH_URL="https://kehitys.savonlinnanlentokerho.fi"

# Google OAuth
GOOGLE_CLIENT_ID="<from-google-cloud-console>"
GOOGLE_CLIENT_SECRET="<from-google-cloud-console>"

# Environment
NODE_ENV="development"
```

### Production Environment

Same as development, but update:
```bash
NEXTAUTH_URL="https://savonlinnanlentokerho.fi"
NODE_ENV="production"
```

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## Database Setup

The database is automatically initialized with the required schema and seed data when containers are rebuilt.

### Schema Changes

New tables:
- `guest_bookings` - Contact info for guest bookings
- `accounts` - NextAuth OAuth accounts
- `sessions` - NextAuth sessions
- `verification_tokens` - Email verification

New columns in `users`:
- `auth_provider` - 'credentials', 'google', or 'system'
- `google_id` - Google user ID
- `avatar_url` - Profile picture URL
- `email_verified` - Email verification status
- `last_login` - Last login timestamp

### Seed Data

Three users are created on initialization:

1. **System Admin** (always created)
   - `admin@savonlinnanlentokerho.fi`

2. **Test User** (development only)
   - `kayttaja@savonlinnanlentokerho.fi`

3. **System Guest** (always created)
   - `vieras@savonlinnanlentokerho.fi` (for unauthenticated bookings)

---

## Testing Authentication

### Test Credentials Login

1. Navigate to the site
2. Click "Jäsenalue" in navbar
3. Click "Kirjaudu sisään"
4. Enter credentials:
   - Email: `admin@savonlinnanlentokerho.fi`
   - Password: `Admin123!`
5. Click "Kirjaudu sisään"
6. Should redirect to homepage with user name displayed

### Test Google Login

1. Navigate to login page
2. Click "Kirjaudu Google Workspacella"
3. Select your `@savonlinnanlentokerho.fi` account
4. Grant permissions if asked
5. Should redirect to homepage
6. First-time login creates user account automatically

### Test Guest Booking

1. Navigate to `/kalusto/varauskalenteri` without logging in
2. Calendar should be visible
3. Try to create a booking
4. Should require contact information (name, email, phone)
5. After submission, booking appears on calendar
6. Guest cannot edit or delete the booking

### Test Role-Based Access

1. Login as admin
2. Navigate to `/admin` - should have access
3. Logout and login as regular user
4. Navigate to `/admin` - should be redirected with error

---

## Troubleshooting

### Google OAuth Not Working

**Error: "Redirect URI mismatch"**
- Check redirect URIs in Google Cloud Console
- Must exactly match: `https://kehitys.savonlinnanlentokerho.fi/api/auth/callback/google`
- Don't forget the protocol (`https://`)

**Error: "Access blocked: This app's request is invalid"**
- OAuth consent screen must be set to "Internal"
- User must have `@savonlinnanlentokerho.fi` email

**Error: "Non-workspace email rejected"**
- The code restricts to workspace domain
- Check `hd` parameter in `auth.ts`

### Credentials Login Not Working

**Error: "Invalid email or password"**
- Check password is hashed in database
- Verify bcrypt comparison is working
- Check user has `auth_provider = 'credentials'`

**Passwords not hashed:**
- Run seed script to generate bcrypt hashes
- Or manually hash with:
  ```bash
  cd nextjs
  node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword', 10).then(console.log)"
  ```

### Session Issues

**Session not persisting:**
- Check `NEXTAUTH_SECRET` is set
- Verify cookies are being set (check browser DevTools)
- Ensure `trustHost: true` in auth config (for Traefik)

**"Session token not found"**
- Clear cookies and try again
- Check database `sessions` table
- Verify `DATABASE_CONNECTION_STRING` is correct

### Database Errors

**"System guest user not found"**
- Check seed file was executed
- Verify `vieras@savonlinnanlentokerho.fi` exists in users table
- Re-run initialization if needed

**Foreign key constraint errors:**
- Ensure all tables are created in correct order
- Check `01-schema.sql` was executed before `02-seed-users.sql`

### Traefik/Reverse Proxy Issues

**"CSRF token mismatch"**
- Verify `trustHost: true` in `auth.ts`
- Check Traefik forwards correct headers
- Ensure `NEXTAUTH_URL` matches actual domain

**Redirects not working:**
- Check Traefik labels in docker-compose.yml
- Verify SSL/TLS certificates are valid
- Test with `curl -I https://kehitys.savonlinnanlentokerho.fi`

---

## API Routes

NextAuth provides these routes automatically:

- `GET /api/auth/signin` - Sign in page
- `POST /api/auth/signin/:provider` - Sign in with provider
- `GET /api/auth/signout` - Sign out page
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/callback/:provider` - OAuth callback
- `GET /api/auth/session` - Get session
- `GET /api/auth/csrf` - Get CSRF token
- `GET /api/auth/providers` - List providers

---

## Security Notes

### Production Checklist

- [ ] Change default admin password
- [ ] Use strong `NEXTAUTH_SECRET`
- [ ] Enable HTTPS only (via Traefik)
- [ ] Set `NODE_ENV=production`
- [ ] Restrict Google OAuth to workspace domain
- [ ] Regular security updates for dependencies
- [ ] Monitor authentication logs
- [ ] Implement rate limiting (via Traefik)

### Password Security

- All passwords hashed with bcrypt (salt rounds: 10)
- Plain text passwords never stored
- Session tokens in HTTP-only cookies
- CSRF protection enabled by NextAuth

### OAuth Security

- Google Workspace domain restriction (`hd` parameter)
- Only `@savonlinnanlentokerho.fi` emails allowed
- OAuth tokens stored securely in database
- Automatic session refresh

---

## File Structure

```
nextjs/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # NextAuth API handler
│   └── auth/
│       └── actions.ts                # Auth server actions
├── components/
│   └── auth/
│       ├── login.tsx                 # Login component
│       └── logout.tsx                # Logout component
├── utilities/
│   ├── roles.ts                      # RBAC utilities
│   ├── user.ts                       # User data utilities
│   └── guest.ts                      # Guest booking utilities
├── types/
│   └── next-auth.d.ts                # NextAuth type extensions
├── auth.ts                           # NextAuth configuration
├── proxy.ts                          # Auth middleware
└── .env                              # Environment variables

postgres/
└── init/
    ├── 01-schema.sql                 # Database schema
    └── 02-seed-users.sql             # Seed data
```

---

## Next Steps

After setting up authentication:

1. **Test all authentication flows**
2. **Set up Google Workspace OAuth credentials**
3. **Change default admin password**
4. **Create admin site** for user management
5. **Implement guest booking form** in BookingSection component
6. **Add email verification** (optional)
7. **Set up monitoring and logging**

---

## Support

For issues or questions:
- Check this documentation first
- Review NextAuth v5 docs: https://authjs.dev/
- Contact system administrator

---

**Last Updated:** 2025-10-30
**Authentication Version:** NextAuth 5.0.0-beta.29

# GitHub Secrets Setup Guide

This document lists all the GitHub secrets and variables required for the CI/CD workflows to deploy the SaLKo website with authentication enabled.

## Table of Contents

1. [Required Secrets](#required-secrets)
2. [Required Variables](#required-variables)
3. [How to Add Secrets](#how-to-add-secrets)
4. [Environment-Specific Secrets](#environment-specific-secrets)
5. [Generating Secret Values](#generating-secret-values)

---

## Required Secrets

All secrets should be added to your GitHub repository at:
**Settings → Secrets and variables → Actions → Repository secrets**

### Existing Secrets (Already Required)

| Secret Name | Description | Example/Notes |
|------------|-------------|---------------|
| `VPS_PRIVATE_KEY` | SSH private key for server access | ED25519 private key |
| `POSTGRES_PASSWORD` | PostgreSQL admin password | Strong random password |
| `APP_DB_PASSWORD` | Application database user password | Strong random password |

### New Secrets for Authentication

#### Development Environment

| Secret Name | Description | How to Generate | Required |
|------------|-------------|-----------------|----------|
| `NEXTAUTH_SECRET` | NextAuth encryption secret for dev | `openssl rand -base64 32` | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for dev | From Google Cloud Console | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for dev | From Google Cloud Console | ✅ Yes |

#### Production Environment

| Secret Name | Description | How to Generate | Required |
|------------|-------------|-----------------|----------|
| `NEXTAUTH_SECRET_PROD` | NextAuth encryption secret for prod | `openssl rand -base64 32` (different from dev) | ✅ Yes |
| `GOOGLE_CLIENT_ID_PROD` | Google OAuth Client ID for prod | From Google Cloud Console | ✅ Yes |
| `GOOGLE_CLIENT_SECRET_PROD` | Google OAuth Client Secret for prod | From Google Cloud Console | ✅ Yes |

---

## Required Variables

Variables should be added to your GitHub repository at:
**Settings → Secrets and variables → Actions → Variables**

### Existing Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `SERVER_IP_SALKO0` | Your VPS IP address | Server IP for deployment |

---

## How to Add Secrets

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add New Secret

1. Click **New repository secret**
2. Enter the **Name** (exactly as shown in tables above)
3. Enter the **Secret** value
4. Click **Add secret**

### Step 3: Verify Secrets

After adding all secrets, you should see them listed (values are hidden):
- `VPS_PRIVATE_KEY`
- `POSTGRES_PASSWORD`
- `APP_DB_PASSWORD`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET_PROD`
- `GOOGLE_CLIENT_ID_PROD`
- `GOOGLE_CLIENT_SECRET_PROD`

---

## Environment-Specific Secrets

### Development Environment (`deploy-app-dev.yaml`)

The development workflow uses these secrets:

```yaml
# Database
POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
APP_DB_PASSWORD: ${{ secrets.APP_DB_PASSWORD }}

# Authentication
NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
```

**Deployment URL:** `https://kehitys.savonlinnanlentokerho.fi`

### Production Environment (`deploy-app-prod.yaml`)

The production workflow uses these secrets:

```yaml
# Database
POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}

# Authentication
NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET_PROD }}
GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID_PROD }}
GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET_PROD }}
```

**Deployment URL:** `https://savonlinnanlentokerho.fi`

---

## Generating Secret Values

### 1. Generate NEXTAUTH_SECRET

Run this command **twice** (once for dev, once for prod):

```bash
openssl rand -base64 32
```

Example output:
```
RTvS/guMbE67ROxH6gbZHZ2RFk3xP4cSkLDec3+wOq8=
```

**Important:** Use **different** values for dev and prod!

- Copy first output → Add as `NEXTAUTH_SECRET`
- Run again, copy second output → Add as `NEXTAUTH_SECRET_PROD`

### 2. Get Google OAuth Credentials (Development)

Follow the complete guide in [AUTH_SETUP.md](AUTH_SETUP.md#google-workspace-oauth-setup), or quick steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project: "SaLKo Website Auth"
3. Enable Google+ API
4. Configure OAuth consent screen:
   - **Type:** Internal
   - **App name:** SaLKo Jäsenalue
   - **Scopes:** email, profile, openid
5. Create OAuth Client ID:
   - **Type:** Web application
   - **Name:** SaLKo Website Development
   - **Authorized redirect URI:**
     ```
     https://kehitys.savonlinnanlentokerho.fi/api/auth/callback/google
     ```
6. Copy **Client ID** → Add as `GOOGLE_CLIENT_ID`
7. Copy **Client Secret** → Add as `GOOGLE_CLIENT_SECRET`

### 3. Get Google OAuth Credentials (Production)

You can either:

**Option A: Use Same Credentials** (Simpler)
- Add the production redirect URI to the same OAuth client
- Use the same Client ID and Secret for both environments

**Option B: Create Separate Credentials** (Recommended)
1. Create a new OAuth Client ID in Google Cloud Console
2. **Name:** SaLKo Website Production
3. **Authorized redirect URI:**
   ```
   https://savonlinnanlentokerho.fi/api/auth/callback/google
   ```
4. Copy **Client ID** → Add as `GOOGLE_CLIENT_ID_PROD`
5. Copy **Client Secret** → Add as `GOOGLE_CLIENT_SECRET_PROD`

---

## Workflow Environment Variables

The workflows automatically set these environment variables:

### Development Workflow

```bash
NEXTAUTH_URL=https://kehitys.savonlinnanlentokerho.fi
NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET }}
GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}
GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}
```

### Production Workflow

```bash
NEXTAUTH_URL=https://savonlinnanlentokerho.fi
NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET_PROD }}
GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID_PROD }}
GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET_PROD }}
```

---

## Validation Checklist

Before deploying, verify:

### GitHub Secrets
- [ ] `NEXTAUTH_SECRET` is added (32+ character random string)
- [ ] `NEXTAUTH_SECRET_PROD` is added (different from dev)
- [ ] `GOOGLE_CLIENT_ID` is added (from Google Cloud Console)
- [ ] `GOOGLE_CLIENT_SECRET` is added (from Google Cloud Console)
- [ ] `GOOGLE_CLIENT_ID_PROD` is added (or use same as dev)
- [ ] `GOOGLE_CLIENT_SECRET_PROD` is added (or use same as dev)

### Google Cloud Console
- [ ] OAuth consent screen configured (Internal)
- [ ] OAuth Client created for development
- [ ] Redirect URI added: `https://kehitys.savonlinnanlentokerho.fi/api/auth/callback/google`
- [ ] OAuth Client created for production (or added redirect to existing)
- [ ] Redirect URI added: `https://savonlinnanlentokerho.fi/api/auth/callback/google`

### Workflow Files
- [ ] `deploy-app-dev.yaml` includes NextAuth environment variables
- [ ] `deploy-app-prod.yaml` includes NextAuth environment variables

---

## Testing After Setup

### Test Development Deployment

1. Trigger the development deployment workflow
2. Wait for deployment to complete
3. Visit `https://kehitys.savonlinnanlentokerho.fi`
4. Try logging in with credentials:
   - Email: `admin@savonlinnanlentokerho.fi`
   - Password: `Admin123!`
5. Try Google OAuth login with workspace email

### Test Production Deployment

1. Trigger the production deployment workflow
2. Wait for deployment to complete
3. Visit `https://savonlinnanlentokerho.fi`
4. Test both login methods

---

## Security Notes

### Best Practices

1. **Never commit secrets to Git**
   - All secrets are in GitHub Secrets (encrypted at rest)
   - Never add secrets to `.env` files in the repository

2. **Use different secrets for dev and prod**
   - `NEXTAUTH_SECRET` should be different
   - Optionally use different Google OAuth clients

3. **Rotate secrets regularly**
   - Generate new `NEXTAUTH_SECRET` periodically
   - Update in GitHub Secrets

4. **Restrict Google OAuth**
   - Only `@savonlinnanlentokerho.fi` emails allowed
   - OAuth consent screen set to "Internal"

### Secret Rotation

To rotate a secret:

1. Generate new value (e.g., `openssl rand -base64 32`)
2. Update in GitHub Secrets
3. Re-deploy application
4. Old secret is immediately replaced

---

## Troubleshooting

### Workflow fails with "NEXTAUTH_SECRET not set"

**Solution:** Add `NEXTAUTH_SECRET` to GitHub Secrets

### Google OAuth fails with "redirect_uri_mismatch"

**Solution:** Verify redirect URIs in Google Cloud Console exactly match:
- Dev: `https://kehitys.savonlinnanlentokerho.fi/api/auth/callback/google`
- Prod: `https://savonlinnanlentokerho.fi/api/auth/callback/google`

### "Invalid client" error during Google login

**Solution:**
1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
2. Verify OAuth client is enabled in Google Cloud Console
3. Ensure OAuth consent screen is published

### Secrets not updating in deployment

**Solution:**
1. Verify secret names match exactly (case-sensitive)
2. Re-run the workflow after adding secrets
3. Check workflow logs for environment variable values (secrets are masked)

---

## Summary of Required Actions

1. **Generate secrets:**
   ```bash
   # Generate NEXTAUTH_SECRET for dev
   openssl rand -base64 32

   # Generate NEXTAUTH_SECRET for prod
   openssl rand -base64 32
   ```

2. **Set up Google OAuth** (follow [AUTH_SETUP.md](AUTH_SETUP.md))

3. **Add all secrets to GitHub:**
   - Settings → Secrets and variables → Actions → New repository secret

4. **Deploy and test:**
   - Run development deployment workflow
   - Run production deployment workflow
   - Test all authentication methods

---

**Last Updated:** 2025-10-30
**Related Documentation:** [AUTH_SETUP.md](AUTH_SETUP.md)

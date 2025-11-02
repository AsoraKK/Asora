# Azure AD B2C Setup - Manual Steps Required

## Current Status
✅ CIAM Tenant created: `asoraauthlife.onmicrosoft.com` (ID: `387719ab-0415-46be-9e8f-b2d988cef70a`)  
✅ Mobile app registered: `c07bb257-aaf0-4179-be95-fce516f92e8c`  
✅ `/api/auth/b2c-config` endpoint working  
⚠️ **User flow and Google IdP need manual portal configuration**

---

## Step 1: Configure Google Identity Provider

### 1.1 Access B2C Tenant
1. Azure Portal → Search "Azure AD B2C" or "Entra External ID"
2. **Switch directory** to `Asora-Life` (asoraauthlife.onmicrosoft.com)
3. Confirm you see "Azure AD B2C" in the left nav

### 1.2 Add Google as Identity Provider
1. Left nav → **Identity providers**
2. Click **+ Google**
3. Fill in:
   - **Name**: `Google`
   - **Client ID**: Retrieve from Key Vault: `az keyvault secret show --vault-name kv-asora-dev --name b2c-google-web-client-id --query value -o tsv`
   - **Client secret**: Retrieve from Key Vault: `az keyvault secret show --vault-name kv-asora-dev --name b2c-google-web-client-secret --query value -o tsv`
4. Click **Save**

---

## Step 2: Create Sign-up/Sign-in User Flow

### 2.1 Create the User Flow
1. Azure AD B2C → **User flows**
2. Click **+ New user flow**
3. Select **Sign up and sign in** → **Recommended** → **Create**
4. Fill in:
   - **Name**: `signupsignin` (will become `B2C_1_signupsignin`)
   - **Identity providers**:
     - ✅ **Email signup** (Local Account)
     - ✅ **Google** (if you completed Step 1.2)
   - **Multifactor authentication**: Optional (can enable later)
   - **User attributes and claims**:
     - Collect during sign-up:
       - ✅ **Email Address**
       - ✅ **Display Name** (optional)
     - Return in token:
       - ✅ **Email Addresses**
       - ✅ **Display Name**
       - ✅ **User's Object ID** (maps to `sub`)
5. Click **Create**

### 2.2 Verify User Flow
1. User flows → **B2C_1_signupsignin** → **Run user flow**
2. Should see test page with:
   - Application: Select your mobile app
   - Reply URL: Select one of the registered redirects
3. Click **Run user flow**
4. **Expected result**: Login page with:
   - Email/password fields
   - **"Sign in with Google"** button

---

## Step 3: Verify Redirect URIs are Registered

### 3.1 Check Mobile App Redirect URIs
1. Azure AD B2C → **App registrations** → **Asora**
2. Left nav → **Authentication**
3. **Verify** these redirect URIs are present:
   - ✅ `msalc07bb257-aaf0-4179-be95-fce516f92e8c://auth` (iOS MSAL)
   - ✅ `https://asoraauthlife.ciamlogin.com/oauth2/nativeclient` (MSAL fallback)
   - ✅ `com.asora.app://oauth/callback` (Android custom scheme)

### 3.2 Add Missing Redirects (if any)
If any are missing:
1. Click **+ Add a platform**
2. Select **Mobile and desktop applications**
3. Add custom redirect URIs
4. Check **Public client flows** → Enable
5. **Save**

---

## Step 4: Test Configuration

### 4.1 Test Discovery Endpoint
**CIAM URL format**: Use tenant ID in path + policy as query parameter.

```bash
TENANT_ID=387719ab-0415-46be-9e8f-b2d988cef70a
HOST=asoraauthlife.ciamlogin.com
curl -s "https://$HOST/$TENANT_ID/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin" | jq
```

**Expected**: JSON with `issuer`, `authorization_endpoint`, `token_endpoint`

### 4.2 Test Authorization Flow (Manual Browser Test)
```
https://asoraauthlife.ciamlogin.com/387719ab-0415-46be-9e8f-b2d988cef70a/oauth2/v2.0/authorize?p=B2C_1_signupsignin&client_id=c07bb257-aaf0-4179-be95-fce516f92e8c&redirect_uri=https%3A%2F%2Fjwt.ms&response_type=id_token&response_mode=fragment&scope=openid&nonce=12345&prompt=select_account
```

**Expected**: Login page (email/password or Google button)

### 4.3 Test Google Sign-in
1. On the login page, click **"Sign in with Google"**
2. **Expected**: Redirect to Google OAuth consent screen
3. Sign in with a Google account
4. **Expected**: Redirected back with authorization code

---

## Step 5: Update Function App CORS (If Needed)

If the Flutter app will call `/api/config/auth` from a browser/emulator:

```bash
az functionapp cors add \
  --name asora-function-dev \
  --resource-group asora-psql-flex \
  --allowed-origins "http://localhost:*" "https://localhost:*"
```

---

## Validation Checklist

Before proceeding to Flutter implementation:

- [ ] Google identity provider configured with client ID + secret
- [ ] User flow `B2C_1_signupsignin` created
- [ ] User flow has both Email and Google enabled
- [ ] Mobile app has all redirect URIs registered
- [ ] Discovery endpoint returns valid JSON
- [ ] Authorization URL shows Google button
- [ ] Test Google sign-in completes successfully
- [ ] `/api/config/auth` endpoint returns configuration (test after deployment completes)

---

## Next Steps (After Validation)

Once all checkboxes above are ✅:
1. Create Flutter feature branch: `git checkout -b feature/b2c-msal-auth`
2. Proceed with Flutter MSAL implementation (guided by IDE agent)

---

## Troubleshooting

### "Resource has been removed" error
- **Cause**: User flow doesn't exist or name is wrong
- **Fix**: Create the user flow (Step 2) or check the exact name in portal

### Google button not showing
- **Cause**: Google IdP not enabled in user flow
- **Fix**: User flows → B2C_1_signupsignin → Identity providers → Enable Google

### Redirect URI mismatch
- **Cause**: MSAL redirect not registered in app
- **Fix**: App registrations → Authentication → Add the exact redirect URI

### CORS errors in Flutter web
- **Cause**: Function App blocking browser requests
- **Fix**: Add CORS origins (Step 5)

---

**Current deployment status**: Functions deployment in progress (contains /api/config/auth endpoint).  
Check deployment: `gh run list --workflow=deploy-asora-function-dev.yml --limit 1`

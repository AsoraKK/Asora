# Azure AD B2C Configuration (Asora-Life)

## Overview
Asora uses **Microsoft Entra External ID** (formerly Azure AD B2C) for customer authentication with Email and Google sign-in options.

## B2C Tenant Details
- **Tenant Name**: Asora-Life
- **Tenant ID**: `ac06df30-fd50-4195-96fc-4c1fd1de6c43`
- **Primary Domain**: `asoraauth.onmicrosoft.com`
- **B2C Login Domain**: `asoraauth.b2clogin.com`

## User Flows / Policies
- **Sign-up/Sign-in Policy**: `B2C_1_signupsignin`
  - Identity Providers:
    - ✅ Email (local accounts)
    - ✅ Google (federated)

## App Registrations

### Mobile App (Flutter)
- **Display Name**: Asora
- **Application (client) ID**: `d993e983-9f6e-44b4-b098-607af033832f`
- **Object ID**: `9f75895f-0003-464a-a728-5fc061e5c688`
- **Supported Account Types**: My organization only
- **Redirect URIs**:
  - `msald993e983-9f6e-44b4-b098-607af033832f://auth` (MSAL iOS)
  - `https://asoraauth.b2clogin.com/oauth2/nativeclient` (MSAL fallback)
  - `com.asora.app://oauth/callback` (Android custom scheme)
- **Scopes**: `openid`, `offline_access`, `email`, `profile`

### API App (Azure Functions)
- **Note**: Using B2C-issued tokens validated directly by Functions
- No separate API app registration required for current flow

## Google OAuth Credentials

### Android
- **Client ID**: `387920894359-od1qh8iv588ofv1t572v6spkl264srci.apps.googleusercontent.com`
- **SHA-1 Fingerprint**: `2B:95:04:AF:77:F7:05:FD:6D:84:B0:49:48:5F:EC:A2:3B:FA:A8:FF`

### Web
- **Client ID**: `387920894359-p21kvg1j19veq1q83qbsg345bll3vn1u.apps.googleusercontent.com`
- **Client Secret**: Stored in Key Vault

### Desktop
- **Client ID**: `387920894359-qq7muh3k1q8lq7h8pfvgtu8icu5h6ebs.apps.googleusercontent.com`
- **Client Secret**: Stored in Key Vault

## Discovery Endpoints

### OpenID Configuration
```
https://asoraauth.b2clogin.com/asoraauth.onmicrosoft.com/B2C_1_signupsignin/v2.0/.well-known/openid-configuration
```

### Authorization Endpoint
```
https://asoraauth.b2clogin.com/asoraauth.onmicrosoft.com/B2C_1_signupsignin/oauth2/v2.0/authorize
```

### Token Endpoint
```
https://asoraauth.b2clogin.com/asoraauth.onmicrosoft.com/B2C_1_signupsignin/oauth2/v2.0/token
```

## Key Vault Secrets (Functions Backend)

Stored in `kv-asora-dev`:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `b2c-tenant` | `asoraauth.onmicrosoft.com` | B2C tenant domain |
| `b2c-mobile-client-id` | `d993e983-9f6e-44b4-b098-607af033832f` | Mobile app client ID |
| `b2c-signin-policy` | `B2C_1_signupsignin` | User flow name |
| `b2c-authority-host` | `asoraauth.b2clogin.com` | B2C authority |
| `b2c-scopes` | `openid offline_access email profile` | OAuth scopes |
| `b2c-redirect-uri-android` | `com.asora.app://oauth/callback` | Android redirect |
| `b2c-redirect-uri-ios` | `msald993e983-9f6e-44b4-b098-607af033832f://auth` | iOS redirect |
| `b2c-google-idp-hint` | `Google` | IdP selector hint |

## Flutter Build Configuration

### Required `--dart-define` Flags

```bash
flutter run \
  --dart-define=GOOGLE_WEB_CLIENT_ID=387920894359-p21kvg1j19veq1q83qbsg345bll3vn1u.apps.googleusercontent.com \
  --dart-define=GOOGLE_ANDROID_CLIENT_ID=387920894359-od1qh8iv588ofv1t572v6spkl264srci.apps.googleusercontent.com \
  --dart-define=GOOGLE_DESKTOP_CLIENT_ID=387920894359-qq7muh3k1q8lq7h8pfvgtu8icu5h6ebs.apps.googleusercontent.com \
  --dart-define=AZURE_FUNCTION_URL=https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api
```

**Note**: B2C tenant/policy/clientId are fetched dynamically from `/api/config/auth` endpoint.

## Validation

### Test Discovery Document
```bash
curl https://asoraauth.b2clogin.com/asoraauth.onmicrosoft.com/B2C_1_signupsignin/v2.0/.well-known/openid-configuration
```

### Test Authorization Flow (Manual)
```
https://asoraauth.b2clogin.com/asoraauth.onmicrosoft.com/B2C_1_signupsignin/oauth2/v2.0/authorize
  ?client_id=d993e983-9f6e-44b4-b098-607af033832f
  &redirect_uri=com.asora.app://oauth/callback
  &response_type=code
  &scope=openid%20offline_access
  &p=B2C_1_signupsignin
  &prompt=select_account
  &idp=Google
```

### Test Config Endpoint
```bash
curl https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api/config/auth
```

## Reference
- **Azure Subscription Tenant**: `275643fa-37e0-4f67-b616-85a7da674bea` (kylekernasoraco.onmicrosoft.com)
- **B2C Tenant**: `ac06df30-fd50-4195-96fc-4c1fd1de6c43` (asoraauth.onmicrosoft.com)

**Important**: B2C tenant ID is different from the Azure subscription tenant ID.

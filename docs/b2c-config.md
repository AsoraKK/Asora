# Azure AD B2C Configuration (Asora-Life)

## Overview
Asora uses **Microsoft Entra External ID (CIAM)** for authentication with Email + Google sign-in.

## CIAM Tenant Details
- **Tenant Name**: Asora-Life
- **Tenant ID**: `387719ab-0415-46be-9e8f-b2d988cef70a`
- **Primary Domain**: `asoraauthlife.onmicrosoft.com`
- **CIAM Login Domain**: `asoraauthlife.ciamlogin.com` (**not** b2clogin.com)

## User Flows / Policies
- **Sign-up/Sign-in Policy**: `B2C_1_signupsignin`
  - Identity Providers:
    - ✅ Email (local accounts)
    - ✅ Google (federated)

## App Registrations

### Mobile App (Flutter)
- **Display Name**: Asora
- **Application (client) ID**: `c07bb257-aaf0-4179-be95-fce516f92e8c`
- **Object ID**: `9f75895f-0003-464a-a728-5fc061e5c688`
- **Supported Account Types**: My organization only
- **Redirect URIs**:
  - `msalc07bb257-aaf0-4179-be95-fce516f92e8c://auth` (MSAL iOS)
  - `https://asoraauthlife.ciamlogin.com/oauth2/nativeclient` (MSAL fallback)
  - `com.asora.app://oauth/callback` (Android custom scheme)
- **Scopes**: `openid`, `offline_access`, `email`, `profile`

### API App (Azure Functions)
- **Note**: Using B2C-issued tokens validated directly by Functions
- No separate API app registration required for current flow

## Google OAuth Credentials

**Stored in Azure Key Vault** (`kv-asora-dev`):
- `b2c-google-web-client-id` - Web client ID for B2C Google IdP
- `b2c-google-web-client-secret` - Web client secret

**To retrieve for portal configuration:**
```bash
az keyvault secret show --vault-name kv-asora-dev --name b2c-google-web-client-id --query value -o tsv
az keyvault secret show --vault-name kv-asora-dev --name b2c-google-web-client-secret --query value -o tsv
```

## Discovery Endpoints

**CIAM format**: Tenant ID in path + policy as query parameter `?p=`

### OpenID Configuration
```
https://asoraauthlife.ciamlogin.com/387719ab-0415-46be-9e8f-b2d988cef70a/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin
```

### Authorization Endpoint
```
https://asoraauthlife.ciamlogin.com/387719ab-0415-46be-9e8f-b2d988cef70a/oauth2/v2.0/authorize?p=B2C_1_signupsignin
```

### Token Endpoint
```
https://asoraauthlife.ciamlogin.com/387719ab-0415-46be-9e8f-b2d988cef70a/oauth2/v2.0/token
```

## Key Vault Secrets (Functions Backend)

Stored in `kv-asora-dev`:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `b2c-tenant` | `asoraauthlife.onmicrosoft.com` | B2C tenant domain |
| `b2c-mobile-client-id` | `c07bb257-aaf0-4179-be95-fce516f92e8c` | Mobile app client ID |
| `b2c-signin-policy` | `B2C_1_signupsignin` | User flow name |
| `b2c-authority-host` | `asoraauthlife.ciamlogin.com` | B2C authority |
| `b2c-scopes` | `openid offline_access email profile` | OAuth scopes |
| `b2c-redirect-uri-android` | `com.asora.app://oauth/callback` | Android redirect |
| `b2c-redirect-uri-ios` | `msalc07bb257-aaf0-4179-be95-fce516f92e8c://auth` | iOS redirect |
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

### Test Discovery (CIAM format)
```bash
TENANT_ID=387719ab-0415-46be-9e8f-b2d988cef70a
HOST=asoraauthlife.ciamlogin.com
curl -s "https://$HOST/$TENANT_ID/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin" | jq '{issuer,authorization_endpoint,token_endpoint}'
```

### Test Authorization Flow (jwt.ms)
```
https://asoraauthlife.ciamlogin.com/387719ab-0415-46be-9e8f-b2d988cef70a/oauth2/v2.0/authorize?p=B2C_1_signupsignin&client_id=c07bb257-aaf0-4179-be95-fce516f92e8c&redirect_uri=https%3A%2F%2Fjwt.ms&response_type=id_token&response_mode=fragment&scope=openid&nonce=12345&prompt=select_account
```

Add `&idp=Google` to test Google sign-in.

### Test Config Endpoint
```bash
curl https://asora-function-dev.azurewebsites.net/api/auth/b2c-config | jq
```

## Reference
- **Azure Subscription Tenant**: `275643fa-37e0-4f67-b616-85a7da674bea`
- **CIAM Tenant ID**: `387719ab-0415-46be-9e8f-b2d988cef70a`

### CIAM vs Classic B2C URL Patterns

**CIAM (Entra External ID) - CORRECT:**
```
https://{host}/{tenantId}/v2.0/.well-known/openid-configuration?p={policy}
https://asoraauthlife.ciamlogin.com/387719ab-0415-46be-9e8f-b2d988cef70a/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin
```

**Classic B2C - WRONG (404):**
```
https://{host}/{tenantName}/{policy}/v2.0/.well-known/openid-configuration
https://asoraauthlife.ciamlogin.com/asoraauthlife.onmicrosoft.com/B2C_1_signupsignin/v2.0/.well-known/openid-configuration ❌
```

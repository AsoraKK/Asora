# CORS Proxy & Cloudflare Access Setup

## What Changed

The control-panel now uses a **same-origin proxy** to eliminate CORS issues when calling Hive AI test endpoints:

- **Before**: Browser calls `https://admin-api.asora.co.za/moderation/test/upload` directly → CORS blocked
- **After**: Browser calls `https://control.asora.co.za/api/admin/moderation/test/upload` (same origin) → proxy injects CF Access credentials → calls admin-api

## Architecture

```
Browser (control.asora.co.za)
  ↓ (same-origin, no CORS)
Azure Functions Proxy (/api/admin/moderation/test/*)
  ↓ (server-to-server with CF Access service token)
admin-api.asora.co.za
  ↓
Hive AI / Cloudflare Access
```

## Deployment Requirements

### 1. Environment Variables (Azure Function App Settings)

Add these to the control-panel Azure Function App:

| Variable | Value | Source | Notes |
|----------|-------|--------|-------|
| `CF_ACCESS_CLIENT_ID` | (from GitHub Actions secret) | GitHub Actions → Azure | Cloudflare Access service token ID |
| `CF_ACCESS_CLIENT_SECRET` | (from Azure Key Vault) | Key Vault reference | Cloudflare Access service token secret |
| `ADMIN_API_URL` | `https://admin-api.asora.co.za` | Default | Override if testing against different endpoint |

### 2. Azure Key Vault Setup

Store the secret in Azure Key Vault:

```bash
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name "cf-access-client-secret" \
  --value "your-secret-value-here"
```

Then reference it in Function App Settings using the Key Vault reference format:
```
@Microsoft.KeyVault(SecretUri=https://<vault-name>.vault.azure.net/secrets/cf-access-client-secret/)
```

### 3. GitHub Actions Secrets

Add these to the repository secrets (`Settings → Secrets → Actions`):

| Secret | Value | Used In |
|--------|-------|---------|
| `CF_ACCESS_CLIENT_ID` | (your Cloudflare service token ID) | Deploy workflow |
| `CF_ACCESS_CLIENT_SECRET` | (your Cloudflare service token secret) | Deploy workflow (passed to Azure Key Vault) |

### 4. Cloudflare Routing

Ensure Cloudflare/ingress routes `/api/*` to the Azure Functions App:

- Rule: `control.asora.co.za/api/*` → Functions App origin
- Does NOT need to route to admin-api.asora.co.za directly
- Browser traffic should never reach admin-api directly (that defeats the purpose)

## How to Get Cloudflare Access Credentials

1. Log into Cloudflare Zero Trust Dashboard
2. Navigate to **Settings → API Tokens** (or **Service Tokens** if using that method)
3. Generate a new service token for "admin-api.asora.co.za"
4. Copy:
   - **Client ID**: `CF_ACCESS_CLIENT_ID`
   - **Client Secret**: `CF_ACCESS_CLIENT_SECRET` (save this securely!)

## Testing Locally

To test the proxy locally, ensure you have:

1. Functions running locally: `npm start` in the `functions/` directory
2. Control-panel running locally: `npm run dev` in `apps/control-panel/`
3. Set env vars in your local Functions `.env`:
   ```
   CF_ACCESS_CLIENT_ID=your-id
   CF_ACCESS_CLIENT_SECRET=your-secret
   ```

Then the control-panel should call `http://localhost:7072/api/admin/moderation/test/upload` instead of direct admin-api.

## Security Notes

- **No exposed secrets in browser**: CF Access credentials stay on the server
- **Rate limiting**: Proxy enforces 60 requests per minute per IP
- **Admin JWT validation**: Proxy validates control-panel admin token before proxying
- **Audit trail**: All proxy requests logged with correlation IDs

## If the Proxy Fails to Authenticate

Check:
1. **CF Credentials valid**: Verify ID and secret in Key Vault
2. **CF Policy includes service token**: In Cloudflare Zero Trust, ensure the application policy allows service tokens
3. **Proxy URL correct**: Should be `https://control.asora.co.za/api/admin/moderation/test/*` (not direct admin-api)
4. **Browser console**: Check for detailed error in the debug panel (F12 → Console tab)

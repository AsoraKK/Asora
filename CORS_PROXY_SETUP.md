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

### 1. GitHub Actions Secrets (You've completed this!)

✅ You've already added these to the repository secrets (`Settings → Secrets and variables → Actions`):

| Secret Name | Value | Notes |
|------------|-------|-------|
| `CF_Access_Client_Id` | (your Cloudflare service token ID) | Uses underscores (GitHub Actions constraint) |
| `CF_Access_Client_Secret` | (your Cloudflare service token secret) | Store securely—never commit this |

When the deploy workflow runs, these secrets are automatically injected into Azure App Settings.

### 2. Azure Key Vault Setup (Optional but Recommended)

For better security, store the secret in Azure Key Vault:

```bash
# Check if Key Vault exists in your resource group
az keyvault list -g <your-resource-group> --query "[0].name" -o tsv

# If it exists, set the secret (deploy workflow will use it automatically)
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name "cf-access-client-secret" \
  --value "your-secret-value-here"
```

**Deploy workflow behavior:**
- Checks for an existing Key Vault in your resource group
- If found: stores secret and sets app setting with Key Vault reference
- If not found: stores secret directly as app setting (less secure, but functional)

### 3. Azure App Settings (Automatic)

The deploy workflow automatically configures these in the Function App:

| Variable | Set From | Storage |
|----------|-----------|---------|
| `CF_ACCESS_CLIENT_ID` | GitHub Actions secret: `CF_Access_Client_Id` | App Settings (plain text, non-sensitive) |
| `CF_ACCESS_CLIENT_SECRET` | GitHub Actions secret: `CF_Access_Client_Secret` | Key Vault reference (secure) OR App Settings (if no KV) |
| `ADMIN_API_URL` | Default: `https://admin-api.asora.co.za` | Optional override via app setting |

### 4. Cloudflare Routing

Ensure Cloudflare/ingress routes `/api/*` to the Azure Functions App:

- **Rule**: `control.asora.co.za/api/*` → Functions App origin
- Does NOT need to route to `admin-api.asora.co.za` directly
- Browser traffic should never reach admin-api directly (defeats the proxy purpose)

### 4. Cloudflare Routing

Ensure Cloudflare/ingress routes `/api/*` to the Azure Functions App:

- Rule: `control.asora.co.za/api/*` → Functions App origin
- Does NOT need to route to admin-api.asora.co.za directly
- Browser traffic should never reach admin-api directly (that defeats the purpose)

## Deployment Checklist

✅ **You've completed:**
- Step 1: Added GitHub Actions secrets (`CF_Access_Client_Id`, `CF_Access_Client_Secret`)

**Next (automated on next deploy):**
- Step 2: Azure Key Vault setup (optional—workflow checks and uses if exists)
- Step 3: Function App Settings (automatic—deploy workflow injects secrets)
- Step 4: Cloudflare routing (manual—ensure `/api/*` routes to Functions)

**To deploy:**

1. **Ensure Cloudflare routing is configured** (check with Cloudflare/SRE team):
   ```
   control.asora.co.za/api/* → Functions App
   ```

2. **Trigger deployment:**
   ```bash
   git push origin main  # or manually trigger deploy-asora-function-dev workflow
   ```

3. **Monitor deployment:**
   - Watch GitHub Actions workflow for CF Access credential configuration step
   - Look for log: `✅ Cloudflare Access credentials configured`
   - Verify post-deploy probes pass (health check, function registration)

4. **Verify in Azure Portal:**
   ```
   Resource Group → Function App → Settings → Configuration
   ```
   Should see:
   - `CF_ACCESS_CLIENT_ID` = (your ID)
   - `CF_ACCESS_CLIENT_SECRET` = `@Microsoft.KeyVault(...)` or plain value

## How to Get Cloudflare Access Credentials

1. Log into Cloudflare Zero Trust Dashboard
2. Navigate to **Settings → API Tokens** (or **Service Tokens** if using that method)
3. Generate a new service token for "admin-api.asora.co.za"
4. Copy:
   - **Client ID** → `CF_Access_Client_Id` (GitHub secret)
   - **Client Secret** → `CF_Access_Client_Secret` (GitHub secret)

## Testing Locally

To test the proxy locally, ensure you have:

1. Functions running locally: `npm start` in the `functions/` directory
2. Control-panel running locally: `npm run dev` in `apps/control-panel/`
3. Set env vars in your local Functions `.env`:
   ```
   CF_ACCESS_CLIENT_ID=your-id
   CF_ACCESS_CLIENT_SECRET=your-secret
   ```

Then the control-panel should call `http://localhost:7072/api/admin/moderation/test/upload` (proxy) instead of direct admin-api.

## Security Notes

- **No exposed secrets in browser**: CF Access credentials stay on the server
- **Key Vault integration**: Secrets stored in Key Vault are encrypted at rest
- **GitHub secrets**: Only visible during workflow execution

- **Rate limiting**: Proxy enforces 60 requests per minute per IP
- **Admin JWT validation**: Proxy validates control-panel admin token before proxying
- **Audit trail**: All proxy requests logged with correlation IDs

## If the Proxy Fails to Authenticate

Check:
1. **CF Credentials valid**: Verify ID and secret in Key Vault
2. **CF Policy includes service token**: In Cloudflare Zero Trust, ensure the application policy allows service tokens
3. **Proxy URL correct**: Should be `https://control.asora.co.za/api/admin/moderation/test/*` (not direct admin-api)
4. **Browser console**: Check for detailed error in the debug panel (F12 → Console tab)

# Lythaus Control Panel

Primary admin UI for beta operations.

Build command: npm ci && npm run build
Output folder: dist/
Note: Single-page app routing requires Pages redirect rules.

## Configuration

### API Base URL

By default, the control-panel uses same-origin proxy routing:
- `GET /api/admin/config` → proxied to `https://admin-api.asora.co.za/config`
- `POST /api/admin/moderation/test` → proxied to `https://admin-api.asora.co.za/moderation/test` (URL-based tests)

Note: Live file uploads are not supported yet; use URL inputs or mock mode.

**Benefits:**
- Eliminates CORS issues (browser never directly calls cross-origin)
- Cloudflare Access service token injected server-side (no exposure to browser)
- Same-origin requests are always allowed

**Deployment requirement:**
- Cloudflare/ingress must route `/api/*` to the Azure Functions App
- Functions App must have env vars: `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` set

To bypass proxy and call admin API directly:
```bash
VITE_ADMIN_API_URL=https://admin-api.asora.co.za npm run build
```

The Dashboard includes an Admin session panel that stores the API URL and
admin JWT in local storage for this browser.

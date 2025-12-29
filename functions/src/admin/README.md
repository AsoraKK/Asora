# Admin API Module

Protected API endpoints for admin configuration management with audit logging.

## Overview

The Admin API provides:
- **GET /api/admin/config** - Retrieve current configuration
- **PUT /api/admin/config** - Update configuration with validation and audit
- **GET /api/admin/audit** - View configuration change history

All endpoints are protected by Cloudflare Access JWT validation (defense-in-depth).

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Cloudflare Access                            │
│  (Policy: kyle.kern@asora.co.za → Allow)                         │
└─────────────────────────┬────────────────────────────────────────┘
                          │ Cf-Access-Jwt-Assertion header
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│            Azure Functions (asora-function-dev)                   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  accessAuth.ts - Validates JWT, extracts actor (email/sub)  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  adminService.ts - Transactional DB operations              │ │
│  │  - Version bumping with SELECT FOR UPDATE                   │ │
│  │  - Append-only audit log                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Tables                                          │ │
│  │  - admin_config (single row, versioned)                     │ │
│  │  - admin_audit_log (append-only, indexed by ts DESC)        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CF_ACCESS_TEAM_DOMAIN` | Yes | Cloudflare Access team domain (e.g., `asora`) |
| `CF_ACCESS_AUD` | Yes | Cloudflare Access Application Audience (AUD) tag |
| `POSTGRES_CONNECTION_STRING` | Yes | PostgreSQL connection string |

## Database Migration

Run the migration before first use:

```sql
-- See: functions/src/admin/migrations/001_admin_config_tables.sql
```

Or execute via psql:
```bash
psql "$POSTGRES_CONNECTION_STRING" < functions/src/admin/migrations/001_admin_config_tables.sql
```

## API Reference

### GET /api/admin/config

Returns current configuration.

**Response:**
```json
{
  "version": 5,
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "updatedBy": "kyle.kern@asora.co.za",
  "payload": {
    "schemaVersion": 1,
    "moderation": {
      "temperature": 0.2,
      "hiveAutoFlagThreshold": 0.8,
      "hiveAutoRemoveThreshold": 0.95,
      "enableAutoModeration": true,
      "enableAzureContentSafety": true
    },
    "featureFlags": {
      "appealsEnabled": true,
      "communityVotingEnabled": true,
      "pushNotificationsEnabled": true,
      "maintenanceMode": false
    }
  }
}
```

### PUT /api/admin/config

Updates configuration (transactional with audit).

**Request:**
```json
{
  "schemaVersion": 1,
  "payload": {
    "moderation": {
      "temperature": 0.25,
      "hiveAutoFlagThreshold": 0.85,
      "hiveAutoRemoveThreshold": 0.95,
      "enableAutoModeration": true,
      "enableAzureContentSafety": true
    },
    "featureFlags": {
      "appealsEnabled": true,
      "communityVotingEnabled": true,
      "pushNotificationsEnabled": true,
      "maintenanceMode": false
    }
  }
}
```

**Response:**
```json
{
  "ok": true,
  "version": 6,
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

### GET /api/admin/audit?limit=50

Returns audit log entries (newest first).

**Response:**
```json
{
  "entries": [
    {
      "id": "123",
      "timestamp": "2024-01-15T11:00:00.000Z",
      "actor": "kyle.kern@asora.co.za",
      "action": "update",
      "resource": "admin_config",
      "before": {
        "schemaVersion": 1,
        "moderation": { "temperature": 0.2 }
      },
      "after": {
        "schemaVersion": 1,
        "moderation": { "temperature": 0.25 }
      }
    }
  ],
  "limit": 50
}
```

## Cloudflare Access Setup

1. Create a Self-hosted Application in Cloudflare Zero Trust
2. Set hostname to `admin-api.asora.co.za`
3. Create Allow policy for `kyle.kern@asora.co.za`
4. Copy the Application Audience (AUD) Tag
5. Set environment variables:
   ```bash
   # Option 1: Full issuer URL (recommended)
   CF_ACCESS_ISSUER=https://asorateam.cloudflareaccess.com
   CF_ACCESS_AUDIENCE=a8403633724230f721a6a22b518131b4da071a7d57bf07a640f27ceb93c1ab01
   CF_ACCESS_OWNER_EMAIL=owner@asora.co.za

   # Option 2: Legacy team domain (also works)
   CF_ACCESS_TEAM_DOMAIN=asorateam
   CF_ACCESS_AUD=a8403633724230f721a6a22b518131b4da071a7d57bf07a640f27ceb93c1ab01

   # Optional: Custom JWKS URL (auto-derived from issuer if not set)
   CF_ACCESS_JWKS_URL=https://asorateam.cloudflareaccess.com/cdn-cgi/access/certs
   ```

## Security Features

The Cloudflare Access JWT verification provides defense-in-depth:

1. **RS256 Algorithm Only** - Rejects `alg:none` and other algorithms
2. **Cryptographic Signature Verification** - Uses JWKS with caching (10min TTL)
3. **Issuer Validation** - Must match `CF_ACCESS_ISSUER` exactly
4. **Audience Validation** - Must match `CF_ACCESS_AUDIENCE`
5. **Expiration Checking** - With 60s clock skew tolerance
6. **Owner Email Enforcement** - Config/audit endpoints require `CF_ACCESS_OWNER_EMAIL` match

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 401 | MISSING_TOKEN | No Cf-Access-Jwt-Assertion header |
| 401 | INVALID_TOKEN | Signature, iss, or aud validation failed |
| 401 | EXPIRED_TOKEN | Token has expired |
| 403 | FORBIDDEN | Email doesn't match owner email |
| 500 | CONFIG_ERROR | Missing environment configuration |

## Testing

```bash
# From functions directory
npm test -- --testPathPattern=admin

# Run cryptographic JWT verification tests
npm test -- --testPathPattern=accessAuth.crypto
```

## Smoke Test Commands

```bash
# Test 1: No header -> 401
curl -s https://asora-function-dev.azurewebsites.net/api/_admin/config | jq .
# Expected: {"error":{"code":"UNAUTHORIZED","message":"Missing Cf-Access-Jwt-Assertion header",...}}

# Test 2: Bogus token -> 401 (proves signature verification)
curl -s -H "Cf-Access-Jwt-Assertion: eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJmYWtlIn0.invalid" \
  https://asora-function-dev.azurewebsites.net/api/_admin/config | jq .
# Expected: {"error":{"code":"INVALID_TOKEN",...}}

# Test 3: Firebase auth endpoint still works (invites)
curl -s -X POST https://asora-function-dev.azurewebsites.net/admin/invites | jq .
# Expected: {"error":"Authorization header missing"}
```

## Curl Examples (with Access Session)

```bash
# These require a valid Access session (browser) or service token

# Get config
curl -H "Cf-Access-Jwt-Assertion: $JWT" \
  https://admin-api.asora.co.za/api/_admin/config

# Update config
curl -X PUT \
  -H "Cf-Access-Jwt-Assertion: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"schemaVersion": 1, "payload": {"threshold": 0.9}}' \
  https://admin-api.asora.co.za/api/_admin/config

# Get audit log
curl -H "Cf-Access-Jwt-Assertion: $JWT" \
  "https://admin-api.asora.co.za/api/_admin/audit?limit=20"
```

## Integration with Moderation

The moderation module reads thresholds from the Cosmos `config` container
(partitionKey `moderation`) via `moderationConfigProvider.ts` with a short
cache TTL (default 30s, configurable via `MODERATION_CONFIG_CACHE_TTL_MS`).
Admin config updates upsert the Cosmos config document so moderation picks up
changes within the TTL window.

## CORS Configuration

CORS is configured at the Azure level via REST API. The `az functionapp cors add`
command fails on Flex Consumption plans due to a `FunctionAppScaleLimit` validation
bug, so we use the ARM REST API directly.

### Current Configuration

```bash
# View current CORS settings
az rest --method get \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev/config/web?api-version=2023-01-01" \
  --query "properties.cors"

# Allowed origins:
# - https://control.asora.co.za
# - http://localhost:8080
# - http://localhost:4200
```

### Verification Commands

```bash
# Test 1: OPTIONS preflight (should return CORS headers)
curl -sI -X OPTIONS \
  -H "Origin: https://control.asora.co.za" \
  -H "Access-Control-Request-Method: GET" \
  "https://asora-function-dev.azurewebsites.net/api/_admin/config"
# Expected: 204 with Access-Control-Allow-Origin header

# Test 2: GET without tokens (should return 401 with CORS headers)
curl -si -H "Origin: https://control.asora.co.za" \
  "https://asora-function-dev.azurewebsites.net/api/_admin/config" | head -10
# Expected: 401 with Access-Control-Allow-Origin: https://control.asora.co.za

# Test 3: GET via Cloudflare (302 redirect with CORS)
curl -si -H "Origin: https://control.asora.co.za" \
  "https://admin-api.asora.co.za/api/_admin/config" | head -10
# Expected: 302 with access-control-allow-origin header
```

### Updating CORS (if needed)

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az rest --method patch \
  --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev/config/web?api-version=2023-01-01" \
  --body '{"properties":{"cors":{"allowedOrigins":["https://control.asora.co.za","http://localhost:8080","http://localhost:4200"],"supportCredentials":true}}}'
```

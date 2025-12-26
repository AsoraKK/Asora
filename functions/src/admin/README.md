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
    "moderationThreshold": 0.8
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
    "moderationThreshold": 0.85,
    "enableFeatureX": true
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
      "before": { "schemaVersion": 1, "moderationThreshold": 0.8 },
      "after": { "schemaVersion": 1, "moderationThreshold": 0.85 }
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
   CF_ACCESS_TEAM_DOMAIN=asorateam
   CF_ACCESS_AUD=a8403633724230f721a6a22b518131b4da071a7d57bf07a640f27ceb93c1ab01
   ```

## Testing

```bash
# From functions directory
npm test -- --testPathPattern=admin
```

## Curl Examples (with Access Session)

```bash
# These require a valid Access session (browser) or service token

# Get config
curl -H "Cf-Access-Jwt-Assertion: $JWT" \
  https://admin-api.asora.co.za/api/admin/config

# Update config
curl -X PUT \
  -H "Cf-Access-Jwt-Assertion: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"schemaVersion": 1, "payload": {"threshold": 0.9}}' \
  https://admin-api.asora.co.za/api/admin/config

# Get audit log
curl -H "Cf-Access-Jwt-Assertion: $JWT" \
  "https://admin-api.asora.co.za/api/admin/audit?limit=20"
```

## Integration with Moderation

The moderation module currently reads thresholds from environment variables
(`HIVE_REJECT_THRESHOLD`, `HIVE_REVIEW_THRESHOLD`, etc. in `moderationConfig.ts`).

To integrate with admin config:

1. **Option A**: Update `getModerationConfig()` to check admin_config first
2. **Option B**: Sync admin_config changes to Cosmos config container
3. **Option C**: Use admin_config as override, fall back to env vars

Recommended: Option A with caching (TTL-based refresh from DB).

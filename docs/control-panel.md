# Admin Control Panel

This document describes the admin control panel implementation, API contracts, and verification procedures.

## Overview

The admin control panel allows authorized administrators to manage platform-wide configuration settings including moderation thresholds, feature flags, and other operational parameters.

**Access:** Owner-only via Cloudflare Access (requires `CF_ACCESS_OWNER_EMAIL` match)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Flutter Control Panel                     │
│  AdminConfigScreen → AdminConfigEditorNotifier → AdminApiClient  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (via Cloudflare Access)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Azure Functions                          │
│  GET/PUT /api/admin/config  →  adminService  →  PostgreSQL  │
│  GET /api/admin/audit       →  adminService  →  PostgreSQL  │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### GET /api/admin/config

Returns current admin configuration with version and metadata.

**Request:**
```bash
curl -si \
  -H "Cf-Access-Jwt-Assertion: <jwt>" \
  "https://admin-api.asora.co.za/api/admin/config"
```

**Response (200):**
```json
{
  "version": 12,
  "updatedAt": "2025-12-27T10:15:30.123Z",
  "updatedBy": "kyle.kern@asora.co.za",
  "payload": {
    "schemaVersion": 1,
    "moderation": {
      "temperature": 0.2,
      "toxicityThreshold": 0.85,
      "autoRejectThreshold": 0.95,
      "enableHiveAi": true,
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

Updates admin configuration with optimistic locking.

**Request:**
```json
{
  "schemaVersion": 1,
  "expectedVersion": 12,
  "payload": {
    "moderation": {
      "temperature": 0.25,
      "toxicityThreshold": 0.9,
      "autoRejectThreshold": 0.95,
      "enableHiveAi": true,
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

**Response (200):**
```json
{
  "ok": true,
  "version": 13,
  "updatedAt": "2025-12-27T10:20:00.000Z"
}
```

**Response (409 - Version Conflict):**
```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Version conflict: expected 12, server has 13",
    "correlationId": "abc-123"
  }
}
```

### GET /api/admin/audit

Returns audit log entries for configuration changes.

**Request:**
```bash
curl -si \
  -H "Cf-Access-Jwt-Assertion: <jwt>" \
  "https://admin-api.asora.co.za/api/admin/audit?limit=20"
```

**Response (200):**
```json
{
  "entries": [
    {
      "id": "uuid-123",
      "timestamp": "2025-12-27T10:20:00.000Z",
      "actor": "kyle.kern@asora.co.za",
      "action": "update",
      "resource": "admin_config",
      "before": { "moderation": { "temperature": 0.2 } },
      "after": { "moderation": { "temperature": 0.25 } }
    }
  ],
  "limit": 20
}
```

## Concurrency Control

The API uses optimistic locking via `expectedVersion`:

1. Client fetches config (version N)
2. Client sends update with `expectedVersion: N`
3. Server checks if current version == N
4. If match: update succeeds, version → N+1
5. If mismatch: 409 Conflict returned

**UI Behavior on Conflict:**
- Shows "Config changed on server" error banner
- Provides "Reload" button to fetch fresh data
- User's draft changes are preserved for manual merge

## Flutter Files

| File | Purpose |
|------|---------|
| `lib/features/admin/domain/admin_config_models.dart` | Typed models with JSON serialization |
| `lib/features/admin/api/admin_api_client.dart` | HTTP client with error handling |
| `lib/features/admin/state/admin_config_controller.dart` | Riverpod state management |
| `lib/features/admin/ui/admin_config_screen.dart` | UI with sliders, switches, status |

## Running Tests

### Model Tests (JSON parsing)
```bash
flutter test test/features/admin/models/admin_config_models_test.dart
```

### Diff Detection Tests
```bash
# Generate mocks first
flutter pub run build_runner build --delete-conflicting-outputs
# Run tests
flutter test test/features/admin/state/admin_config_diff_test.dart
```

### Widget Tests
```bash
flutter test test/features/admin/ui/admin_config_screen_test.dart
```

### All Admin Tests
```bash
flutter test test/features/admin/
```

## Audit Logging Verification

Every configuration update is logged in the `admin_audit_log` table.

### Via API
```bash
# After making a change, verify audit entry exists
curl -si \
  -H "Cf-Access-Jwt-Assertion: <jwt>" \
  "https://admin-api.asora.co.za/api/admin/audit?limit=5"
```

### Via Database (PostgreSQL)
```sql
SELECT id, ts, actor, action, before_json, after_json
FROM admin_audit_log
WHERE resource = 'admin_config'
ORDER BY ts DESC
LIMIT 5;
```

### Via App Insights (KQL)
```kql
traces
| where message contains "admin/config PUT"
| where customDimensions.correlationId != ""
| project timestamp, message, customDimensions.correlationId, customDimensions.actor
| order by timestamp desc
| take 20
```

## Acceptance Test Script

### Prerequisites
- Authenticated browser session at `admin-api.asora.co.za`
- Or: Service token with appropriate Access policy

### Test Steps

1. **Open control panel** → Verify:
   - Version number displayed
   - Last updated timestamp in local time
   - Updated by email/name visible
   - Sliders initialized to server values

2. **Change a slider** (e.g., temperature +0.05) → Verify:
   - Status changes to "Unsaved changes"
   - Save button becomes enabled
   - Value display updates immediately

3. **Click Save** → Verify:
   - Status shows "Saving..."
   - Status changes to "Saved" (briefly)
   - Version number increments
   - Timestamp updates

4. **Verify audit** → Call GET /api/admin/audit:
   - New entry exists with correct actor
   - before/after shows the changed field

5. **Test version conflict** (requires two sessions):
   - Session A: Load config (version N)
   - Session B: Save a change (version → N+1)
   - Session A: Try to save → Should show conflict error
   - Session A: Click "Reload" → Gets fresh data

6. **Test error handling**:
   - Disconnect network
   - Try to save
   - Should show error banner with "Retry" option
   - Reconnect and retry → Should succeed

## Configuration Fields

### Moderation
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `temperature` | float | 0.0-1.0 | AI temperature for moderation |
| `toxicityThreshold` | float | 0.0-1.0 | Flag content above this |
| `autoRejectThreshold` | float | 0.0-1.0 | Auto-reject above this |
| `enableHiveAi` | bool | - | Primary moderation service |
| `enableAzureContentSafety` | bool | - | Fallback service |

### Feature Flags
| Field | Type | Description |
|-------|------|-------------|
| `appealsEnabled` | bool | Allow moderation appeals |
| `communityVotingEnabled` | bool | Community votes on appeals |
| `pushNotificationsEnabled` | bool | Global push toggle |
| `maintenanceMode` | bool | Read-only mode (destructive!) |

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_TOKEN` | 401 | No JWT assertion header |
| `INVALID_TOKEN` | 401 | JWT signature invalid |
| `FORBIDDEN` | 403 | Not owner email |
| `NOT_FOUND` | 404 | Config not initialized |
| `VERSION_CONFLICT` | 409 | Optimistic lock failure |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `PAYLOAD_TOO_LARGE` | 413 | Config > 64KB |
| `INTERNAL_ERROR` | 500 | Server error |

# Asora Analytics

**Privacy-Safe Product Analytics**

## Overview

This directory contains analytics queries, dashboards, and documentation for Asora's privacy-safe analytics system. All analytics are opt-in, pseudonymous, and PII-free by design.

## Privacy Commitments

- ✅ **Explicit Opt-In**: Analytics disabled by default, user must explicitly enable
- ✅ **Pseudonymous**: Uses internal UUIDs only, never emails or provider IDs
- ✅ **PII-Free**: No personal data, content text, or device identifiers
- ✅ **IP Hashing**: Client IPs hashed to /24 prefixes for abuse detection only
- ✅ **Reversible**: Users can opt-out anytime, data subject rights supported
- ✅ **GDPR/POPIA Compliant**: Baseline privacy-by-design principles

## Architecture

### Client (Flutter)
- **Location**: `lib/core/analytics/`
- **Components**:
  - `AnalyticsClient`: Interface for analytics tracking
  - `ConsentAwareAnalyticsClient`: Enforces consent before events
  - `HttpAnalyticsClient`: Batches and sends events to backend
  - `AnalyticsConsent`: Consent state model
  - `AnalyticsEvents`: Event catalog with PII-free schemas

### Backend (Azure Functions)
- **Location**: `functions/src/analytics/`
- **Endpoint**: `POST /api/analytics/events`
- **Components**:
  - Validation: Strict schema enforcement
  - Sanitization: PII stripping, IP hashing
  - Storage: Application Insights custom events
  - Rate Limiting: 60 req/min per user

### Data Flow

```
Flutter Client
  ↓ (batched POST)
/api/analytics/events
  ↓ (validation + sanitization)
Application Insights
  ↓ (query with KQL)
Dashboards & Reports
```

## Event Catalog

All events follow snake_case naming and have categorical/numeric properties only.

### Lifecycle & Navigation
- `app_started`: App launched
- `screen_view`: Screen viewed (screen_name, referrer)

### Authentication
- `auth_started`: Sign-in initiated (method: google|email|guest)
- `auth_completed`: Sign-in completed (method, is_new_user)
- `auth_signed_out`: User signed out

### Content
- `post_created`: Post created (media_type, ai_blocked, is_first_post)
- `comment_created`: Comment created (ai_blocked)
- `feed_scrolled`: Feed engagement (approx_items_viewed, session_duration_seconds)
- `post_interaction`: Post action (action: like|share|report)

### Privacy
- `privacy_settings_opened`: Privacy screen viewed
- `privacy_export_requested`: Data export requested
- `privacy_delete_requested`: Account deletion requested
- `analytics_consent_changed`: Analytics toggled (enabled, source)

### Moderation
- `moderation_appeal_submitted`: Appeal submitted (appeal_type, urgency_score)
- `moderation_console_opened`: Moderator opened console
- `moderation_decision_made`: Moderator made decision (action, case_type)

### Errors
- `error_encountered`: Error occurred (error_type, screen_name, recoverable)

## Queries

See `queries/` directory for KQL queries:
- `dau.kql`: Daily active users by platform
- `funnel_onboarding.kql`: Sign-up to first post funnel
- `retention_cohorts.kql`: Weekly retention analysis
- `privacy_events.kql`: Privacy-related event counts

## Dashboards

See `dashboards/` directory for Azure Workbook templates.

## Setup

### 1. Enable Analytics in Flutter App

Users must explicitly opt-in via **Privacy Settings**:
1. Open Privacy Settings
2. Toggle "Share anonymous usage data"
3. Review privacy policy

### 2. Query Application Insights

Navigate to Azure Portal → Application Insights → Logs, then run KQL queries from `queries/` directory.

### 3. Import Dashboards

1. Go to Application Insights → Workbooks
2. Click "New" → "Advanced Editor"
3. Paste content from `dashboards/*.json`
4. Save and pin to dashboard

## DSR (Data Subject Rights) Support

### Export
Analytics events are linked to internal user IDs. To export a user's analytics:

```kql
customEvents
| where customDimensions.userId == "<internal-user-id>"
| where timestamp >= ago(30d)
| project timestamp, name, customDimensions
```

### Delete
To delete analytics for a user (per retention policy):

```kql
// Mark for deletion (manual process)
// Note: App Insights has 30-day retention by default
```

## Monitoring

### Key Metrics
- Daily event volume by type
- Error rate per screen
- Consent opt-in rate
- Ingestion latency (p50, p95, p99)

### Alerts
Consider setting up alerts for:
- Sudden drop in event volume (system issue)
- High error rate for specific screens
- Analytics endpoint 5xx errors
- Consent revocation spike

## Development

### Testing Locally

1. Start Azure Functions locally:
```bash
cd functions
npm start
```

2. Send test event (requires valid JWT):
```bash
curl -X POST http://localhost:7071/api/analytics/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sessionId": "test-session-123",
    "events": [{
      "name": "screen_view",
      "ts": "2025-01-16T12:00:00Z",
      "props": {"screen_name": "feed"}
    }],
    "app": {"version": "1.0.0", "platform": "android"}
  }'
```

### Adding New Events

1. Add event constant to `lib/core/analytics/analytics_events.dart`
2. Document properties and constraints
3. Add event call at appropriate location
4. Update this README with event definition
5. Create KQL query if needed for reporting

## Compliance Notes

- Analytics consent is separate from account consent
- Consent state is persisted locally and in account export
- IP addresses are never stored raw (hashed to /24 prefix)
- Event properties are validated for PII before ingestion
- Retention: 30 days (Application Insights default)
- DSR requests handled via internal user ID mapping

## Support

For questions or issues:
- Check `docs/ADR_001_TLDR.md` for privacy policy references
- Review `lib/core/analytics/` for client implementation
- Check `functions/src/analytics/` for backend validation

## License

Copyright © 2025 Asora. All rights reserved.

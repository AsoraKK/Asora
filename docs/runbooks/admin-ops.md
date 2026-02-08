# Lythaus Admin Ops Runbook (Beta)

## Purpose
Operate the Lythaus beta admin surface with strict binary content states and appeal-only review.

## Preconditions
- Admin JWT with `admin` role is required for all admin endpoints.
- Actions are audited in `audit_logs` (partition key `subjectId`).
- Content state is binary: `PUBLISHED` or `BLOCKED`.

## Primary UI
Use the Lythaus Control Panel as the primary admin UI. The API calls below are
intended for fallback or automation.

## Flagged Content Queue
### List flags (open by default)
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  "https://<function-host>/api/_admin/flags?status=open&limit=25"
```

### Block or publish content
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"contentType":"post","reasonCode":"POLICY_VIOLATION","note":"Spam"}' \
  "https://<function-host>/api/_admin/content/<contentId>/block"
```

```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"contentType":"post","reasonCode":"FALSE_POSITIVE","note":"Appeal approved"}' \
  "https://<function-host>/api/_admin/content/<contentId>/publish"
```

## Appeals Queue (only review path)
- Appeals auto-resolve after a 5-minute community vote window; admins can override at any time.
### List appeals (oldest pending first)
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  "https://<function-host>/api/_admin/appeals?status=pending&limit=25"
```

### Approve or reject appeal
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"reasonCode":"APPEAL_APPROVE","note":"Policy exception"}' \
  "https://<function-host>/api/_admin/appeals/<appealId>/approve"
```

```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"reasonCode":"APPEAL_REJECT","note":"Violates policy"}' \
  "https://<function-host>/api/_admin/appeals/<appealId>/reject"
```

## User Lookup + Disable/Enable
### Search users
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  "https://<function-host>/api/_admin/users/search?q=handle-or-id"
```

### Disable user (reason + note required)
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"reasonCode":"ABUSE","note":"Repeated harassment reports"}' \
  "https://<function-host>/api/_admin/users/<userId>/disable"
```

### Enable user
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "https://<function-host>/api/_admin/users/<userId>/enable"
```

## Invites
### Create a single invite
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"maxUses":1,"label":"beta-partner"}' \
  "https://<function-host>/api/_admin/invites"
```

### Create a batch
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"count":10,"maxUses":1,"label":"event"}' \
  "https://<function-host>/api/_admin/invites/batch"
```

### List invites
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  "https://<function-host>/api/_admin/invites?limit=50"
```

### Revoke invite
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"reasonCode":"ABUSE","note":"Sharing invite publicly"}' \
  "https://<function-host>/api/_admin/invites/<inviteCode>/revoke"
```

## Audit Log
### Pull recent audit records
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  "https://<function-host>/api/_admin/audit?limit=50"
```

## Curated News Ingestion
### Manual ingest (admin-triggered)
```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "content":"Headline and summary text",
    "sourceType":"partner",
    "sourceName":"Reuters",
    "sourceUrl":"https://www.reuters.com/world/...",
    "sourceFeedUrl":"https://www.reuters.com/world/rss",
    "externalId":"reuters:article-id",
    "publishedAt":"2026-02-08T09:00:00.000Z"
  }' \
  "https://<function-host>/api/_admin/news/ingest"
```

### Automated scheduled pull
- Function: `curatedNewsIngest` (every 15 minutes).
- Required env vars:
  - `CURATED_NEWS_AUTHOR_ID`: user ID used as author for automated ingests.
  - `CURATED_NEWS_SOURCES_JSON`: JSON array of feed sources.
- Example `CURATED_NEWS_SOURCES_JSON`:
```json
[
  {
    "id": "reuters-world",
    "name": "Reuters",
    "url": "https://www.reuters.com/world/rss",
    "format": "rss",
    "sourceType": "partner",
    "topics": ["world", "policy"],
    "maxItems": 10,
    "enabled": true
  }
]
```

## Guardrails
- Admin decisions only flip `PUBLISHED` <-> `BLOCKED`.
- Appeals are the only review mechanism (no queued or held state).
- Every admin write action is audited with reason code and note.

# Rate Limits

This document is the route matrix for the beta abuse controls implemented in [functions/src/rate-limit/policies.ts](../../functions/src/rate-limit/policies.ts).

All listed routes also inherit the global guards:

- Per-IP: `120 req / 60s`
- Per-principal: `240 req / 60s` when a principal can be derived from bearer auth or Cloudflare Access

## Standard 429

All middleware-driven throttles return:

- HTTP `429`
- Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- JSON body fields: `error`, `scope`, `limit`, `window_seconds`, `retry_after_seconds`, `trace_id`

## Route Matrix

| Route or pattern | Per-principal | Per-route IP | Notes |
| --- | --- | --- | --- |
| `POST /api/auth/authorize` | n/a | `20 / 60s` | 30-minute auth-failure backoff |
| `POST /api/auth/token` | n/a | `20 / 60s` | 30-minute auth-failure backoff |
| `POST /api/auth/refresh` | n/a | `20 / 60s` | 30-minute auth-failure backoff |
| `POST /api/auth/redeem-invite` | n/a | `20 / 60s` | 30-minute auth-failure backoff |
| `GET|POST /api/auth/userinfo` | `60 / 60s` | `20 / 60s` | access-token reads |
| `GET /api/feed/discover` and `GET /api/feed/public` | `90 / 60s` | `30 / 60s` | guest and authenticated reads share one bucket |
| `GET /api/feed/user/{userId}` | `90 / 60s` | `30 / 60s` | authenticated reads get principal tracking; guests stay IP-only |
| `GET /api/feed/news` | `90 / 60s` | `30 / 60s` | authenticated feed read |
| `POST /api/post` and `POST /api/posts` | `15 / 60s`, burst `5` | `20 / 60s` | post creation |
| `POST /api/posts/{postId}/comments` | `20 / 60s`, burst `6` | `25 / 60s` | comment creation |
| `POST /api/moderation/flag` | `10 / 60s`, burst `4` | `15 / 60s` | flag creation |
| `POST /api/moderation/appeals` and `POST /api/appeals` | `6 / 60s`, burst `2` | `10 / 60s` | appeal creation |
| `POST /api/moderation/appeals/{appealId}/vote` and `POST /api/appeals/{appealId}/vote` | `20 / 60s`, burst `5` | `25 / 60s` | appeal voting |
| `PATCH /api/users/me` | `10 / 60s`, burst `4` | `15 / 60s` | profile edit |
| `POST /api/media/upload-url` | `10 / 60s`, burst `3` | `12 / 60s` | presigned upload URL requests |
| `POST|PUT|PATCH|DELETE /api/_admin/content/*`, `/api/_admin/users/*`, `/api/_admin/appeals/*`, `/api/_admin/invites*`, `/api/_admin/flags/*/resolve`, `/api/_admin/news/ingest`, `/api/_admin/dsr/*`, `/api/_admin/budget`, `/api/admin/config`, `/api/admin/moderation-classes/*`, `/api/admin/users/{userId}/tier` | `12 / 60s`, burst `3` | `20 / 60s` | admin and privacy mutation routes |


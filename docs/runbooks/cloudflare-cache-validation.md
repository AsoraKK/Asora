# Cloudflare Cache Validation (Feed Endpoints)

Last updated: 2026-02-16

## Goal

Ensure Cloudflare caches only anonymous-safe feed endpoints and never caches personalized responses.

## Endpoint policy

- `GET /api/feed/discover`: cacheable only for anonymous traffic.
- `GET /api/feed/news`: cacheable only for anonymous traffic.
- `GET /api/feed/user/{userId}`: never cache (`private, no-store`).
- Any authenticated feed request: never cache (`private, no-store`).

## Worker checklist

- `cloudflare/worker.ts`:
  - Anonymous cache allowlist contains only `/api/feed/discover` and `/api/feed/news`.
  - Requests with `Authorization` bypass edge cache and set `Cache-Control: private, no-store`.
  - Non-allowlisted feed paths bypass cache and set `Cache-Control: private, no-store`.
- `workers/feed-cache/src/index.js`:
  - Same allowlist and bypass behavior as above.
  - `Vary: Authorization` is always present.

## Staging validation commands

Use your staging host:

```bash
BASE_URL="https://<staging-host>"

# Anonymous discover: cacheable
curl -sS -D - -o /dev/null "$BASE_URL/api/feed/discover?limit=5" | rg -n "HTTP/|Cache-Control|Vary|X-Cache"

# Authenticated discover: non-cacheable
curl -sS -D - -o /dev/null \
  -H "Authorization: Bearer <token>" \
  "$BASE_URL/api/feed/discover?limit=5" | rg -n "HTTP/|Cache-Control|Vary|X-Cache"

# Anonymous news: cacheable
curl -sS -D - -o /dev/null "$BASE_URL/api/feed/news?limit=5" | rg -n "HTTP/|Cache-Control|Vary|X-Cache"

# User feed: always non-cacheable
curl -sS -D - -o /dev/null "$BASE_URL/api/feed/user/<userId>?limit=5" | rg -n "HTTP/|Cache-Control|Vary|X-Cache"
```

Expected:

- Discover/news anonymous: `Cache-Control: public, max-age=60, stale-while-revalidate=30`.
- Any request with `Authorization`: `Cache-Control: private, no-store`.
- User feed endpoint: `Cache-Control: private, no-store`.

## Evidence to archive for release packet

- Headers from the four curl checks above.
- Screenshot/export of active Cloudflare route bindings.
- Screenshot/export of active Worker script version and deployment timestamp.

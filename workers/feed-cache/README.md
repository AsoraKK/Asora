Feed Cache Worker (Cloudflare)

Overview
- Proxies `GET /api/feed*` to the Azure Functions origin and caches unauthenticated GETs at the edge for 60 seconds.
- Requests with an `Authorization` header bypass cache and return `Cache-Control: private, no-store`.
- Canonical worker logic is maintained in `cloudflare/worker.ts`.
- This folder is a compatibility wrapper only.

Setup
- ORIGIN_BASE: set to your Function App default hostname, e.g. `https://asora-function-dev-<hash>.northeurope-01.azurewebsites.net`.
- Configure the route in Cloudflare: `dev.asora.co.za/api/feed*` → Worker `feed-cache`.

Development
- Wrangler config example lives in `wrangler.toml`. Update it to match your account/zone or use the Cloudflare UI to bind env vars and routes.

Smoke tests
- Unauthed: `curl -s -D - https://dev.asora.co.za/api/feed -o NUL` → `Cache-Control: public, max-age=60`.
- Authed: `curl -s -D - -H "Authorization: Bearer TEST" https://dev.asora.co.za/api/feed -o NUL` → `Cache-Control: private, no-store`.

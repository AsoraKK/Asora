Feed Caching at the Edge (Cloudflare)

Goal
- Cache anonymous GET `/api/feed` responses for 30 seconds with `stale-while-revalidate=60`.
- Add `X-Cache: HIT|MISS|BYPASS`; bypass when `Authorization` header present.

Worker
- File: `cloudflare/worker.ts`
- Behavior:
  - Matches `GET /api/feed*`.
  - If `Authorization` present or `FEED_CACHE_ENABLED` != true → proxy with `X-Cache: BYPASS` and `Vary: Authorization`.
  - Else: Build normalized cache key from URL with only `page`, `pageSize`, `timeWindow` params (sorted); strip others.
  - On cache hit: return with `X-Cache: HIT`.
  - On miss: fetch origin, set `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` and `Vary: Authorization`, store in cache, return with `X-Cache: MISS`.

Config
- `cloudflare/wrangler.toml` — set your `routes` and zone.
- `FEED_CACHE_ENABLED=true` to enable caching.
- Origin: point your Cloudflare route to the domain fronting the Functions app (custom domain recommended).

Validation
- Script: `scripts/cf-validate.sh`
  - Requires `CF_URL` env pointing to your Cloudflare‑fronted base URL.
  - Asserts MISS → HIT on two consecutive requests; BYPASS when `Authorization` present.

App Hints (optional)
- The worker sets edge cache headers; origin can also return `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` for `/api/feed`.

Troubleshooting
- Ensure Cloudflare route matches `/api/feed*` and Worker is bound to the zone.
- Confirm no other workers or CDN settings override caching behavior.
- For debugging, print `X-Cache` and `CF-RAY` headers in client logs.

Cache Key Rules
- Only `page`, `pageSize`, `timeWindow` differentiate feed cache.
- Parameter order is normalized (sorted), preventing duplicate keys.


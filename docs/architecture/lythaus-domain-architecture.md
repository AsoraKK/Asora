# Lythaus domain architecture

ADR-005 is authoritative for public-domain decisions. Internal Azure resources may retain Asora names but are never emitted to browsers, OpenAPI production servers, marketing output, public email, or public documentation.

## Request paths

| Client | Public entry | Edge | Origin |
|---|---|---|---|
| Marketing/browser | `https://lythaus.co/*` | Cloudflare Pages | Static Astro artifact |
| Flutter web | `https://app.lythaus.co/*` | Cloudflare Pages SPA fallback | Static Flutter artifact |
| Mobile/web API | `https://api.lythaus.co/api/*` | Lythaus API gateway Worker | Environment-specific Azure Functions origin |
| Admin browser | `https://admin.lythaus.co/*` | Access + Pages | Control-panel artifact |
| Admin API | `https://admin-api.lythaus.co/api/*` | Access/gateway | Azure Functions plus server-side roles |

Staging uses `staging.lythaus.co`, `app.staging.lythaus.co`, `api.staging.lythaus.co`, `admin.staging.lythaus.co`, and `admin-api.staging.lythaus.co`.

## Gateway contract

The prepared gateway is `cloudflare/api-gateway/worker.ts`. It requires `EXPECTED_HOSTNAMES`, `ORIGIN_BASE`, `ORIGIN_AUTH_TOKEN`, exact `CORS_ALLOWED_ORIGINS`, a rate-limit KV binding, and `RATE_LIMIT_REQUIRED=true` in staging/production. `ORIGIN_AUTH_TOKEN` is a Worker secret, never a Wrangler plain variable.

The gateway preserves the incoming `/api/*` path and client authorization headers, removes spoofable internal headers, generates or propagates a safe correlation ID, hides Azure response headers, and returns controlled errors. Requests with `Authorization` or `Cookie` are never anonymous/cacheable. No gateway decision replaces origin-side user authorization.

Azure enables `ORIGIN_GATEWAY_AUTH_REQUIRED=true` only after the staging proxy and emergency direct-access plan are proven. The origin compares a SHA-256 digest of the supplied and expected token with `timingSafeEqual` before normal handlers run. Azure SCM is not affected by the application-level hook.

## Routing invariants

- Marketing and app Pages projects are separate and must be positively identified before attaching domains.
- `www.lythaus.co` redirects to the apex while preserving path and query.
- `/auth/callback` remains on the app origin.
- `web/_redirects` provides the Flutter SPA fallback.
- `status.lythaus.co` and `media.lythaus.co` stay absent until real providers/origins exist.
- Legacy APIs use compatibility proxying; public legacy GET pages use a reviewed path map.

## Current state

The 2026-07-13 audit is `NO-GO`: provider configuration was not auditable because the read-only Cloudflare token and account identifier were absent. Public observations show Cloudflare delegation but no serving `lythaus.co` records. This document describes the approved target, not a completed cutover.

# Lythaus domain architecture

ADR-005 is authoritative. Internal Azure resources retain Asora names; the sole authorised backend is operationally the **Lythaus MVP shared environment**.

## Request paths

| Client | Public entry | Edge | Origin |
|---|---|---|---|
| Marketing/browser | `https://lythaus.co/*` | Cloudflare Pages | Static Astro artifact |
| Flutter web | `https://app.lythaus.co/*` | Cloudflare Pages SPA fallback | Static Flutter artifact |
| Mobile/web API | `https://api.lythaus.co/api/*` | Lythaus API gateway Worker | Existing `asora-function-dev` Function App |
| Admin browser | `https://admin.lythaus.co/*` | Access + Pages | Control-panel artifact |
| Admin API | `https://admin-api.lythaus.co/api/*` | Access/gateway | Existing Function admin routes plus server roles |

No permanent staging hostname or separate Azure staging/production origin exists. Preview validation uses exact ephemeral Pages and Worker URLs against the shared origin. Production clients and browser artifacts never receive the Azure hostname.

## Gateway contract

`cloudflare/api-gateway/worker.ts` requires `EXPECTED_HOSTNAMES`, `ORIGIN_BASE`, `ORIGIN_AUTH_TOKEN`, exact `CORS_ALLOWED_ORIGINS`, a rate-limit KV binding, and `RATE_LIMIT_REQUIRED=true`. `ORIGIN_AUTH_TOKEN` is a Worker secret. `ORIGIN_BASE` is an internal Worker variable with no default.

The gateway preserves `/api/*`, removes spoofable internal headers, generates or propagates correlation IDs, hides Azure response headers, and returns controlled errors. Requests with `Authorization` or `Cookie` are never anonymous/cacheable. Origin-side authorization remains authoritative.

Azure progresses from `ORIGIN_GATEWAY_AUTH_MODE=observe` through time-bounded `dual` to `enforce` only after the preview proxy, monitoring, deployment, rollback, and emergency direct-access path are proven. `off` is rejected in MVP/production. The origin compares SHA-256 digests with `timingSafeEqual`; SCM deployment traffic is not affected.

## Operational invariants

- Exact Pages/Worker preview URLs are supplied explicitly; no permanent preview DNS is created.
- `www.lythaus.co` redirects to the apex with path/query preservation.
- `/auth/callback` remains on `app.lythaus.co`.
- The Flutter Pages project retains the SPA fallback.
- Shared-MVP test data is tagged and isolated; destructive and chaos paths fail closed.
- Database changes require backup and rollback evidence.
- Legacy API hosts use compatibility proxying; public legacy GET pages use a reviewed map.
- `status.lythaus.co` and `media.lythaus.co` remain absent.

## Current state

The repository now contains the mode-based Azure origin guard, token-injecting
public/legacy/admin gateway definitions, and gateway-only operational tooling.
Those changes are not proof of a live deployment. The shared Azure origin is
still directly public until the exact candidate, distinct Key Vault-backed
tokens, Worker preview, legacy compatibility routes, Access policy, browser
authentication, and rollback rehearsal are proven together.

Cloudflare audit evidence is available under `docs/evidence/cloudflare/`, but
the target custom domains remain unbound. A credential-type repository variable
was found during configuration review; it must be rotated and removed before
any provider-side rehearsal. The cutover remains `NO-GO`.

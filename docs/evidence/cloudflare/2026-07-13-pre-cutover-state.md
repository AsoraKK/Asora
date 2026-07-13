# Pre-cutover state - 2026-07-13

## Decision

`NO-GO`. Production DNS, custom domains, redirects, certificates, and Access bindings were not changed.

## Repository

- Base: `codex/alpha-release-candidate` at `0cb3ffdeca506e891553c74b9e8b66de8f60890b`.
- Migration: `codex/lythaus-domain-migration`; validated code candidate `dd2b386f8f630fd3585dbd864decaa475e6af3d5`.
- PR 452 and PR 453 remain open and draft; PR 453 remains stacked.
- The captured 52-file conflict map is intentionally not repeatedly reconciled while PR 452 is open.

## Cloudflare

- `lythaus.co`: active and authoritative; DNSSEC active; SSL Full; Universal SSL active; no target DNS records.
- `asora.co.za`: active and authoritative; DNSSEC disabled; SSL Strict; existing legacy DNS/Pages/Worker/Access routing retained.
- Seven registrar, Bulk Redirect, and managed-ruleset detail reads remain HTTP 403.
- Exact previews:
  - Marketing: `https://b1e30d74.lythaus-marketing.pages.dev`.
  - Flutter: `https://7ca0cf37.lythaus-web.pages.dev`.
  - Gateway: `https://lythaus-api-gateway-preview.asora.workers.dev`, version `efdf...1801`.
- Target admin Access applications and wildcard control-panel preview protection exist without target DNS bindings.

## Azure MVP origin

- Current package after rollback: `0cb3ffdeca506e891553c74b9e8b66de8f60890b`.
- Exact preview CORS and OAuth callback remain temporarily configured.
- Origin token is set redacted; enforcement is absent because global enforcement would block active legacy traffic.
- Direct and Worker health return HTTP 200.
- Live OpenAPI acceptance fails on the moderation appeal error schema.

Raw provider responses and the emergency rollback package remain under gitignored `.artifacts/cloudflare-audit/`.

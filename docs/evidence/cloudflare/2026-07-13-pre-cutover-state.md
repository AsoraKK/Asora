# Pre-cutover state - 2026-07-13

## Decision

`NO-GO`. The Cloudflare token verified active and the account was audited read-only. Required registrar, Bulk Redirect, and managed-ruleset detail reads returned HTTP 403. No live Cloudflare or Azure traffic change was applied.

## Repository

- Base: `codex/alpha-release-candidate` at `0cb3ffdeca506e891553c74b9e8b66de8f60890b`.
- Migration branch: `codex/lythaus-domain-migration`.
- PR 452: open draft; migration remains stacked on its head.
- Migration scope: 136 paths, including 52 overlaps with PR 452.

## Cloudflare zones

- `lythaus.co`: active/full, DNSSEC active, SSL Full, Universal SSL active, zero DNS records, minimum TLS 1.0, Always Use HTTPS off, HSTS off.
- `asora.co.za`: active/full, DNSSEC disabled, SSL Strict, Universal SSL active, 20 DNS records, minimum TLS 1.0, Always Use HTTPS on, HSTS off.
- Registrar and Bulk Redirect state: `UNKNOWN` due HTTP 403.

## Current routing

- Asora apex and `www` are proxied CNAMEs to the Azure Function and return HTTP 200 without redirecting.
- `app.lythaus.asora.co.za` is attached to Pages project `lythaus-web`.
- `control.asora.co.za` is attached to Pages project `asora` and has an Access application.
- `admin-api.asora.co.za` is a proxied Azure CNAME with an Access application and returns HTTP 302 to Access.
- `dev.asora.co.za/api/feed*` routes to Worker `feed-cache`.
- `control.asora.co.za/api/*` routes to Worker `control-api-proxy`.
- No Lythaus target hostname has DNS, a Pages custom domain, a Worker route/custom domain, or Access protection.

## Pages rollback references

- Flutter production: deployment `7155...91ee`, commit `d2d251edcfc8742649fdc9a09860e2c92f5f60e3`.
- Control panel production: deployment `8bfd...c7e2`, same commit.
- Exact PR 453 previews: Flutter `57f2...7736`; control panel `d59f...77e2`.

## Worker rollback references

- `feed-cache`: `caa3...fd40`.
- `control-api-proxy`: `4b6c...4f4e`.
- `asora-feed-edge-development`: `538f...476c`.
- Target API gateway: not deployed.

## Azure MVP origin

- `asora-function-dev` remains the single authorised Lythaus MVP shared environment.
- Health/readiness return HTTP 200.
- The current deployment matches PR 452, not PR 453.
- Lythaus CORS and origin-token enforcement are absent.
- Direct-origin public access remains enabled.

Raw Cloudflare responses are under gitignored `.artifacts/cloudflare-audit/`; committed evidence contains no token, raw TXT value, Access secret, JWT, cookie, or Azure secret.

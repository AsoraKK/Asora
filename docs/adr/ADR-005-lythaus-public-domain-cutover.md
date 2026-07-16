# ADR-005: Lythaus public-domain cutover

## Status

Accepted single-environment MVP architecture; public cutover remains blocked by the 2026-07-13 `NO-GO` audit.

## Context

Lythaus (formerly Asora) needs stable public domains without funding duplicate infrastructure before the MVP proves successful. The existing Azure Function App `asora-function-dev` is the only authorised MVP backend. Its internal name remains unchanged, but operationally it is the **Lythaus MVP shared environment**, not disposable development infrastructure.

## Decision

| Hostname | Purpose | Platform |
|---|---|---|
| `lythaus.co` | Marketing, legal, invite, and share surfaces | Cloudflare Pages |
| `www.lythaus.co` | Path/query-preserving permanent redirect | Cloudflare redirect rule or equivalent |
| `app.lythaus.co` | Flutter web application | Existing Cloudflare Pages project |
| `api.lythaus.co` | Public API at `/api` | API gateway Worker to `asora-function-dev` |
| `admin.lythaus.co` | Internal control panel | Existing Pages project plus Access |
| `admin-api.lythaus.co` | Restricted administration API | Access/gateway to existing Function admin routes |
| `status.lythaus.co`, `media.lythaus.co` | Reserved | Unconfigured until real providers/origins exist |

The canonical API base remains `https://api.lythaus.co/api`. Authentication uses `/api/auth/authorize`, `/api/auth/token`, and `/api/auth/userinfo`, with `https://app.lythaus.co/auth/callback`. This ADR does not introduce `/v1` or `auth.lythaus.co`.

The environment model is:

| Class | Purpose | Permanent public hostname |
|---|---|---|
| Local | Local Flutter and local Functions where supported | None |
| Preview | Exact Cloudflare Pages preview plus temporary Worker preview, both using the shared MVP origin | None |
| MVP live | Official Lythaus domains using the shared MVP origin | Lythaus target hostnames above |

There is no permanent Lythaus staging hostname, separate Azure staging/production Function App, or separate staging/production database. Creating separate infrastructure is a future scale/reliability decision, not a domain-cutover prerequisite.

MVP live public values are:

| Variable | Value |
|---|---|
| `WEB_BASE_URL` | `https://app.lythaus.co` |
| `API_BASE_URL` | `https://api.lythaus.co/api` |
| `AUTH_URL` | `https://api.lythaus.co/api` |
| `ADMIN_API_URL` | `https://admin-api.lythaus.co/api` |
| `MARKETING_BASE_URL` | `https://lythaus.co` |

Preview values are exact per-deployment Pages/Worker URLs supplied explicitly at build or dispatch time. They have no repository fallback.

`asora.co.za` remains a defensive legacy domain. Public GET pages redirect through a reviewed path map. Active legacy APIs use a method/body-preserving compatibility proxy with deprecation metadata and are never blindly redirected.

## Supersession

This ADR supersedes ADR-003 sections 3 and 5 for public API/administration traffic and supersedes any active document that requires separate staging or production Azure resources. ADR-003 decisions for branding, internal resource names, `com.asora.app`, native URI schemes, `asora-auth`, user IDs, privacy, moderation, and data architecture remain in force.

## Security and rollout

- The gateway accepts exact configured hostnames, preserves `/api/*`, has no fallback origin, strips spoofable headers, adds a secret origin token, applies exact CORS, and defaults to `private, no-store`.
- Only credential-free anonymous `GET /api/feed/discover` may be cached.
- Preview validation uses an exact Pages preview and temporary Worker deployment without production DNS changes.
- Azure origin enforcement is enabled only after preview health, monitoring, deployment, and emergency access are proven.
- Shared-MVP load or chaos tests require explicit workflow approval variables.
- Functions deploy only exact CI artifacts and preserve a restorable previous package.
- Provider writes require separate authorization after review of the audit/change plan.

## Consequences

The MVP avoids duplicate Azure cost but concentrates development and user traffic on one backend. Migrations need backups and rollback, test data must remain isolated, destructive/debug surfaces must fail closed, and casual load testing is prohibited. Internal Asora identifiers remain intentional and must never leak into public clients or errors.

## References

- [Domain architecture](../architecture/lythaus-domain-architecture.md)
- [Cutover runbook](../runbooks/lythaus-domain-cutover.md)
- [Asora retirement runbook](../runbooks/asora-domain-retirement.md)
- [Cloudflare/domain audit](../evidence/cloudflare/2026-07-13-lythaus-domain-audit.md)
- [Azure MVP audit](../evidence/cloudflare/2026-07-13-azure-mvp-audit.md)

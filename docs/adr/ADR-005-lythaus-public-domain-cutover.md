# ADR-005: Lythaus public-domain cutover

## Status

Accepted target architecture; production cutover blocked by the 2026-07-13 `NO-GO` audit.

## Context

Lythaus (formerly Asora) still exposes a mixture of Azure Functions hosts, Cloudflare Pages development hosts, and `asora.co.za` names in public configuration. The product requires one stable public namespace while internal Azure resources, package identifiers, native schemes, JWT issuer, repository name, and database identifiers retain the Asora codename.

## Decision

| Hostname | Purpose | Platform |
|---|---|---|
| `lythaus.co` | Marketing, legal, invite, and share surfaces | Cloudflare Pages |
| `www.lythaus.co` | Path/query-preserving permanent redirect to the apex | Cloudflare Redirect Rule or equivalent |
| `app.lythaus.co` | Flutter web application | Cloudflare Pages |
| `api.lythaus.co` | Public application API | Cloudflare Worker gateway to Azure Functions |
| `admin.lythaus.co` | Internal control panel | Cloudflare Pages plus Access |
| `admin-api.lythaus.co` | Restricted administration API | Worker/Azure origin plus Access and server roles |
| `status.lythaus.co` | Reserved | Not configured until a provider is selected |
| `media.lythaus.co` | Reserved | Not configured until an origin exists |

The canonical API base remains `https://api.lythaus.co/api`. Authentication uses `/api/auth/authorize`, `/api/auth/token`, and `/api/auth/userinfo`, with `https://app.lythaus.co/auth/callback`. This ADR does not introduce `/v1` or `auth.lythaus.co`.

Production and staging public build values are:

| Variable | Production | Staging |
|---|---|---|
| `WEB_BASE_URL` | `https://app.lythaus.co` | `https://app.staging.lythaus.co` |
| `API_BASE_URL` | `https://api.lythaus.co/api` | `https://api.staging.lythaus.co/api` |
| `AUTH_URL` | `https://api.lythaus.co/api` | `https://api.staging.lythaus.co/api` |
| `ADMIN_API_URL` | `https://admin-api.lythaus.co/api` | `https://admin-api.staging.lythaus.co/api` |
| `MARKETING_BASE_URL` | `https://lythaus.co` | `https://staging.lythaus.co` |

`asora.co.za` remains a defensive legacy domain. Public GET pages redirect to mapped Lythaus pages. Active legacy APIs use a method/body-preserving compatibility proxy with `Deprecation`, `Sunset`, and successor-link headers; they are not redirected blindly.

## Supersession

This ADR supersedes only ADR-003 sections 3 and 5 that assigned public API and administration traffic to `*.asora.co.za`. ADR-003 decisions for branding, Azure/internal names, `com.asora.app`, native URI schemes, `asora-auth`, user IDs, privacy, moderation, and data architecture remain in force.

## Security and rollout

- The gateway accepts exact configured hostnames, preserves `/api/*`, has no development-origin fallback, strips spoofable internal headers, adds a secret origin token, applies exact CORS, and defaults responses to `private, no-store`.
- Only anonymous credential-free `GET /api/feed/discover` may be cached.
- Azure origin-token enforcement is activated only after staging gateway, health, monitoring, deployment, and rollback paths are proven.
- Cloudflare and Azure changes are staged before production and require sanitized pre-change snapshots.
- The 2026-07-13 audit is `NO-GO`; this ADR does not authorize provider writes by itself.

## Consequences

Public clients and documents gain stable Lythaus URLs. Internal Asora identifiers remain intentionally mixed. Legacy compatibility and rollback temporarily increase operational surface area and require traffic monitoring before retirement.

## References

- [Domain architecture](../architecture/lythaus-domain-architecture.md)
- [Cutover runbook](../runbooks/lythaus-domain-cutover.md)
- [Asora retirement runbook](../runbooks/asora-domain-retirement.md)
- [2026-07-13 audit](../evidence/cloudflare/2026-07-13-lythaus-domain-audit.md)

# Copilot/Codex Quick Context

## Naming
- User-facing product: Lythaus (formerly Asora).
- Internal/infra naming: Asora (repo, Azure resources, Terraform, package IDs).

## Architecture
- Flutter mobile app + Azure Functions backend.
- Cosmos DB for content, flags, appeals, invites; Postgres for auth users.
- Control panel SPA in `apps/control-panel` for admin operations.

## Domains
- `asora.co.za`: platform base (API, control panel).
- `lythaus.co`: marketing and waitlist.

## Launch Gates
- Content states are binary: PUBLISHED or BLOCKED.
- Appeals are the only review mechanism.
- Admin actions are authenticated, audited, and immediate.
- Coverage gate for critical modules; no skipped tests on auth/feed/moderation.

## Public Policy
- No AI scores shown publicly; only allow/block with neutral notices.

# Native Worker capability parity

Status: implementation complete in the repository; deployment gated by
`0010_native_runtime_parity.sql` and the remaining authentication and
Authenticity AI changes.

This comparison treats Cloudflare Workers and PlanetScale PostgreSQL as the
only current runtime. Azure trigger, binding, queue, and SDK behaviour is not a
capability and is not eligible for porting.

| Capability | Native owner | Status |
| --- | --- | --- |
| Email and guest authentication | public API | Live; social providers are removed separately |
| User and profile management | public API | Live; display-name and biography changes emit a moderation event |
| Posts and comments | public API and jobs | Live with tier limits, idempotency, and moderation queueing |
| Discovery and personal feeds | public API | Live |
| Custom feeds | public API | Live with tier-count enforcement |
| Tier enforcement | contracts, public API, admin API | Live through `identity.user_entitlements` and shared policies |
| Editorial and News Board | public API and admin API | Live with preview/full tier policy |
| Moderation and appeals | public API, admin API, jobs | Live |
| Reputation and rewards | public API | Live on PostgreSQL ledgers and redemptions |
| Notifications | public API and jobs | API and durable records live; delivery remains provider-configured |
| Privacy export and deletion | public API and jobs workflows | Live |
| Legal holds | admin API and jobs | Live |
| Media processing | public API and jobs | Live behind the existing default-off release gate |
| Administrative actions | admin API | Live for moderation, account status, tiering, privacy, editorial, and audit |
| Audit logging | admin API and jobs | Live in `system.audit_events` |
| Rate limits | public and admin APIs | Live using PostgreSQL atomic windows |

## Functions deletion gate

The Functions workspace may be deleted after all of these repository gates
pass:

1. PostgreSQL 17 validates migration `0010_native_runtime_parity.sql` from the
   exact approved baseline.
2. Lythaus Authenticity AI replaces the remaining Hive implementation in the
   jobs Worker.
3. Google, Apple, World ID, and provider-only OAuth callback paths are removed.
4. Native type checking, architecture tests, migration validation, OpenAPI
   checks, Flutter tests, and both frontend builds pass.

Migration `0010` is repository-only in this change. It has not been applied to
PlanetScale `main`.

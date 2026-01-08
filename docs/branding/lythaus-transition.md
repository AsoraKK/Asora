# Lythaus Brand Transition Guide

> **For agents (Copilot, Codex, etc.):** When generating code, use **Lythaus** for UI labels, store listing text, and website copy. Do **not** rename Azure resources, internal service names, or the repository without an explicit task.

## Status

**Effective:** January 2026

---

## Beta Launch Definition ✓

Beta launch is complete when **all** of the following are true:

| Criterion | Requirement |
|-----------|-------------|
| **Android distribution** | Closed Test track on Google Play |
| **iOS distribution** | TestFlight external (or internal-only if Apple review blocks) |
| **In-app branding** | Lythaus name, icon, splash screen, UI copy |
| **Invite flow** | End-to-end: redeem code → activate account → create post |
| **Core features** | Feed, posting, moderation, appeals work reliably |
| **Observability** | Crash reporting, basic monitoring, analytics events for onboarding + moderation outcomes |
| **Store listing** | Includes test invite code and reviewer access instructions |

> Backend/service names remain **Asora** internally—this does not block beta.

---

## Naming Decisions (Locked)

These decisions are **locked** to prevent rework. Do not change without explicit product approval.

### 2.1 App Identifiers (Bundle IDs / Package Names)

**Decision: Keep `com.asora.app` for beta.**

| Platform | Identifier | Status |
|----------|------------|--------|
| Android | `com.asora.app` | ✅ Locked for beta |
| iOS | `com.asora.app` | ✅ Locked for beta |
| macOS | `com.asora.app` | ✅ Locked for beta |

**Rationale:**
- No public release yet, but changing now would ripple across:
  - OAuth redirect URIs (Azure B2C, Google Sign-In)
  - Deep link handling (Universal Links, App Links)
  - Firebase project configuration
  - Apple App ID & provisioning profiles
  - Keychain access groups
- Post-beta migration to `com.lythaus.app` is possible but requires coordinated migration task.

**Agent rule:** Do not modify `applicationId`, `PRODUCT_BUNDLE_IDENTIFIER`, or related OAuth configs without explicit task.

### 2.2 Environments + Endpoints

**Decision: API base URL remains `*.asora.co.za` for beta.**

| Component | Value | Change? |
|-----------|-------|---------|
| API base URL | `https://api.asora.co.za/v1/...` | ❌ No change |
| Functions host | `asora-function-dev.azurewebsites.net` | ❌ No change |
| JWT issuer claim | Azure B2C tenant (unchanged) | ❌ No change |
| User IDs | UUIDv7 strategy (per ADR-002) | ❌ No change |
| DB schemas | Cosmos containers, Postgres tables | ❌ No change |

**Confirmed:**
- Lythaus branding does **not** change JWT claims, user IDs, or database schemas.
- UUIDv7 strategy from ADR-002 remains intact.
- No breaking changes to auth flows or data models.

---

## Brand Rules

| Context | Use This Name | Notes |
|---------|---------------|-------|
| User-facing strings (app UI, onboarding) | **Lythaus** | Buttons, headings, dialogs, notifications |
| Store listings (App Store, Play Store) | **Lythaus** | Title, description, screenshots |
| Marketing site & landing pages | **Lythaus** | lythaus.co |
| Email templates & transactional comms | **Lythaus** | "Welcome to Lythaus" |
| Backend services, APIs, repos | **Asora** | Keep internal naming intact |
| Azure resource names | **asora-\*** | No rename—ARM/IaC references stay unchanged |
| Terraform modules & IaC | **asora** | Avoid churn in infra code |
| Package identifiers (com.asora.app) | **asora** | Rename is a major version change—defer |

### Allowed Transition Phrases

When historical context is needed:

- "Lythaus (formerly Asora)"
- "Lythaus, built on the Asora platform"

Do **not** use "Asora" in any new user-facing copy.

---

## Domain Matrix

| Domain | Purpose | Status |
|--------|---------|--------|
| **asora.co.za** | Platform base: API endpoints, admin portals, Functions host | Active—do not change |
| **lythaus.co** | Marketing site, waitlist, invite links, public landing | Primary public-facing |
| **asora.co** | Legacy/redirect | Future: 301 → lythaus.co |

### URL Examples

```
Production API:      https://api.asora.co.za/v1/...
Marketing home:      https://lythaus.co
Waitlist signup:     https://lythaus.co/waitlist
Invite deep-link:    https://lythaus.co/invite/{code}
```

---

## What Must NOT Be Renamed (Without Explicit Task)

1. **Repository name** — `AsoraKK/Asora` (GitHub)
2. **Azure resource names** — `asora-function-dev`, `asora-psql-flex`, `kv-asora-dev`, etc.
3. **Terraform state & modules** — references in `infra/`
4. **Package identifiers** — `com.asora.app` (iOS/Android bundle IDs)
5. **Internal Dart/TS imports** — `package:asora/...`
6. **CI/CD workflow filenames** — `deploy-asora-function-dev.yml`

---

## Redirect Strategy (Future)

When ready to unify domains:

| From | To | Type |
|------|----|------|
| asora.co | lythaus.co | 301 Permanent |
| asora.co.za/app | lythaus.co/download | 301 Permanent |

Implementation deferred until marketing launch.

---

## Agent Instructions

```markdown
<!-- For Copilot / Codex context -->
## Branding Quick Reference

- **UI labels, store text, website copy** → Lythaus
- **Backend code, infra, repo, Azure resources** → Asora (unchanged)
- Never auto-rename Azure resources, Terraform state, or package IDs.
- Reference this file: docs/branding/lythaus-transition.md
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-08 | Added beta readiness hardening checklist |
| 2026-01-08 | Added beta launch definition, locked app identifier decision (`com.asora.app`), confirmed API/JWT/schema unchanged |
| 2026-01-08 | Initial brand transition documentation |

---

## Related Documents

- [Asset Replacement Checklist](asset-replacement-checklist.md) — Icons, splash screens, store assets
- [Beta Readiness Hardening](beta-readiness-hardening.md) — Performance, security, observability requirements
- [ADR-003: Brand Rename](../adr/ADR-003-brand-rename-lythaus.md) — Architecture decision record
- Control Panel Dashboard — Live tracking of beta readiness metrics

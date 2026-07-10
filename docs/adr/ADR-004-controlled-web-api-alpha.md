# ADR-004: Controlled Web/API Alpha

Status: Accepted
Date: 2026-07-10
Decision owner: Kyle
Applies to: Lythaus web, APIs, moderation/control panel, and Alpha operations

## Context

Active code and repository documents had incompatible launch assumptions: an Alpha minimum of 20,000 users, mobile-store gates, universal News Board access, public/internal AI metadata mixed together, an absolute ban on AI-generated content, binding community appeal votes, and deployment workflows that rebuilt after CI. Those assumptions cannot form a controlled, reversible Alpha.

## Decision

### Cohort and platform

- Alpha is invite-only, web/API-only, time-bounded, measured, reversible, and capped at 250 accounts.
- `technical_alpha` permits at most 50 accounts, `controlled_alpha` at most 100, and `expanded_alpha` at most 250.
- `paused` and `closed` permit no new membership.
- Stage changes require an authenticated Kyle-approved admin configuration update. Metrics never promote a stage automatically.
- Android, iOS, Firebase distribution, signing, TestFlight, and Play Console are Beta scope.

### AI authorship

- Public labels are exactly `Human-authored`, `AI-assisted`, `AI-generated`, or `Under review`.
- Public responses expose categorical label, declaration, provenance, review/appeal state, label version, and timestamps only.
- Hive is the only Alpha authorship classifier. Numeric scores, thresholds, raw vendor responses, model reasoning, and risk signals remain internal.
- A declaration is required at creation and again when content or media changes.
- Disclosed AI-assisted and AI-generated content may publish unless it violates a prohibited-content rule. AI-generated content receives no positive reputation award.
- A human declaration that conflicts with Hive, or unavailable classification under the configured safe mode, enters `Under review`.
- Community voting is advisory. Only an authorized human finalization records the final label and moderation action. Safety or legal requirements cannot be overridden by a vote.

This amends the earlier manifesto/policy interpretation that all AI-generated content is prohibited. The prohibition now applies to undisclosed, deceptive, prohibited, or otherwise policy-violating AI content, not to every disclosed generation workflow.

### Commercial tiers

- Commercial tiers are `Free`, `Premium`, and `Black`.
- `Admin` is an authorization role only.
- Free receives News Board preview, Premium and Black receive full News Board access.
- Backend entitlements are authoritative; JWT or client state cannot raise a tier.
- Paid Alpha tiers are manual audited grants with reason, review date, and expiry. No working payment system is represented.

### Operations

- Kyle is the sole human operator for Alpha.
- An operational AI may read sanitized telemetry, correlate alerts, prepare reports, and run bounded read-only diagnostics.
- Deployment, rollback, cohort expansion, credential changes, access-policy changes, threshold changes, bulk moderation, schema changes, user-data deletion outside authenticated DSR, and destructive infrastructure actions require Kyle approval.
- Critical functions have audited flags and a read-only mode. Missing or invalid Alpha configuration fails closed.

### Performance and release integrity

- The representative warm feed target remains p95 below 200 ms, p99 below 400 ms, and error rate below 1%.
- Cold-start results are reported separately and do not replace the warm target.
- No target amendment is accepted by this ADR. If the target cannot be met, a separate measured amendment and Kyle approval are required.
- CI, artifact build, deployment, live contracts, browser smoke, and release evidence must refer to the same full commit SHA.
- Deployment workflows consume CI artifacts and do not rebuild.

## Implementation status

| Area | State | Source of truth |
| --- | --- | --- |
| Cohort caps and feature flags | Live in code; migration not yet applied to an approved Alpha deployment | `functions/src/alpha/alphaConfig.ts` |
| Invite hashing and revocation | Live in code; deployment verification pending | `functions/src/auth/service/inviteStore.ts` |
| Authorship model | Live in code; deployment verification pending | `functions/src/shared/authorship.ts` |
| Tier entitlements | Live in code; deployment verification pending | `functions/src/shared/services/tierLimits.ts` |
| Exact-SHA deployment | Live in workflow source; not executed for this candidate | `.github/workflows/deploy-asora-function-dev.yml` |
| Feed target | Failed on current dev baseline; exact candidate not measured | `docs/evidence/alpha-readiness/2026-07-10-feed-performance.md` |
| Mobile launch readiness | Deferred to Beta | `docs/alpha/deferred-beta-register.md` |

## Consequences

- Current dev or old evidence cannot authorize launch.
- Missing rotation verification, exact-SHA CI, strict live contracts, performance proof, DSR regression, rollback drill, or browser smoke produces NO-GO.
- Historical evidence remains available but must be marked superseded when it conflicts with this decision.

# ADR-006: Lean shared-MVP infrastructure

- Status: Accepted
- Date: 2026-07-17
- Scope: Lythaus shared-MVP Azure environment and repository delivery controls

## Context

Lythaus (formerly Asora) runs on one shared MVP Azure environment whose internal resource names retain the Asora codename. The repository contains multiple generations of Terraform and deployment workflows. Some describe resources that are not live, while some live resources are not safely reconciled to readable canonical Terraform state.

Cost reduction must not weaken privacy processing, authentication, moderation, security monitoring, or rollback. The live DSR queue processor previously required an always-ready Flex Consumption instance to recover reliable queue delivery.

## Decision

1. DSR request processing remains immediate and queue-triggered. It is never converted into a timer batch.
2. `privacyDsrQueueMonitor` uses `DSR_MONITOR_SCHEDULE`. The shared-MVP fallback is `0 0 */8 * * *` (00:00, 08:00, and 16:00 UTC). A future production environment must use an independently configured schedule of at least hourly.
3. `function:privacyDsrProcessor=1` remains in place until five independent scale-from-zero tests pass after a genuine idle period, with poison, duplicate, latency, and rollback evidence.
4. The Azure Functions host is the authoritative automatic request/dependency/exception instrumentation layer. The application SDK is retained for deliberate custom metrics, events, dependencies, and exceptions, but its automatic collectors and per-event flushes are disabled.
5. Permanent analytics telemetry excludes user, session, and IP-derived identifiers. Temporary verbosity is controlled through environment-specific logging configuration, not code changes.
6. Deployment packages must retain the active package, the newest ten rollback packages, and at least 60 days of history. Automatic lifecycle deletion that cannot prove those protections must not be relied on; cleanup begins with the read-only inventory script.
7. DSR exports retain the approved 30-day period. Lifecycle coverage must include base blobs, snapshots, and previous versions, but no live policy change is allowed until data-plane inventory and the current retention contract are verified.
8. `appi-asora-function-dev-dsr` and `law-asora-dsr-dev-neu` are the canonical shared-MVP telemetry pair. Other Application Insights components are retirement candidates only; none are deleted in this pass.
9. `deploy-asora-function-mvp.yml` delegating to `deploy-asora-function-dev.yml` is the sole authoritative shared-MVP application deployment path.
10. Terraform apply is isolated to a manually dispatched, protected `infrastructure-change` environment. Ordinary application delivery cannot call it. Protected resource creates, replacements, and deletes fail the plan safety gate unless both the protected path and explicit acknowledgement are present.
11. `kv-asora-flex-dev` is the destination for future secrets. Existing Key Vault references remain unchanged until a separate, value-safe migration is approved.
12. PostgreSQL, Cosmos DB, Function/DSR/media storage accounts, and both Key Vaults remain separate and operational.

## Consequences

- Shared-MVP monitor executions fall from 288 per day to three after deployment, without delaying queue processing.
- Duplicate automatic telemetry and routine flush pressure are removed after deployment; exceptions, failed requests, DSR failures, security events, moderation failures, and deployment failures remain available through host or deliberate structured telemetry.
- The current always-ready cost is deliberately retained because removal evidence is incomplete.
- Terraform drift blocks automatic infrastructure apply. Import/reconciliation is required before protected resources can be safely managed from canonical state.
- Storage cleanup may be deferred even where it would reduce capacity because rollback and privacy retention take priority.

## Reconsideration evidence

- Remove DSR always-ready only after the scale-from-zero runbook passes five times and restoration is proven.
- Consolidate or delete telemetry components only after ingestion, alerts, dashboards, and rollback are verified against the canonical component.
- Reconsider PostgreSQL, Cosmos, Key Vault, or storage separation only with measured utilization, migration tests, data-protection review, and a reversible plan.

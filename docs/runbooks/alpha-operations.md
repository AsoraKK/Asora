# Alpha Operations Runbook

Status: Active, approval-gated
Machine-readable source: `docs/runbooks/alpha-operations.yaml`

Kyle is the only human operator. Start every incident by recording UTC time, release SHA, environment, Alpha stage, affected feature, and a sanitized correlation ID. Do not paste secrets or personal data.

## First response

1. Read `/api/health`, current alerts, release manifest, and audited Alpha configuration.
2. Determine whether privacy, authentication, or data integrity is at risk. Those are P0.
3. Preserve evidence and stop promotion. Use existing kill switches only after Kyle approves the configuration change.
4. Run only bounded diagnostics listed in the YAML runbook.
5. Prepare remediation and rollback commands, but do not execute deploy/rollback or destructive actions without Kyle approval.
6. Verify the affected contract, record results, and schedule a short review.

## Runbook index

| Incident | Initial safe action | Approval boundary |
| --- | --- | --- |
| Authentication outage | Probe health and sanitized auth error rates | Auth disablement, JWT rotation, deploy/rollback |
| Feed degradation | Run read-only feed matrix and inspect RU/cache | Ranking/config change, deploy/rollback |
| Cosmos/PostgreSQL failure | Read provider health and bounded dependency metrics | Credential, network, failover, schema changes |
| Redis/cache failure | Verify private/no-store fallback | Worker disablement or global purge |
| DSR queue failure | Inspect depth, poison queue, attempt count | Message deletion, worker restart, deploy |
| Hive outage/false positives | Apply existing configured safe behavior | Threshold/key/failure-mode changes |
| Moderation backlog | Generate aggregate prioritized summary | Bulk action or threshold change |
| Invitation abuse | Disable redemption recommendation; identify invite IDs | Broad revocation or cohort change |
| Credential exposure | Stop promotion and create sanitized register | Provider rotation/revocation |
| Cloudflare outage | Probe origin, DNS, TLS, and Access | DNS/Access/Worker changes |
| Deployment failure/rollback | Verify hashes and last known-good artifact | Deploy or rollback execution |
| Read-only mode | Prepare audited flag change | Enabling or disabling the mode |
| User-data incident | Preserve evidence and stop affected path | Data deletion, notification, access changes |

## Kill-switch verification

When read-only mode is enabled, protected reads must remain available and state-mutating Alpha routes must return a controlled 503. Individual flags cover registrations, invite redemption, posts, comments, reactions, media, AI enforcement, custom feeds, News Board, reputation awards, community voting, and non-essential notifications. Safety and security notifications remain enabled when only non-essential notifications are disabled.

## Evidence

The `Alpha Daily Operations Report` workflow runs at 04:15 UTC and may also be dispatched manually. It uses Azure OIDC, aggregate-only Application Insights queries, read-only admin snapshots, and the deployed `DEPLOYMENT_SHA`. Missing telemetry, partial operations data, feed p95 at or above 200 ms, API errors at or above 1%, DSR failures, or an unknown SHA become explicit operator-attention items. Its JSON and Markdown artifacts contain no raw personal data and authorize no action.

Retain release/artifact hashes, workflow run IDs, UTC timestamps, aggregate metrics, sanitized logs, approval record, configuration versions, verification output, and rollback outcome. Do not retain raw credentials, full tokens, invite codes, provider payloads, or unrelated user records.

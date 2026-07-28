# Approved Azure Cost Changes Closeout

**Date:** 2026-07-12
**Implemented:** AZ-COST-01, AZ-COST-02
**Repo-only:** AZ-COST-04 design
**Live DSR consolidation:** Not applied

## Implemented changes

| Time UTC | Change | Result |
|---|---|---|
| 19:53:44 | Disable `alert-asora-function-dev-health-fail` | Succeeded |
| 19:53:49 | Disable `alert-asora-function-dev-5xx-rate` | Succeeded |
| 19:54:18 | Enable seven-day blob soft delete on `asoraflexdev1404` | Succeeded |
| 19:54:21 | Add `delete-old-function-deployments` lifecycle rule | Succeeded |

The lifecycle rule applies only to block blobs with prefix `deployments/` and deletes them after 30 days. It does not match `azure-webjobs-hosts`, `azure-webjobs-secrets`, DSR storage, or DSR export blobs.

## Protected settings

| Setting/resource | Post-change state |
|---|---|
| PostgreSQL | `Ready`, `Standard_B1ms`, 32 GB |
| Function memory | 2,048 MB |
| DSR always-ready | `function:privacyDsrProcessor=1` |
| DSR queue | `dsr-requests` via `DsrQueueStorage` |
| DSR queue account | `stasoradsrdev` |
| DSR export account/container | `stasoradsrdev` / `dsr-exports` |
| DSR lifecycle | Existing `dsr-export-lifecycle` unchanged |

## Validation matrix

| Check | Result | Evidence |
|---|:---:|---|
| `/api/health` | PASS | HTTP 200 |
| `/api/ready` | PASS | HTTP 200 |
| `/api/feed/discover` | PASS | HTTP 200 |
| `https://lythaus-web.pages.dev` | PASS | HTTP 200 |
| Main DSR queue depth | PASS | `0` at 20:00 UTC |
| Stuck queued requests | PASS | `0` at 20:00 UTC |
| Poison queue absent | **FAIL** | queue exists with depth `2` |
| Failed DSR records absent | **FAIL** | persisted failed count `2` |
| New `dsr.queue.failed` events | PASS | `0` in prior 24 hours |
| Five DSR rules enabled | PASS | all enabled, five-minute frequency, active DSR scope |
| DSR action group | PASS | enabled with one email receiver |
| Poison/failure rule firing | **FAIL** | live KQL evaluates true, but Alerts Management shows no active poison/failure alert |
| Legacy alerts disabled | PASS | both disabled and still scoped to inactive legacy App Insights |
| Lifecycle prefix isolation | PASS | only `deployments/`, block blobs, 30 days |
| DSR storage unchanged | PASS | no write to `stasoradsrdev`; existing lifecycle last modified in 2025 |
| Document secret scan | PASS | no suspicious patterns |

## DSR monitoring blocker

At 20:00 UTC, fresh `privacyDsrQueueMonitor` telemetry reported:

- `approximateMessageCount=0`
- `poisonQueueExists=true`
- `poisonApproximateMessageCount=2`
- `stuckQueuedCount=0`
- `failedRequestCount=2`

The current poison and failure KQL queries each return an alerting result, but Alerts Management shows only an older resolved missing-completion alert. No poison/failure alert instance was visible after multiple evaluation intervals.

No poison message was read, modified, or removed. No failed DSR record was changed.

Required follow-up before any live AZ-COST-04 work:

1. Diagnose why the current poison and failure rules do not produce active alert instances/action-group notifications.
2. Safely disposition the two poison messages and two failed DSR records under a separately approved DSR incident procedure.
3. Prove poison and failure notifications end-to-end.
4. Only then review the repo-only three-rule consolidation design.

## Forecast

Azure Cost Management still reports:

| Measure | USD |
|---|---:|
| July actual through available billing data | $15.68 |
| July forecast | $35.55 |

This check occurred minutes after implementation. The forecast does not yet reflect AZ-COST-01 or AZ-COST-02. Recheck after 24–48 hours and again after seven complete billing days.

## Rollback

Re-enable the two alerts:

```powershell
az monitor scheduled-query update -g asora-psql-flex -n alert-asora-function-dev-health-fail --disabled false
az monitor scheduled-query update -g asora-psql-flex -n alert-asora-function-dev-5xx-rate --disabled false
```

Remove only the new host-storage lifecycle policy if rollback is required:

```powershell
az storage account management-policy delete -g asora-psql-flex --account-name asoraflexdev1404
```

Disabling blob soft delete is not recommended merely to roll back cost cleanup. If explicitly required:

```powershell
az storage account blob-service-properties update -g asora-psql-flex -n asoraflexdev1404 --enable-delete-retention false
```

## Repo-only design

See [DSR alert consolidation design](./2026-07-12-dsr-alert-consolidation-design.md). It recommends five-to-three consolidation because a five-to-two design cannot preserve the current Sev1 poison and Sev2 state-alert contract.

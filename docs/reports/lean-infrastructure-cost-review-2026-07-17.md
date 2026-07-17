# Lean infrastructure cost review — 2026-07-17

## Executive result

Repository preparation: **GO**. Live cost mutation: **NO-GO pending drift reconciliation and deployment evidence**.

This pass starts from `origin/main` at `210330340b16a761ea60040964ce635c8191ed37` on `codex/lean-infrastructure-costs`. It implements reversible repository controls and intentionally makes no live Azure write. No saving introduced by this branch is described as realized.

## Scope inspected

- all tracked repository files and infrastructure roots;
- deployment, migration, Terraform, release, monitoring, and secret-scanning workflows;
- Azure Functions registration, `host.json`, DSR processor/monitor/purge, telemetry clients, alerts, Key Vault references, and operator scripts;
- live shared-MVP Function Apps/plans, Application Insights, Log Analytics, scheduled-query alerts, action groups, PostgreSQL, Cosmos DB, storage accounts, lifecycle policies, Key Vault metadata, tags, and sanitized app-setting states;
- Terraform configuration/backend declarations and their relationship to live resources.

No connection string, key, token, secret value, SAS, or publishing credential was read into committed evidence.

## Live inventory summary

| Area | Current evidence | Decision |
|---|---|---|
| Shared MVP Function | `asora-function-dev`, Running, HTTPS-only, Node 22, Flex Consumption, 2048 MB, `function:privacyDsrProcessor=1` | Retain; 1.21 GB prior peak makes memory reduction unsafe |
| Other Function Apps | `asora-function-flex` and `asora-function-consumption` are running but show no current telemetry in the default workspace | Retirement candidates only; ownership/rollback unproven |
| PostgreSQL | `asora-pg-dev-ne`, Ready, B1ms, 32 GB, HA off, 7-day backup | Retain running |
| Cosmos DB | `asora-cosmos-dev`, serverless, continuous 7-day backup | Retain |
| DSR storage | `stasoradsrdev`, versioning enabled; lifecycle covers base blobs/snapshots but not prior versions | Preserve; policy write blocked by missing data-plane inventory |
| Function storage | `asoraflexdev1404`; active package identified; 42 package entries observed | Retain; replace unsafe 30-day cleanup approach only after inventory |
| Media storage | `asoramediadev` | Audit only |
| Canonical telemetry | `appi-asora-function-dev-dsr` → `law-asora-dsr-dev-neu` | Canonical shared-MVP pair |
| Legacy telemetry | Four other components point to the default workspace with no 30-day ingestion observed | Do not delete; retirement candidates |
| Alerts | Five enabled 5-minute DSR alerts; generic health/5xx alerts disabled; one action group | Preserve DSR alerts; do not consolidate while failure-state evidence conflicts |
| Key Vaults | Most app references use `kv-asora-flex-dev`; `EMAIL_HASH_SALT` uses `kv-asora-dev`; duplicate names exist without values read | Keep both; future secrets use flex vault |

## Reconciliation and drift

| Surface | Finding | Risk/control |
|---|---|---|
| `infra/` backend | Backend resources exist, but the backend key illegally references `terraform.workspace` and the authenticated operator lacks Blob Data Reader access | State key and contents UNKNOWN; no plan/apply |
| `infrastructure/` and `database/` backends | Refer to placeholder/nonexistent state storage | Not authoritative; no apply |
| Environment Terraform roots | Dev/staging/prod roots describe additional storage/Cosmos resources and are now explicitly reference-only; stale missing module references and module declarations were repaired for validation | Could create unsupported environments; blocked from ordinary delivery |
| Alerts Terraform | Defaults and enabled rules do not match the live canonical component/rule state | Import/reconcile before apply |
| Full provisioning Terraform | Describes database, Cosmos, Function, plan, storage, and other resources already live under differing names/settings | Protected change guard now blocks unexpected create/replace/delete |
| Deployment workflows | Several stale workflows could provision infrastructure, deploy to nonexistent targets, or mutate a retired staging path | Converted to non-mutating reference-only workflows |
| Authoritative deployment | `deploy-asora-function-mvp.yml` delegates exact-artifact delivery to `deploy-asora-function-dev.yml` | Documented as sole application path |

## Decision table

All dollar values are estimates, not invoices or realized savings.

| Resource/change | Current monthly cost | Proposed action | Expected saving | Operational risk | Development impact | Reversible | Evidence | Decision |
|---|---:|---|---:|---|---|---|---|---|
| Shared-MVP Function | $8.36 July 1–17 actual; $15.24 naive 31-day normalization | Retain always-ready; test scale-from-zero five times | Up to the always-ready portion, UNKNOWN | High privacy risk if removed early | Low after proof | Yes | always-ready 1; prior queue incident | Deferred |
| PostgreSQL | $9.21 July 1–17 actual; $16.80 naive normalization | Keep running B1ms | $0 | High if stopped/changed | None | N/A | live Ready and used | Retain |
| Seven alert resources | $4.02 July 1–17 actual; $7.33 naive normalization | Generic duplicate alerts already disabled; preserve five DSR alerts | Future run-rate lower than normalization, exact saving pending invoice | Low for duplicates; high for DSR | None | Yes | live alert state | Preserve current state |
| Function storage | $2.14 July 1–17 actual; $3.90 naive normalization | Inventory; protect active + newest 10 + 60 days | UNKNOWN; may slightly increase before cleanup | Medium rollback risk | None | Yes | active package and 42 entries | Repository tooling only |
| DSR monitor | Included in Function/telemetry | Reduce monitor from every 5 minutes to 3/day; queue trigger unchanged | 8,835 fewer monitor executions per 31-day month; dollar value UNKNOWN | Low | None | Yes | code/test | Implemented in repo |
| Telemetry duplication | 4.268 GiB AppTraces/30d; 2.642M rows | Disable duplicate Node auto-collectors and per-event flushes | Direct dollars likely low at current volume; UNKNOWN | Low with validation | Better diagnostics signal | Yes | live volume/operation distribution | Implemented in repo |
| Other Function Apps | $0 July 1–17 actual | Establish owner/rollback before stop/delete | $0 at current meter evidence | Medium/high | Unknown | Unknown | no observed telemetry only | Candidate only |
| Legacy App Insights | Low/UNKNOWN | Observe, then retire separately | UNKNOWN | Medium alert/dashboard risk | None | Yes before deletion | zero default-workspace ingestion observed | Candidate only |
| Key Vault consolidation | UNKNOWN | Keep two vaults; future secrets use flex vault | $0 | High migration risk | None | N/A | reference inventory | Rejected now |
| Cosmos removal | Serverless usage-dependent | Keep | $0 | High functionality risk | None | N/A | live active account | Rejected |

## Repository changes

- `DSR_MONITOR_SCHEDULE` now controls the monitor; shared-MVP fallback is three evenly spaced UTC runs per day.
- `privacyDsrProcessor` remains a queue trigger and the daily purge remains unchanged.
- The monitor emits one structured host trace per success and one error trace per failure rather than a duplicate custom event.
- Application SDK auto-collectors are disabled to avoid duplicating Azure Functions host instrumentation.
- Routine telemetry flushes are removed and analytics telemetry excludes user/session/IP-derived identifiers.
- Terraform protected-resource creates, replacements, and deletes fail ordinary plan validation.
- Infrastructure apply is isolated to a manual protected environment with an approval identifier.
- Three obsolete workflows are non-mutating reference paths.
- Deployment package inventory and five-run DSR cold-start scripts are added.

## Deliberately unchanged

- no Azure resources, settings, alerts, policies, plans, packages, or tags were changed;
- no Function App was stopped, scaled, deleted, or recreated;
- `function:privacyDsrProcessor=1` remains;
- PostgreSQL remains running;
- Cosmos DB remains active and serverless;
- storage accounts remain separate;
- Key Vault references, secrets, and vaults remain untouched;
- no Application Insights component or alert was deleted;
- DSR export retention remains 30 days;
- media storage remains unchanged.

## Validation status

| Check | Result |
|---|---|
| Terraform safety unit tests | PASS |
| Workflow YAML syntax | PASS |
| Git diff whitespace check | PASS |
| Functions focused tests | PASS — 22 tests |
| Functions full tests | PASS — 208 suites, 2,279 passed, 18 skipped |
| Functions typecheck/build/package | PASS |
| Terraform fmt | PASS after formatting one existing Cosmos index file |
| Terraform validate | PASS for `infra`, `infrastructure`, Function, alerts, database, and all three reference environment roots |
| Terraform state-backed plan | BLOCKED — invalid dynamic backend key plus unavailable Blob Data Reader access; no apply |
| Terraform apply | Not run and forbidden in this pass |
| Actionlint 1.7.7 | PASS |
| Gitleaks | PASS for the exact staged file set in no-git artifact mode; full-history CI scan pending |
| DSR five-run scale-from-zero | Not run; always-ready intentionally retained |
| Billing realization | Not proven |

## Cost conclusion

Azure Cost Management reports **$23.87 actual cost from July 1 through July 17**. Straight-line normalization produces **$43.54 for 31 days**, but that is only an estimate: two alert rules changed state mid-period, consumption varies, and it is not an invoice. The prior 2026-07-12 normalization was $59.25/month; current meter evidence is therefore materially lower, but no branch-specific causal saving is claimed.

**Realized saving from this branch: $0 confirmed.** The branch prepares lower monitor and telemetry volume after deployment, but billing/meter evidence is required before assigning a dollar saving. The largest potential saving—removing the DSR always-ready allocation—is deliberately deferred.

## Next safe actions

1. Install dependencies and complete the repository validation matrix.
2. Deploy the code through the authoritative exact-artifact shared-MVP workflow.
3. Verify DSR/security/failure telemetry and compare seven days of ingestion.
4. Grant a temporary read-only blob data role to run the package and DSR inventories, then remove it.
5. Reconcile/import canonical Terraform state before any protected apply.
6. Run the approved DSR scale-from-zero procedure; restore always-ready immediately on any failure.

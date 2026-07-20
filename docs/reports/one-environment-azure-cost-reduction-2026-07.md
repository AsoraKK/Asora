# One-environment Azure cost reduction inventory — 2026-07-20

## Decision record

Lythaus (formerly Asora) has **one live Azure environment**. Local development, pull requests, CI, and ephemeral Cloudflare previews do not justify additional Azure estates. Legacy resource names are historical identifiers, not lifecycle decisions.

This is a sanitized, read-only inventory followed by repository-only remediation. No connection string, token, key, secret value, SAS, or publishing credential was read into this report. No Azure resource, alert, retention setting, plan, deployment package, or data was changed during this pass.

Common subscription scope:

```text
/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04
```

All resource IDs below are exact when `S` is expanded to that common scope.

## Evidence and limitations

Executed, read-only:

- `az resource list`, Function App/function inventory, sanitized app-setting reference inventory, Key Vault metadata/secret-name inventory, App Insights and Log Analytics aggregate queries, scheduled-query rule definitions, storage metrics, PostgreSQL/Cosmos configuration, activity-log queries, and role-assignment queries.
- `bash scripts/secret-scan.sh` completed a redacted Gitleaks history scan: **1,495 commits scanned; no leaks found**.
- The canonical DSR timer binding is `0 0 */8 * * *`; the canonical app has `function:privacyDsrProcessor=1` and the queue trigger is registered.

Unavailable:

- Azure Cost Management Query returned `BadRequest: Invalid query definition, Dataset is invalid or not supplied` for the current Microsoft-documented `Usage` query shape and subscription scope.
- Azure Consumption returned resource identities but `None` for pre-tax cost, quantity, and meter detail for this billing profile.

Therefore, the June/July figures supplied for this operation are retained as historical billing evidence. No new meter saving is claimed until Cost Management exposes a usable actual-cost query or invoice export.

## Current architecture

| Resource ID | Type / region / SKU | Current evidence | Decision |
|---|---|---|---|
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev` | Function App / North Europe / Flex Consumption | Running, HTTPS-only, Node 22, 2,048 MB, max 100, complete function set, active telemetry, canonical workflow target | **CANONICAL** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/serverfarms/asora-flex-plan-new` | Hosting plan / North Europe / FC1 | Bound to canonical Function App | **CANONICAL** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-flex` | Function App / North Europe / Flex Consumption | Running, HTTP allowed, Node 20, 2,048 MB, no functions, zero telemetry; retains legacy Key Vault references | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/serverfarms/ASP-asorapsqlflex-4a5f` | Hosting plan / North Europe / FC1 | Bound only to `asora-function-flex` | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-consumption` | Function App / North Europe / Y1 | Running, HTTP allowed, one legacy health function, zero telemetry | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/serverfarms/NorthEuropeLinuxDynamicPlan` | Hosting plan / North Europe / Y1 | Bound only to `asora-function-consumption` | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.DBforPostgreSQL/flexibleServers/asora-pg-dev-ne` | PostgreSQL Flexible Server / North Europe / Standard_B1ms | Ready, PostgreSQL 16, 32 GB Premium LRS P4, HA off, seven-day backup, public endpoint restricted by application policy | **CANONICAL** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.DocumentDB/databaseAccounts/asora-cosmos-dev` | Cosmos DB / North Europe / serverless | One-region serverless account, Session consistency | **CANONICAL** |
| `S/resourceGroups/asora-psql-flex/providers/microsoft.insights/components/appi-asora-function-dev-dsr` | Application Insights / North Europe / workspace-based | Only component with current telemetry; linked to canonical workspace | **OPTIMISE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.OperationalInsights/workspaces/law-asora-dsr-dev-neu` | Log Analytics / North Europe / PerGB2018 | Canonical workspace; 30-day workspace setting but principal tables retain 90 days; no daily cap | **OPTIMISE** |
| `S/resourceGroups/DefaultResourceGroup-NEU/providers/Microsoft.OperationalInsights/workspaces/DefaultWorkspace-99df7ef7-776a-4235-84a4-c77899b2bb04-NEU` | Log Analytics / North Europe / PerGB2018 | Linked only to four legacy Insights components; their aggregate query returned zero events | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/microsoft.insights/components/appi-asora-dev` | Application Insights / North Europe | Zero events; linked to default workspace | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/microsoft.insights/components/asora-function-dev` | Application Insights / North Europe | Zero events; linked to default workspace | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/components/asora-function-flex` | Application Insights / North Europe | Zero events; linked to default workspace | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/components/asora-function-consumption` | Application Insights / North Europe | Zero events; linked to default workspace | **MIGRATE-THEN-RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.KeyVault/vaults/kv-asora-flex-dev` | Key Vault / North Europe / Standard | Main Function references this vault for most security, database, moderation, OAuth, Hive, and origin-gateway secrets | **CANONICAL** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.KeyVault/vaults/kv-asora-dev` | Key Vault / North Europe / Standard | Main app's `EMAIL_HASH_SALT` uses a non-URI Key Vault reference; legacy flex app also references it | **KEEP-SEPARATE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/asoraflexdev1404` | StorageV2 / North Europe / Standard_LRS | Canonical Function host/deployment storage, 8.42 GB, 983,205 transactions in seven days; seven-day soft delete and deployment lifecycle policy | **CANONICAL** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/stasoradsrdev` | StorageV2 / East US / Standard_LRS | DSR queue/export boundary, 77,793 transactions in seven days, blob versioning, export lifecycle | **KEEP-SEPARATE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/asoramediadev` | StorageV2 / North Europe / Standard_LRS | Explicit `MEDIA_STORAGE_ACCOUNT` dependency; four transactions in seven days | **KEEP-SEPARATE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/asorapsqlflex8fa9` | StorageV2 / North Europe / Standard_LRS | No app-setting or workflow reference found; 19 MB and three transactions in seven days | **QUARANTINE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Network/virtualNetworks/vnet-asora-dev` | VNet / North Europe | Current PostgreSQL metadata has no delegated subnet/private DNS reference; historical network evidence conflicts | **QUARANTINE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.ManagedIdentity/userAssignedIdentities/mi-asora-cicd` | User-assigned identity / North Europe | No role assignments in the accessible subscription; no repository reference; federated-credential inventory requires a separate command correction | **QUARANTINE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Portal/dashboards/dash-lythaus-health` | Azure dashboard / North Europe | Sole operational dashboard; no duplicate dashboard found | **CANONICAL** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/certificates/asora.co.za-asora-function-dev` | App Service certificate / North Europe | Bound to legacy public Azure hostname | **KEEP-SEPARATE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/certificates/dev.asora.co.za-asora-function-dev` | App Service certificate / North Europe | Bound to legacy feed-cache hostname | **KEEP-SEPARATE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Web/certificates/www.asora.co.za-asora-function-dev` | App Service certificate / North Europe | Bound to legacy compatibility hostname | **KEEP-SEPARATE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/scheduledQueryRules/alert-asora-function-dev-health-fail` | Scheduled query rule / North Europe | Disabled; targets zero-telemetry legacy Insights component | **RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/scheduledQueryRules/alert-asora-function-dev-5xx-rate` | Scheduled query rule / North Europe | Disabled; targets zero-telemetry legacy Insights component | **RETIRE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/scheduledQueryRules/alert-asora-function-dev-dsr-stuck-queued` | Scheduled query rule / North Europe | Enabled every five minutes against canonical component | **OPTIMISE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/scheduledQueryRules/alert-asora-function-dev-dsr-queue-depth` | Scheduled query rule / North Europe | Enabled every five minutes against canonical component | **OPTIMISE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/scheduledQueryRules/alert-asora-function-dev-dsr-failures` | Scheduled query rule / North Europe | Enabled every five minutes against canonical component | **OPTIMISE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/scheduledQueryRules/alert-asora-function-dev-dsr-poison-queue` | Scheduled query rule / North Europe | Enabled every five minutes against canonical component | **OPTIMISE** |
| `S/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/scheduledQueryRules/alert-asora-function-dev-dsr-missing-completion` | Scheduled query rule / North Europe | Enabled every five minutes against canonical component | **OPTIMISE** |

Creation dates and per-resource last-request data are not consistently exposed by the ARM schemas. Where available, the inventory uses function telemetry and Activity Log aggregate evidence instead. No cloud mutation is inferred from a resource name.

## Canonical architecture

| Capability | Canonical resource | Why retained |
|---|---|---|
| Backend compute | `asora-function-dev` | Complete deployed function set, current telemetry, managed identity, Key Vault references, Cloudflare/DNS compatibility bindings, and sole authorised deployment target |
| Function hosting | `asora-flex-plan-new` | Sole plan bound to canonical app |
| Relational data | `asora-pg-dev-ne` | Active PostgreSQL dependency; smallest known supported live SKU |
| Document/feed data | `asora-cosmos-dev` | Canonical serverless Cosmos account |
| Telemetry | `appi-asora-function-dev-dsr` + `law-asora-dsr-dev-neu` | Only active ingest path and alert scope |
| Secrets | `kv-asora-flex-dev` | Primary runtime secret reference source |
| Function packages/runtime storage | `asoraflexdev1404` | Required by canonical Function App and active rollback package path |
| DSR queue/export storage | `stasoradsrdev` | Required privacy boundary; separate lifecycle and access model |
| Media storage | `asoramediadev` | Explicit runtime dependency and media lifecycle boundary |
| Application deployment | `deploy-asora-function-mvp.yml` → `deploy-asora-function-dev.yml` | Exact-artifact, OIDC, canonical app path; no normal deployment may create infrastructure |

## Cost baseline

| Period | Total | PostgreSQL | Web/sites | Scheduled query rules | Log Analytics | Storage | Cosmos | Key Vault |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| June 2026 supplied actual | $25.26 | $17.01 | $2.12 | $2.90 | not separately billed in supplied summary | $3.20 | $0.07 | $0.01 |
| July 1–19 supplied actual | $31.78 | $10.67 | $10.56 | $4.66 | $3.19 | $2.60 | $0.08 | $0.02 |
| July supplied forecast | $47.80 | — | — | — | — | — | — | — |

The July regression is concentrated in Flex Consumption and monitor ingestion/evaluation. Exact cost by Function always-ready baseline, on-demand execution, GB-seconds, meter, and individual rule is **not available** from the accessible billing APIs. Do not describe an estimate as a realised saving.

## Functions analysis

### Canonical app

- `asora-function-dev` is the only complete live Function App. It is Node 22 Flex Consumption, 2,048 MB, maximum 100 instances, HTTPS-only, and has one always-ready allocation: `function:privacyDsrProcessor=1`.
- The DSR queue trigger uses `messageEncoding: none`, the canonical DSR storage setting, a poison-queue-aware monitor, and timer binding `0 0 */8 * * *`.
- The previous measured peak working set was 1.21 GB. A 512-MB change is rejected pending the controlled test matrix and rollback package in `docs/runbooks/dsr-scale-from-zero-and-always-ready.md`.
- Removing always-ready is deferred. The required five independent idle scale-from-zero DSR drills, zero poison/duplicate proof, latency record, sixth confirmation drill, and restoration drill have not been executed in this pass.

### Duplicates

| App / plan | Evidence | Required migration/retirement proof |
|---|---|---|
| `asora-function-flex` / `ASP-asorapsqlflex-4a5f` | No functions, zero telemetry, Node 20, legacy references to both vaults | Export sanitized settings and deployment metadata; prove no Cloudflare/DNS route, workflow, rollback, or unique data path; observe seven days; stop first; delete only after approval |
| `asora-function-consumption` / `NorthEuropeLinuxDynamicPlan` | One health endpoint, zero telemetry, HTTP allowed, legacy host-storage package settings | Prove no legacy hostname/monitor depends on the endpoint; observe seven days; stop first; delete only after approval |

## Observability analysis

### Measured volume

| Window | AppTraces | AppMetrics | AppPerformanceCounters | AppRequests | AppExceptions |
|---|---:|---:|---:|---:|---:|
| 30 days | 5.274683 GB / 3,259,167 events | 0.390009 GB | 0.175529 GB | 0.053340 GB | 0.000578 GB |
| 7 days | 2.602001 GB / 1,604,294 events | 0.190028 GB | 0.086018 GB | 0.025352 GB | 0.000152 GB |
| 1 day | 0.378855 GB / 231,181 events | 0.028650 GB | 0.012159 GB | 0.004085 GB | 0.000022 GB |

The one-day trace total came from the canonical Function host. `Azure.Core` produced 177,441 Information traces and `Azure.Core.1` 20,536. Their Request/Response events alone accounted for 197,981 traces. DSR traces use explicit `Function.privacy…​.User` categories and are low volume relative to SDK noise.

The current workspace has no daily cap. Its principal Application Insights tables each retain 90 days despite a 30-day workspace retention setting.

### Repository remediation in this branch

- Set host default logging to `Warning` and explicit Azure SDK/host framework categories to `Warning`.
- Retain DSR monitor, queue processor, export enqueue, and deletion enqueue categories at `Information` so the existing alert queries retain their inputs.
- Change host sampling from 20 to five telemetry items per second for sampled successful requests/dependencies. Exceptions, structured events, and DSR traces are excluded from sampling.
- Preserve the existing Node SDK rule: automatic console, request, dependency, performance, exception, and live-metric collectors remain disabled so host instrumentation is authoritative.

### Pending live configuration decision

Do not set a workspace daily cap or reduce table retention until seven post-deployment days establish normal and failure-spike ingestion. Initial cap candidate: **0.15 GB/day**, with an Activity/operational warning before a cap blind spot. Set table retention to 30 days only after Kyle approves the resulting expiration of the older 60-day window. Basic/Auxiliary table migration is not justified before measured savings and alert-query compatibility are demonstrated.

## Alert analysis

| Rule | Current state | Cadence | Decision |
|---|---|---|---|
| `health-fail` | Disabled; legacy source | 5 minutes | Delete after approval; no active source telemetry |
| `5xx-rate` | Disabled; legacy source | 5 minutes | Delete after approval; no active source telemetry |
| `dsr-stuck-queued` | Enabled | 5 minutes / 10-minute window | Consolidate after failure-query validation |
| `dsr-queue-depth` | Enabled | 5 minutes / 10-minute window | Consolidate after failure-query validation |
| `dsr-failures` | Enabled | 5 minutes / 10-minute window | Retain condition in one critical rule |
| `dsr-poison-queue` | Enabled | 5 minutes / 10-minute window | Retain condition in one critical rule or native queue metric |
| `dsr-missing-completion` | Enabled | 5 minutes / 10-minute window | Retain condition in one critical rule |

Target after a controlled alert drill:

1. One critical, canonical-workspace DSR/security failure rule at 15 minutes, combining failed handler, poison, stuck, depth, and missing-completion conditions with a structured failure dimension.
2. One once-daily operational summary for warning/stuck conditions.
3. Activity Log alerts for resource deletion or critical configuration change, plus native queue metric alert only if it is materially useful.

No active DSR rule is deleted in this pass because a fresh controlled DSR failure/poison validation has not yet been run.

## Retirement matrix

| Resource | Historical cost context | Evidence | Action | Saving | Risk / rollback | Approval |
|---|---:|---|---|---:|---|---|
| Host Azure.Core Information tracing | Included in July Log Analytics $3.19 | 0.379 GB/day; 197,981 Azure.Core request/response traces/day | Deploy this branch through canonical workflow | Estimated only | Revert exact release artifact / restore `host.json` | Standard release approval |
| Five active DSR scheduled rules | July rules total $4.66 including disabled rules | All query current canonical component every five minutes | Replace only after alert drill | Unknown | Restore exported rule JSON | Kyle approval for alert change |
| Two disabled legacy rules | Included above | Disabled and source component has zero events | Delete after review | Unknown | Recreate from exported definition | Kyle approval recorded in deletion table |
| `asora-function-flex` and plan | Part of July Web/sites $10.56 | No functions, zero telemetry, legacy vault refs | Observe, export, stop, then review delete | Unknown | Start app / retain exported config | Stop may proceed only after seven-day proof; delete requires Kyle approval |
| `asora-function-consumption` and plan | Part of July Web/sites $10.56 | One health function, zero telemetry | Observe, export, stop, then review delete | Unknown | Start app / retain exported config | Stop may proceed only after seven-day proof; delete requires Kyle approval |
| Four legacy Insights components + default workspace | Unknown | Zero aggregate events; no active alert scope | Observe then retire together | Unknown | Recreate/export dashboard queries | Delete requires Kyle approval |
| `asorapsqlflex8fa9` | Near-zero historical storage | 19 MB, three transactions, no runtime reference | Quarantine and inspect state/rollback use | Near zero | Restore retained artifact before delete | Kyle approval |
| `mi-asora-cicd` | $0 | No role assignments; federated credential not yet verified | Quarantine | $0 | Recreate identity/assignment if needed | Kyle approval |
| `vnet-asora-dev` | $0 | Current PostgreSQL metadata conflicts with historical delegated-subnet evidence | Quarantine | $0 | Security/network review required | Explicit security approval |
| DSR always-ready | Included in July Web/sites $10.56 | One allocation; DSR proof incomplete | Keep | Unknown | Exact pre-change `functionAppConfig` restoration | Separate maintenance-window approval |

## Required approval table before destructive operations

| Proposed operation | Current status | Evidence required before execution |
|---|---|---|
| Stop either duplicate Function App | Not approved | Seven-day no-traffic/no-DNS/no-workflow/no-rollback proof, sanitized settings export, canonical health check |
| Delete duplicate app/plan, Insights/default workspace, storage, identity, or network | Not approved | Kyle approval naming exact resource IDs, rollback material, and post-stop validation |
| Remove DSR always-ready | Not approved | Five cold DSR drills, sixth verification, zero poison/duplicates, latency, and tested restoration |
| Reduce Function memory | Not approved | 512-MB cold start/auth/feed/post/moderation/Hive/DSR/concurrency/package test with 25% headroom |
| Change workspace cap or table retention | Not approved | Seven-day post-deploy ingestion/failure baseline and Kyle acknowledgment of cap/retention blind spots |
| Consolidate enabled DSR alerts | Not approved | Controlled canonical telemetry/alert drill and exported rollback definitions |

## Repository policy consolidation

- `docs/adr/ADR-006-lean-shared-mvp-infrastructure.md` now states the one-live-environment rule and prohibits normal delivery from creating infrastructure.
- `infra/terraform/envs/{dev,staging,prod}` remains reference-only and must not be applied.
- The sole application delivery path remains `deploy-asora-function-mvp.yml` delegating to `deploy-asora-function-dev.yml` with exact CI artifact validation.
- Alpha daily reports now label the deployment environment `mvp`, not `staging`.

## Repository validation on 2026-07-20

| Check | Result | Scope / note |
|---|---|---|
| Functions TypeScript typecheck | PASS | `npm run --workspace asora-backend-functions typecheck` |
| Functions test suite | PASS | 209 suites; 2,282 passed; 18 skipped; 2,300 total |
| Focused telemetry tests | PASS | 2 suites; 14 tests, including the new host telemetry guard |
| Workflow YAML parse and actionlint | PASS | All repository workflows |
| Terraform formatting and validation | PASS | `fmt -check -recursive`; `init -backend=false` and `validate` for all five tracked roots; no plan or apply |
| Changed-file secret scan | PASS | Gitleaks `--no-git --redact` on every file changed by this branch; no findings |
| Historical secret scan | PASS / prior evidence | The primary worktree's shared history was scanned before this branch; this linked worktree cannot run Git-history scanning because WSL resolves its `.git` admin file incorrectly. CI remains the authoritative exact-commit full-history scan. |
| Live DSR, load/memory, post-deploy health, telemetry failure drill | NOT RUN | Requires a reviewed deployment and isolated approved test identity; no live Azure mutation was made in this pass |

## Realized changes

| Timestamp | Mutation | Before / after | Verification | Rollback | Saving |
|---|---|---|---|---|---:|
| 2026-07-20 | None | Read-only Azure inventory and repository-only patch | Azure configuration remains unchanged | Not applicable | $0 confirmed |

## Next validation sequence

1. Merge the reviewed telemetry patch through the canonical exact-artifact workflow.
2. Verify DSR monitor, enqueue, completion, failure, and poison signals on the canonical component.
3. Compare 24 hours and seven days of table ingestion against the 0.379-GB/day baseline.
4. Run the five-drill DSR scale-from-zero procedure before considering removal of always-ready.
5. Export duplicate resources' sanitized configuration and observe traffic/routes for seven days.
6. Present the populated approval table before any destructive Azure operation.

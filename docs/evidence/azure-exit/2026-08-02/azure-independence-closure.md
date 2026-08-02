# Azure Independence Closure

Status: completed for reversible Azure runtime disconnection. Azure deletion is not authorized.

## Provenance

- `releaseSha`: `f815d646aac8e0690df381d3dc333b0dba5f36ae`
- `controlSha`: `9b942b9fc76269d4c351aeea19b676375b2712d1` (merged gate-control PR #503)
- `evidenceSha`: recorded in the final handoff after this evidence-only change merges
- No Worker, Pages, dependency, workflow, infrastructure, or deployment-input change is included here.
- The release SHA remains the runtime provenance. This evidence commit does not require redeployment.

## Gate state

```text
domainCutover: COMPLETED
googleOAuthAcceptance: DEFERRED TO ADR 003
cloudflarePromotion: COMPLETED
runtimeCutover: COMPLETED
githubToAzureDisconnection: COMPLETED
azureDeletionInventory: COMPLETED
azureDeletionAuthorized: false
azureDeletionExecution: NOT STARTED
```

The owner-approved Google exception is limited to end-to-end session acceptance:

```json
{
  "status": "DEFERRED TO ADR 003",
  "ownerApproved": true,
  "launchBlocking": true,
  "scope": "Google OAuth end-to-end session acceptance only",
  "decisionDate": "2026-08-02",
  "expiresWhen": "ADR 003 authentication acceptance completes"
}
```

Authenticated user acceptance, including session issuance, refresh rotation, logout, profile writes, privacy-request submission, and moderation submission, remains deferred to ADR 003 and is launch-blocking.

## Pre-stop evidence

- `npm run validate:github-azure-disconnection`: passed.
- `npm run validate:native-azure-dependencies`: passed for all three native Workers.
- Release controls and required CI checks on control PR #503: green.
- Cloudflare account scope: existing account only; no resource was created.
- Native Workers observed: `lythaus-public-api-development`, `lythaus-admin-api-development`, and `lythaus-jobs-development`.
- Worker tails before shutdown: zero for all three Workers.
- OAuth KV prefixes in `lythaus-config-dev`: `oauth:google:` zero keys; `oauth:exchange:` zero keys.
- Hyperdrive: five existing configurations were readable; caching is disabled.
- Queues and DLQs: all twelve existing queues were readable with zero backlog.
- Workflows: five existing workflows were readable; recorded instances were complete or absent.
- Jobs schedule: the existing `*/15 * * * *` schedule remains active because scheduled processing was not proven unnecessary.
- Lythaus Access applications for admin UI and admin API were present.
- R2 lifecycle and retention were inspected read-only. The five encrypted DSR objects are under `protected-migration/dsr/`, outside the `exports/` 30-day expiry prefix. The audit archive has a one-year `audit/` retention rule. No R2 mutation was performed.
- The DSR prefix has no object-lock rule; the objects remain encrypted, access-controlled, checksum-recorded, and retained in the existing approved bucket. No new retention resource was created.

The pre-stop Cloudflare observability search from `2026-08-02T08:55:02.579Z` through `2026-08-02T09:10:02.579Z` returned zero events and invocations matching `azurewebsites.net` or `asora.co.za`.

## Shutdown

Only `asora-function-dev` was stopped. No other Azure resource, identity, federated credential, RBAC assignment, reader assignment, database, storage account, or resource group was changed.

```text
AZURE FUNCTION APP STATE: STOPPED
Resource group: asora-psql-flex
Recorded stop time: 2026-08-02T09:13:11.790Z
Rollback command: az functionapp start --resource-group asora-psql-flex --name asora-function-dev
```

The Function App remains retained for rollback and final owner review. No automatic restart was introduced.

## Post-stop acceptance

The native non-authenticated suite was rerun after the stop:

| Check | Result |
| --- | --- |
| `https://api.lythaus.co/api/health` | HTTP 200 |
| `https://api.lythaus.co/api/ready` | HTTP 200 |
| Guest discovery | HTTP 200 |
| Admin API through Access | HTTP 302 to the existing Access login |
| Application Pages | HTTP 200 |
| Admin Pages through Access | HTTP 302 to the existing Access login |
| `lythaus.co` | HTTP 200 with CSP and HSTS |
| `www.lythaus.co` | HTTP 301 to `https://lythaus.co/` |
| Stopped Function negative control | HTTP 403; no application response served |
| API CORS | `Access-Control-Allow-Origin: https://app.lythaus.co` |

Correlation IDs were generated for every request and retained only as sanitized evidence in the task record; no response body, cookie, Access token, or personal data was retained here.

The exact post-stop Cloudflare observation window was:

```text
OBSERVATION START: 2026-08-02T09:13:11.790Z
OBSERVATION END: 2026-08-02T09:17:39.946Z
AZURE RUNTIME STATIC SCAN: PASSED
AZURE RUNTIME OBSERVATION WINDOW: PASSED
TEMPORARY TAILS REMAINING: 0
```

During that window, all three Worker tail queries returned zero tails and dry-run observability searches returned zero events and zero invocations matching `azurewebsites.net` or `asora.co.za`.

After the stop, all twelve queues and DLQs remained at zero backlog. Workflow instances remained complete or absent. No Azure-dependent workflow was awaiting a response.

## OAuth cleanup

The known abandoned prefixes were verified through Cloudflare KV and contained zero keys. Therefore no KV deletion was needed. No user account, provider link, contact record, privacy record, legal-hold record, unrelated session, audit data, or other user state was deleted. Temporary Worker tails remaining: zero.

## GitHub disconnection

The fail-closed GitHub-to-Azure scanner passed before and after shutdown. No active workflow references Azure login, Azure deployment actions, Azure data-plane commands, Azure deployment credentials, or direct Azure origins.

After post-stop acceptance, the following obsolete repository secrets were removed by name only:

- `AZURE_APPINSIGHTS_NAME`
- `AZURE_CLIENT_ID`
- `AZURE_FUNCTIONAPP_CANARY_NAME`
- `AZURE_FUNCTIONAPP_NAME`
- `AZURE_RESOURCE_GROUP`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`
- `POSTGRES_ADMIN_PASSWORD`
- `TF_STATE_SA`

The following obsolete repository variables were removed by name only:

- `ALPHA_FUNCTIONAPP_NAME`
- `ALPHA_RESOURCE_GROUP`
- `AZURE_APPINSIGHTS_NAME`
- `AZURE_CLIENT_ID`
- `AZURE_FUNCTIONAPP_CANARY_NAME`
- `AZURE_RESOURCE_GROUP`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`

No `dev`-environment Azure secret or variable existed. Cloudflare, PlanetScale, Google, mobile signing, Access, and runtime-test credentials were not changed.

## Retained Azure state

The following remain intentionally retained pending the separate irreversible deletion gate:

- Azure resource group and all Azure resources;
- Cosmos account and extracted evidence;
- Azure PostgreSQL legacy state, formally abandoned as pre-production legacy identity state;
- Storage and encrypted DSR evidence;
- Key Vault;
- Entra application and service principal;
- federated credentials;
- existing RBAC assignments;
- the three temporary read assignments used for controlled discovery.

No Azure resource was deleted. No Azure role assignment was created, changed, or revoked in this closure step.

## Cost and closure

- New resource, subscription, branch, database, Worker, bucket, Queue, Workflow, KV namespace, Hyperdrive, replica, or provider: none.
- Migration/import writes: none.
- Incremental cost: US$0.
- Azure Function stop is reversible and does not create a billing line.

```text
GITHUB-TO-AZURE EXECUTION PATHS: DISCONNECTED
LYTHAUS NATIVE RUNTIME AZURE DEPENDENCY: NONE DETECTED
AZURE FUNCTION APP: STOPPED
POST-STOP AZURE-INDEPENDENCE ACCEPTANCE: PASSED
GOOGLE OAUTH ACCEPTANCE: DEFERRED TO ADR 003 — LAUNCH BLOCKING
AUTHENTICATED USER ACCEPTANCE: DEFERRED TO ADR 003 — LAUNCH BLOCKING
AZURE DELETION INVENTORY: COMPLETED
AZURE RESOURCES: RETAINED
AZURE FEDERATED CREDENTIALS: RETAINED
AZURE RBAC ASSIGNMENTS: RETAINED
AZURE READER ASSIGNMENTS: RETAINED
INCREMENTAL COST: US$0
AZURE DELETION AUTHORIZED: FALSE
AZURE DELETION EXECUTION: NOT STARTED

AWAITING: AUTHORISE FINAL AZURE DELETION
```

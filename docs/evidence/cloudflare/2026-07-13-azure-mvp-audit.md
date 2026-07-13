# Azure MVP shared-environment audit — 2026-07-13

## Result

**NO-GO for public domain cutover.** The existing Azure backend is positively identified and healthy, but it is not yet configured for the Lythaus gateway/CORS contract and its rollback was not rehearsed. No Azure write was performed.

## Identity and scope

| Field | Observed value |
|---|---|
| Subscription | `99df7ef7-776a-4235-84a4-c77899b2bb04` (`Enabled`) |
| Tenant | `275643fa-37e0-4f67-b616-85a7da674bea` |
| Deployment application | `06c8564f-030d-414f-a552-678d756f9ec3` |
| Resource group | `asora-psql-flex` |
| Authorised Function App | `asora-function-dev` |
| Operational classification | Lythaus MVP shared environment |
| Region | North Europe |

The resource group also contains older Function resources named `asora-function-flex` and `asora-function-consumption`. They are not authorised as alternate staging/production origins and were not selected for this migration.

## Function App

| Control | Observed state | Assessment |
|---|---|---|
| Runtime/plan | Node 22, Flex Consumption `FC1`, 2 GB, max 100 instances | Live |
| State | Running | Pass |
| HTTPS-only / TLS | HTTPS-only; minimum TLS 1.2; SCM TLS 1.2 | Pass |
| Public network | Enabled; effective allow-all rule | Blocker for origin isolation |
| Managed identity | System-assigned | Pass |
| Remote debugging | Disabled | Pass |
| Health check platform path | Not configured | Gap |
| Deployment strategy | Blob package using system identity; recreate strategy | Live |
| Deployed SHA | Set, matches PR 452 exact SHA; does not match PR 453 | Expected pre-merge state |
| Direct health | `/api/health` HTTP 200, `healthy` | Pass |
| Direct readiness | `/api/ready` HTTP 200, `ready`; Cosmos check true | Pass/partial |
| PostgreSQL connectivity | Connection setting is Key Vault-backed; not independently exercised | Unknown |
| Functions | 131 registered | Live |
| DSR runtime | `privacyDsrProcessor` always-ready instance count 1 | Preserved |

Current Azure custom hostnames include `asora.co.za`, `www.asora.co.za`, `dev.asora.co.za`, `admin-api.asora.co.za`, and the Azure default hostname. No Lythaus custom hostname is bound directly to Azure; the target architecture keeps Lythaus API domains on Cloudflare.

## CORS and authentication

Azure platform CORS currently allows:

- `https://control.asora.co.za`
- `https://lythaus-web.pages.dev`
- `https://app.lythaus.asora.co.za`
- `http://localhost:8080`
- `http://localhost:4200`

Preflight from `https://app.lythaus.co` returns HTTP 204 without `Access-Control-Allow-Origin`; the live Lythaus web app would therefore be blocked. App Service Authentication/EasyAuth is disabled. Administration relies on Cloudflare Access assertions plus server-side roles where implemented; this must be proven after the Cloudflare audit.

## Shared-MVP safety flags

| Setting/control | Sanitized state | Assessment |
|---|---|---|
| `AUTH_ALLOW_TEST_USER_ID` | Absent | Safe default |
| `CHAOS_ENABLED` | Absent | Safe default |
| `NODE_ENV` | Absent; purge code defaults to production | Destructive purge defaults closed |
| `RATE_LIMITS_ENABLED` | Enabled | Pass |
| `ORIGIN_GATEWAY_AUTH_REQUIRED` | Absent or disabled | Cutover blocker |
| `ORIGIN_GATEWAY_TOKEN` | Absent | Cutover blocker |
| `STRICT_STARTUP_VALIDATION` | Absent or disabled | Hardening gap |
| `WEBSITE_AUTH_ENABLED` | Absent; platform auth disabled | Expected only if origin/admin guards are independently proven |

The deployed anonymous discovery route is directly accessible at the Azure hostname and returns `Cache-Control: public, no-cache, must-revalidate`. Public traffic must use the gateway so Azure headers/origin are concealed and protected responses receive the gateway cache policy.

## Data and secrets posture

- Key Vaults `kv-asora-dev` and `kv-asora-flex-dev`: RBAC enabled, 90-day soft delete, public network enabled; purge protection was not observed enabled.
- PostgreSQL `asora-pg-dev-ne`: Ready, PostgreSQL 16, public network enabled, seven-day backup retention, no HA, no geo-redundant backup.
- Cosmos DB `asora-cosmos-dev`: Continuous backup, Session consistency, one North Europe location, public network enabled.
- Application Insights `appi-asora-dev`: 30-day retention; public ingestion and query enabled.
- DSR queue/export settings are present; secrets such as JWT, Hive, Cosmos, PostgreSQL, audit, FCM private key, and Access client secret are Key Vault references where observed.

## Application-setting inventory

All values are suppressed. The complete name/state inventory is in [JSON evidence](2026-07-13-azure-mvp-audit.json). Observed states are `SET_REDACTED` or `KEY_VAULT_REFERENCE`; no raw value was committed.

## Required actions before GO

1. Complete the Cloudflare account audit and identify the exact Pages, Worker, Access, DNS, ruleset, and certificate resources.
2. Deploy PR 453 as an exact immutable candidate and prove rollback to the current PR 452 package.
3. Configure the Worker origin token secret and matching Azure Key Vault-backed token, then enable enforcement after preview proof.
4. Replace legacy/local Azure CORS with exact Lythaus live origins plus only the exact temporary Pages preview during validation.
5. Add the approved OAuth callback and prove code/PKCE/token/userinfo.
6. Prove admin Access audience/service tokens and server-side roles.
7. Document database backup/restore before migrations; explicitly accept or mitigate the current single-region/no-HA posture.
8. Keep shared-MVP load/chaos tests behind explicit approval variables.

## Evidence method

Read-only Azure CLI queries, sanitized in memory, plus unauthenticated read-only HTTP health/readiness/discovery and CORS probes. No access token, application-setting value, Key Vault secret, database credential, JWT, cookie, or user data was output or committed.

# PlanetScale provisioning evidence — 2026-07-28

This is a sanitised operational record for the Lythaus Cloudflare–PlanetScale
implementation. It contains no credentials, connection strings, tokens, or
application records.

## Authentication and targeting

- PlanetScale CLI: `0.307.0`, authenticated through OAuth.
- Organization: `lythaus`.
- Database: `lythaus-core`.
- CLI auth check: `authenticated=true`, `auth_method=oauth`.
- No PlanetScale writes or DDL were issued against `main`.

## Development branch

- Branch `development` was created from empty `main`.
- Region: Frankfurt (`eu-central`).
- Cluster: `PS_DEV_AWS_ARM`, single node, zero replicas.
- Branch state: ready.
- Read-only probe: PostgreSQL `18.4` (`server_version_num=180004`).
- User-table count before migrations: `0`.
- The branch is synthetic development only and is not production-ready.

## Extension and migration history

- The migration preflight succeeded on `development`.
- Migration `0001_extensions_and_schemas.sql` stopped at `CREATE EXTENSION postgis`.
- PlanetScale SQL admin sessions are intentionally non-superuser and returned
  `permission denied to create extension "postgis"`.
- The provider temporarily reported PostGIS unavailable during the first
  migration attempt; no application schema was created then.
- A subsequent read-only catalog probe reported all four required extensions
  (`postgis`, `pgcrypto`, `pg_trgm`, and `unaccent`) as available, but none was
  installed at that point. The later direct-admin attempt installed the three
  non-geospatial extensions; PostGIS remained blocked by the provider allowlist.
- No application tables or user data were created on `development`.

## Reversible attempts

- A London `development` branch attempt was rejected because this database is
  ARM-only and the region does not support the parent ARM architecture.
- No database, branch, role, replica, or production resource was deleted.

## Gate impact

| Gate | Status | Evidence | Remaining blocker |
| --- | --- | --- | --- |
| 1 | BLOCKED | Shared Cloudflare account; dedicated-account API remains forbidden | Dedicated production account and signed Azure disposition |
| 2 | IN PROGRESS | PG18.4 Frankfurt development branch is ready | Region/tier benchmark, production PG18 HA topology, replicas and cost approval |
| 3 | BLOCKED | CLI OAuth and required extensions now appear available | Approved development DDL, baseline migrations, grants, roles, negative tests and Hyperdrive credentials |
| 4 | IN PROGRESS | Native Worker code and exact-head checks pass | Development database schema and live Worker deployment |
| 5 | BLOCKED | No production data or cutover performed | Independent backup, restore drills, domains, rollback rehearsal |

## Live MCP recheck — 2026-07-28

- PlanetScale organization plan: `developer`; payment information is not yet
  valid and the database remains Cloudflare-billed through the shared account.
- Database branches currently visible: `main` (production) and `development`
  (non-production). No permanent `ai-development` database branch exists.
- `main`: Frankfurt, PS-5 ARM, zero replicas, PostgreSQL 17.10, zero
  application tables.
- `development`: Frankfurt, PS-DEV ARM, zero replicas, PostgreSQL 18.4, zero
  application tables.
- Available autoscaling tiers include PS-5 ARM at US$15/month plus US$5/month
  per replica and PS-10 ARM at US$30/month plus US$10/month per replica;
  storage, backup, egress, and regional adjustments remain unpriced here.
- The initial read-only SQL on `development` confirmed required extensions were
  available in `pg_available_extensions` but `installed_required_extensions`
  was null. The MCP session uses an ephemeral read-only role;
  its role catalog does not expose the five branch login roles, so role
  provisioning remains evidenced by the PlanetScale role-management API/CLI.

No write or DDL operation was issued against `main` or `development` during
this recheck. Development DDL remains pending explicit human approval.

## Repository acceptance contracts

- `database/planetscale/extensions/required-extensions.json` records the
  required `postgis`, `pgcrypto`, `pg_trgm`, and `unaccent` capability set.
- `scripts/validate-planetscale-extensions.mjs` validates migration references
  locally and fails closed when live catalog evidence is required but absent or
  missing a required extension.
- `docs/architecture/password-hashing-adr.md` records Argon2id as the default;
  scrypt fallback is disabled in production unless benchmark evidence and an
  approved decision explicitly enable it.

## Native Worker validation

- `wrangler` version `4.114.0` is installed.
- Public API development `wrangler deploy --dry-run --env development` passed;
  the bundle resolved the synthetic KV, R2, queue, email, and placeholder
  Hyperdrive bindings without deploying a Worker.
- `wrangler whoami` remains blocked because the local token expired and cannot
  refresh in the non-interactive shell. Live development deployments were
  performed through the authenticated Cloudflare MCP API instead.
- The new scope validator and native Worker validator both pass in
  pre-production mode. Production mode correctly fails closed until protected
  dedicated-account identifiers and the production environment are supplied.
- The current Cloudflare MCP session is authenticated for the shared account;
  production account isolation, Access configuration, email-domain verification
  and Turnstile readiness remain unverified.

## Exact MCP recheck — 2026-07-28

- PlanetScale MCP list returned exactly two branches: `main` and
  `development`; both are Frankfurt (`eu-central`) with zero replicas.
- Read-only `development` probe returned PostgreSQL `18.4`, database `postgres`,
  zero Lythaus schemas, and installed extensions `hypopg, plpgsql` only.
- `get_branch_schema` for `development` returned no application schema objects.
- This recheck issued no writes or DDL and does not change the Gate 2/3 blockers.

## Current region and SKU metadata — 2026-07-28

- PlanetScale MCP lists Frankfurt (`eu-central`), Dublin (`eu-west`) and
  London (`aws-eu-west-2`) as enabled PostgreSQL regions; no African region is
  listed.
- Current autoscaling ARM rates reported by MCP are: PS-DEV `$15/mo`, PS-5
  `$15/mo` plus `$5/mo` per replica, and PS-10 `$30/mo` plus `$10/mo` per
  replica. Storage, backup, egress and regional adjustments remain separate.
- The live PS-DEV rate supersedes the earlier provisional `$5/mo` development
  estimate. Cost approval remains blocked until the actual production topology
  and billing account are selected.

## Repository implementation evidence — 2026-07-28

- Native architecture invariants: `18/18` passed after subject-locator
  reconciliation, trust-ledger grants, stale-password rehashing, and the
  native Azure dependency scan.
- Exact-head GitHub checks for commit `2cee518c`: native validation
  `30314702225`, migrations `30314704112`, and secret scan `30314705687` all
  passed.
- The draft implementation remains pushed on branch
  `codex/cloudflare-planetscale-provisioning`; production gates remain closed.

## Superseding provider refresh — 2026-07-28

- PlanetScale MCP re-read confirms database `lythaus-core` is `ready`, plan
  `scaler_pro`, Cloudflare-billed through account
  `e5b7ae46e04698f507b7e4b3d4ef1af0`, with exactly `main` and `development`
  branches in Frankfurt. No write or DDL was issued.
- Cloudflare MCP read-only access is currently healthy for the shared account.
  The account contains active Workers Paid, R2 Paid and Workers PlanetScale
  subscriptions, but it remains a mixed-use account and is not the required
  dedicated Lythaus production account.
- The shared account contains only the existing `lythaus-core-fresh`
  Hyperdrive configuration plus synthetic development resources. No native
  production Worker was deployed and no production binding was provisioned.
- The earlier Cloudflare API `10000` authentication observation is superseded
  for account and zone reads by this refresh; it remains unresolved for any
  endpoint not revalidated in this read-only check.
- Gate 1 remains blocked by account isolation and the owner Azure
  data-disposition decision. Gates 2–5 remain gated by benchmark, extension,
  credential, deployment and recovery evidence.

## Extension availability refresh — 2026-07-28

- PlanetScale read-only SQL initially reported PostgreSQL `18.4`, with
  `pg_trgm,pgcrypto,postgis,unaccent` available in the extension catalog and
  none installed at that time.
- The provider-side availability outage is no longer the blocker. The next
  operation was attempted through the direct PlanetScale admin SQL path. The
  three non-geospatial extensions installed successfully; PostGIS returned
  `permission denied` because it is absent from the branch's immutable
  `extwlist.pscale_allowed_extensions` value.

## Topology and extension matrix — 2026-07-28

- Temporary branch `ci-ext-frankfurt-ps10` (`kc1toai6ks4a`) reached ready state
  in Frankfurt as PostgreSQL 18.4 PS-10 ARM with two replicas. Its extension
  allowlist also excludes PostGIS, and `CREATE EXTENSION postgis` failed with
  SQLSTATE `42501`.
- Temporary branch `ci-ext-dublin-ps10` (`f9ii01hy7ooz`) reached ready state in
  Dublin as PostgreSQL 18.4 PS-10 ARM with two replicas. It reproduced the same
  PostGIS restriction.
- A temporary standalone London PG18 PS-10 X86 HA database could not be
  created because PlanetScale rejected the account's payment verification.
  London ARM branches are also unsupported by the current ARM-only database.
- `development` now has `pgcrypto`, `pg_trgm`, and `unaccent` installed;
  PostGIS remains unavailable and no application tables were created.

## Exact-head CI refresh — 2026-07-28

- Current head `90e14997bcc4b15c61b72950f083736f70e2ee67` passed native
  validation run `30315612296`, PlanetScale migration-contract run
  `30315614015`, and secret-scan run `30315615763`.
- These checks validate repository contracts only; they do not satisfy the
  live account, extension, benchmark, deployment, backup or cutover gates.

## Development Cloudflare deployment evidence — 2026-07-28

- Four cache-disabled Hyperdrive configurations were created for the synthetic
  development branch: application, admin, jobs and privacy. Each uses the
  PlanetScale system root CA and `sslmode=verify-full`; production bindings
  remain placeholders until the dedicated account and production database are
  approved.
- `lythaus-public-api-development`, `lythaus-admin-api-development`, and
  `lythaus-jobs-development` are deployed through the Cloudflare API with
  `nodejs_compat`. Public and admin development workers have workers.dev
  endpoints; the jobs worker has no public workers.dev or preview endpoint.
- Public and admin `/health` probes returned HTTP 200. Database-backed routes
  remain expected to fail closed because the PostGIS provider blocker prevented
  the application migration baseline from being applied.
- Six development queues have worker consumers with bounded batches, retries,
  and dead-letter queues. Five development Workflows are registered against the
  jobs worker, and its fifteen-minute cron trigger is configured.
- Sampled Worker observability is enabled on all three development scripts with
  persisted invocation logs; this is operational evidence only and not the
  permanent audit store.
- These are synthetic pre-production resources in the mixed-use shared account;
  they do not satisfy Gate 1 or authorize production data, DNS cutover, or
  Azure deletion.

## Final read-only development probe — 2026-07-28

- PlanetScale MCP returned PostgreSQL `18.4`, database `postgres`, installed
  `pg_trgm,pgcrypto,unaccent`, zero application schemas, and no application
  tables. The MCP query uses an ephemeral read-only role, so its filtered role
  catalog cannot independently enumerate the five branch login roles already
  provisioned through the PlanetScale role-management API.
- PostGIS remains the single provider capability blocker for the approved
  migration baseline; no geospatial downgrade or substitute type was applied.

## Hyperdrive readiness and native Worker refresh - 2026-07-28

- The public development Worker was rebuilt from the current repository bundle
  and uploaded through the authenticated Cloudflare API as deployment
  `e66ef74d16e3429f85e0606cee5ebbea` (tag
  `f939c50929804735ac7800394619058d`).
- The Worker binding exposes a Cloudflare-generated local connection string
  using `hyperdrive.local` and `sslmode=disable`. This is the Worker-to-
  Hyperdrive hop; the Hyperdrive origin configuration remains `verify-full`
  with the PlanetScale system root CA. The application guard now accepts only
  this exact platform-local mode and rejects weaker modes elsewhere.
- Live probes against
  `lythaus-public-api-development.asora.workers.dev` returned:
  `GET /api/health` HTTP 200, `GET /api/ready` HTTP 200 with `status=ready`,
  and `GET /api/feed/discover` HTTP 400 because the approved application
  schema has not yet been applied.
- A temporary Hyperdrive diagnostic Worker used to inspect only sanitized
  binding metadata was deleted after the probe; it is not a retained runtime
  dependency.
- Local native database connection contracts passed `6/6`; native TypeScript
  checking passed. The public Worker dry-run bundle resolved the development
  KV, R2, Queue, email and Hyperdrive bindings before upload.
- Johannesburg TCP handshake baseline (10 samples per endpoint, no complete
  query transaction) was: Frankfurt p50 `157.7 ms`, p95 `209.0 ms`; Dublin
  candidate p50 `161.7 ms`, p95 `175.8 ms`; the second Dublin candidate p50
  `164.0 ms`, p95 `256.1 ms`. These figures are inputs to Gate 2, not final
  endpoint SLOs.
- The current unauthenticated public benchmark recorded health p50 `34.07 ms`
  and p95/p99 `184.92 ms`; readiness is now healthy after the Hyperdrive local
  mode correction. Discovery remains intentionally unseeded until the
  PostGIS-dependent schema baseline is available.

Gate 4 is now partially evidenced for native health/readiness and Worker
connectivity, but remains incomplete for the launch API, schema, auth,
moderation, media, privacy and duplicate-delivery acceptance suite. Gates 1,
2, 3 and 5 remain blocked by the dedicated-account, data-disposition,
provider-extension, production-topology, role/migration, backup and cutover
requirements recorded above.

- The jobs Worker was rebuilt and uploaded as deployment
  `f733a25670364425a283f081af4b9ede` (tag
  `ad2eb5a5bffe42779b3eb358eb8b08c7`). Its consumer now atomically claims
  `system.consumer_inbox` events, retries concurrent processing claims, leases
  stale claims after five minutes, marks successful events `completed`, and
  releases failed claims for Queue retry. This source-level contract is tested
  locally; live execution awaits the blocked migration baseline.
- Repository secret scan via `scripts/secret-scan.sh` completed against 1,582
  commits with no leaks found. No secret values were added to the evidence.
- Cloudflare subdomain verification reports public and admin development
  subdomains enabled for synthetic testing, while `lythaus-jobs-development`
  has both `enabled=false` and `previews_enabled=false`. The deleted diagnostic
  Worker returns the expected not-found response.
- Development R2 policy refresh completed through the Cloudflare API:
  `quarantine/` objects expire after seven days, `exports/` objects expire after
  30 days, and the `audit/` prefix in `lythaus-audit-archive-dev` is locked for
  one year. Approved media remains without automatic deletion. Quarantine and
  approved development buckets allow only the configured localhost origin for
  signed browser operations.

## Native boundary and telemetry recheck — 2026-07-28

- Read-only probes returned HTTP `200` for public `/api/health` and `/api/ready`.
- The disabled Apple provider returned the required `provider_unavailable` response.
- The admin `/health` endpoint returned HTTP `200`; the protected admin health route
  failed closed with `admin_subject_key_not_configured` because no development Access
  subject secret has been provisioned.
- The jobs Worker has no public hostname; its development subdomain returned HTTP `404`.
- Cloudflare Workers Observability was queried for the three native development scripts
  over the sampled two-hour window ending 2026-07-28T01:22:28Z with a case-insensitive
  `azure` needle. The query completed with zero matching events. This is negative
  runtime evidence only; repository dependency validation remains the authoritative
  source scan.
- The same telemetry dataset still contains historical pre-refresh readiness events
  from an earlier script version. Those events are retained as diagnostic history and
  do not change the current deployment result.
- PlanetScale's current extension documentation states that `postgis`,
  `postgis_sfcgal`, `postgis_topology` and related extensions are temporarily
  disabled, and its troubleshooting guidance directs permission-denied cases to
  PlanetScale support: https://planetscale.com/docs/postgres/extensions.
- PlanetScale MCP branch recheck found exactly `main` and `development`. `main`
  is still the Frankfurt `PS-5` production branch with zero replicas and no
  application tables; `development` is the Frankfurt `PS-DEV` branch with zero
  replicas, no application tables and the five provisioned login roles. No
  `ci-*` or permanent `ai-development` database branch was created.

## Validation recheck — 2026-07-28

- Native Worker scope/configuration, Azure-dependency, migration, typecheck,
  architecture (21/21), database-connection (6/6), route-guard and OpenAPI
  contract checks passed.
- `validate:production-gates` passed manifest validation. The required-pass mode
  correctly failed closed because all five production gates are incomplete.
- The repository `lint-check` remains unavailable because the `functions`
  workspace declares no `lint` script. This is an unrelated pre-existing CI
  configuration issue and was not changed as part of the native implementation.
- Cloudflare's read-only `GET /user/tenants` returned an empty list. The
  dedicated-account create attempt therefore remains blocked by missing Tenant
  authority (the account API is intended for Tenant/Channel administration), not
  by a naming or resource collision. The required owner action is to create or
  grant a dedicated Lythaus account through Cloudflare Tenant administration,
  then provide its account and zone IDs for the production gate.

## Native hostname boundary refresh - 2026-07-28

- The public Worker was rebuilt from the current repository and uploaded as
  deployment `0d59f963faee43a1a2decc13b9e82726` (tag
  `f939c50929804735ac7800394619058d`). The admin Worker was uploaded as
  deployment `dfcf6370a844495697fc69e964c3cf44` (tag
  `c8cf659212be4915a78ec7f861e8ad81`).
- Both Workers now enforce the configured development hostname at the start of
  every request. Expected `asora.workers.dev` hosts returned HTTP 200 for
  health probes after deployment.
- Requests sent with the legacy `workers.dev` Host values were rejected by the
  Cloudflare edge with HTTP 403; the legacy hostnames do not resolve directly.
  This is routing-boundary evidence, not production-domain evidence.
- The source invariant suite now contains an explicit public/admin hostname
  guard assertion. TypeScript checking and native architecture tests pass after
  the refresh (22/22 architecture invariants).

## Read-only provider snapshot refresh - 2026-07-28

- PlanetScale organization `lythaus` and database `lythaus-core` remain ready
  and Cloudflare-billed through account ending `...e4b3d4ef1af0`. The database
  is PostgreSQL `18.4` on the `development` branch in Frankfurt (`eu-central`)
  and PostgreSQL `17.10` on the empty production `main` branch.
- Branch inventory is exactly `main` and `development`; both have zero
  replicas. `main` remains untouched. The development branch has no application
  schemas or tables.
- Development installed extensions are `hypopg`, `pg_trgm`, `pgcrypto`,
  `plpgsql`, and `unaccent`. `pg_available_extensions` lists PostGIS 3.6.1,
  but the provider allowlist excludes it (`extwlist.pscale_allowed_extensions`),
  so the approved migration baseline remains blocked.
- Current cluster pricing metadata reports PS-DEV at `$15/mo`, PS-5 ARM at
  `$15/mo` plus `$5/mo` per replica, and PS-10 ARM at `$30/mo` plus `$10/mo`
  per replica. No production tier or replica topology has been approved.
- Cloudflare account `e5b7ae46e04698f507b7e4b3d4ef1af0` is mixed-use: it
  contains `asora.co.za`, `lythaus.co`, and `niteowlangling.co.za`, plus
  unrelated Workers and Access applications. This remains a Gate 1 blocker.
- Development Hyperdrive bindings remain cache-disabled and role-specific:
  `lythaus-db-app-dev`, `lythaus-db-admin-dev`, `lythaus-db-jobs-dev`, and
  `lythaus-db-privacy-dev`. No production Hyperdrive configuration exists.
- Existing backend regression suite passed: 208 suites passed, 2,279 tests
  passed, 18 skipped (2,297 total). OpenAPI contract examples passed with 20
  tests passed and 17 skipped. These are repository-level checks and do not
  substitute for live database-backed acceptance.
- A random synthetic `ACCESS_SUBJECT_HMAC_KEY` was provisioned on the
  development admin Worker through the supported secret binding endpoint. The
  protected admin health route now returns `access_required` (HTTP 401) rather
  than `admin_subject_key_not_configured`; no Access identity was supplied.

## Empty-state recheck - 2026-07-28

- A fresh read-only query against the `development` branch returned PostgreSQL
  `18.4`, the installed extension set `hypopg, pg_trgm, pgcrypto, plpgsql,
  unaccent`, and no approved PostGIS capability.
- The only two non-system relations visible to the query are PlanetScale's
  `pscale_extensions.hypopg_hidden_indexes` and
  `pscale_extensions.hypopg_list_indexes` views. No application schema or
  application table exists. This satisfies the empty application-state check
  for development; it does not authorise changes to `main` or replacement of
  the production branch.

## Native Worker acceptance refresh - 2026-07-28

- Compact live probes against the current public development deployment
  returned: `/api/health` HTTP `200` with `status=ok`, `/api/ready` HTTP `200`
  with `status=ready`, and `/.well-known/jwks.json` HTTP `200` with one ES256
  public key and `kid=dev-es256-20260728-r2`. No private key material is stored
  in this evidence.
- The disabled Apple provider returned HTTP `404` with
  `provider_unavailable`; this confirms the launch policy remains fail-closed
  for that provider.
- The admin public `/health` endpoint returned HTTP `200`. The protected
  `/api/admin/health` endpoint returned HTTP `401` with `access_required`,
  confirming the configured subject-key guard is active and no Access identity
  was supplied.
- The current Cloudflare deployment inventory API returned successful reads for
  all three development scripts. The latest deployment records are retained in
  the provider audit trail; this document stores no deployment tokens or secret
  values.
- Development secret-name inventory contains the expected public authentication
  and PII key names (`AUTH_PASSWORD_PEPPER_V1`, `EMAIL_PROVIDER_TOKEN`,
  `GOOGLE_CLIENT_SECRET`, `JWT_KEY_ID`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_JWKS`,
  `PII_ENCRYPTION_KEY_V1`, `PII_HMAC_KEY_V1`, `TURNSTILE_SECRET_KEY`) and the
  admin `ACCESS_SUBJECT_HMAC_KEY`. Jobs has no provider secrets yet; Hive and
  R2 signing credentials remain intentionally absent and related paths must fail
  closed.
- These probes establish native health, readiness, JWKS publication, disabled
  provider behaviour and admin boundary enforcement only. They do not satisfy
  the schema, authentication, media, moderation, privacy, backup, account
  isolation or production cutover gates.

## Development schema and role refresh - 2026-07-28

This section supersedes the earlier empty-schema observations above; those
entries remain as chronological evidence of the pre-migration state.

- Migrations `0000` through `0006` were applied to the synthetic `development`
  branch through the direct PlanetScale administrative path using the approved
  PostGIS fallback. The branch now contains 74 application base tables and one
  media view, 11 feature flags, and zero users, posts, or outbox events.
- Installed extensions are `pgcrypto`, `pg_trgm`, and `unaccent`. PostGIS is
  absent because PlanetScale's immutable extension allowlist excludes it;
  `content.places` therefore stores `boundary_geojson` and does not claim
  PostGIS-backed geography. The geospatial provider decision remains a Gate 3
  and Gate 4 blocker for production.
- Five managed PlanetScale login roles are provisioned on `development`.
  Grants target the generated `pscale_api_*` identifiers resolved by the role
  API; display labels are not SQL-visible in the web-console session. Positive
  and negative permission checks pass for runtime, admin, jobs, privacy, and
  migration roles. No role credentials or secret values are stored here.
- Four development Hyperdrive configurations were refreshed after the
  development role credential rotation. All use the generated branch-qualified
  role, cache-disabled mode, and `sslmode=verify-full`. Live `/api/ready` and
  `/api/feed/discover` probes now return HTTP 200.
- Gate 3 now has schema, grants, TLS, and development connectivity evidence;
  remaining blockers are the supported geospatial decision, production
  credentials/topology, cryptographic rotation evidence, and restore tests.
  Gate 4 remains blocked by end-to-end authentication, email, Hive, media,
  privacy, queue, workflow, and product-transparency acceptance.

## Final development endpoint probe - 2026-07-28

- After the Hyperdrive credential refresh, the public development Worker
  returned HTTP 200 for `/api/health`, `/api/ready`, `/api/feed/discover`, and
  `/.well-known/jwks.json`.
- The public storage endpoint returned HTTP 401 `authentication_required`,
  and the disabled Apple provider returned HTTP 404 `provider_unavailable`.
- The admin development Worker returned HTTP 200 for `/health` and HTTP 401
  `access_required` for `/api/admin/health` without an Access identity.
- These results prove native Worker routing, database readiness, empty
  discovery, JWKS publication, disabled-provider behavior, and admin access
  enforcement in development. They do not authorize production cutover.

## Public API async-error fix - 2026-07-28

- A live invalid-email probe initially exposed an uncaught 1101 because async
  route handlers were returned without `await`; rejected validation promises
  bypassed the enclosing `try/catch`.
- The public dispatch now awaits rejection-prone handlers, and a regression
  invariant covers email, verification, password-reset, post, and media
  handlers.
- The corrected development bundle was uploaded through the authenticated
  Cloudflare MCP at deployment `400041e966dd444eadba19ecb623cc18`, inheriting
  existing bindings and explicitly carrying the development vars and
  `nodejs_compat` metadata. No Cloudflare API token was created.
- Post-deploy probes returned HTTP 200 for health/readiness and HTTP 400 JSON
  responses for invalid email, invalid password, and malformed JSON. This
  closes the development error-boundary defect; authentication success and
  production acceptance remain gated.
- Cloudflare Observability retained the pre-fix events with
  `outcome=exception`, HTTP 500, and the `normalizeEmail` stack. Those events
  are historical evidence for the defect and are not treated as post-fix
  failures; the corrected deployment is the one verified by the live probes.

## Admin API async-error fix - 2026-07-28

- The admin Worker had the same un-awaited rejection path for moderation
  decisions and account-status mutations. Both dispatches now await their
  handlers and are covered by a native architecture invariant.
- The corrected admin development bundle was uploaded through Cloudflare MCP
  as deployment `f4214c1d17d445ada0d643677989ec83`, with explicit development
  vars and inherited Hyperdrive, R2, and Access-subject bindings.
- Post-deploy probes returned HTTP 200 for `/health` and HTTP 401 JSON
  `access_required` for `/api/admin/health` without an Access identity.

## Current-head boundary probes - 2026-07-28

- Windows `curl.exe` probes against the live development hosts returned JSON
  responses with these statuses: public `/api/health` 200, `/api/ready` 200,
  and `/api/feed/discover` 200; public `/api/storage` 401; admin `/health`
  200; and admin `/api/admin/health` 401. This confirms the expected public,
  authenticated, and Access-protected boundaries after the latest deployment.
- `npm run validate:native-azure-dependencies` passed for all three native
  Workers. The native runtime bundle has no Azure host, SDK, or origin
  dependency. The legacy Azure compatibility Worker remains separate.
- PlanetScale Query Insights for the synthetic `development` branch returned
  35 query patterns over the available window. The observed database-side
  p99 values for the small readiness and discovery queries were below 6 ms;
  this is development database evidence only and is not a South Africa-to-
  Europe end-to-end SLO or a production capacity benchmark.

## Development resource inventory and validation recheck - 2026-07-28

- Cloudflare MCP read-only inventory confirms the three native development
  Workers: `lythaus-public-api-development`, `lythaus-admin-api-development`,
  and `lythaus-jobs-development`. The jobs Worker has fetch, queue, and
  scheduled handlers but no route or public hostname.
- Five development Hyperdrive configurations are visible. The four native
  role-specific configurations are cache-disabled, target the Frankfurt
  PlanetScale host, and expose `sslmode=verify-full`; the older
  `lythaus-core-fresh` configuration remains separate and is not used by the
  native development Workers.
- Development R2 buckets, twelve queues including six dead-letter queues, five
  Workflows, and the `lythaus-config-dev` KV namespace are present. Workflow
  inventory shows one successful retention-cleanup instance and no errored
  instances at inventory time.
- Cloudflare Access contains an existing Lythaus Admin API application with an
  explicit administrator allow policy and deny-all fallback. This is shared
  account evidence only and does not satisfy the dedicated production-account
  gate.
- Cloudflare Email Sending limits are readable, but no production sending
  domain or delivery acceptance has been proved. Turnstile widget inventory is
  not available through the current API session; the development Worker keeps
  registration Turnstile disabled and production remains gated.
- Current-head validation passed: TypeScript native typecheck, 24 native
  architecture invariants, native scope validation, native Worker config
  validation, migration baseline validation, extension-reference validation,
  and `git diff --check`. The provisioned Worker validator remains correctly
  fail-closed until production account and resource IDs are supplied.
- No Cloudflare API token was created. All provider inventory and Worker
  deployment actions recorded here used the authenticated Cloudflare MCP.

## Owner data-disposition decision - pending

- The implementation remains under the safe default of selective preservation.
  No owner-signed clean-state declaration has been located in the repository.
- Before Azure deletion or production cutover, the owner must select and sign
  one of: (a) clean-state authorised, confirming Azure contains only
  development/test data and no active users, unresolved privacy requests,
  legal holds, or contractual retention obligations; or (b) selective
  preservation authorised, identifying the required data classes and preserving
  identity continuity and reconciliation evidence.
- This pending decision does not block synthetic development work. It blocks
  Azure deletion and any cutover that could abandon unresolved user records.

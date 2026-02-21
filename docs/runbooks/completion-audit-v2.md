# Lythaus (formerly Asora) Completion Audit v2

Last updated: 2026-02-19  
Scope: repo-verified implementation status plus explicitly marked external verification items.

## Status legend

- `closed`: implemented and verified in repo.
- `partial`: implemented in part; material gap remains.
- `open`: gap not closed in repo.
- `external`: cannot be closed from repo alone.

## Single numbered gap register (G-001..G-026)

### G-001
- **Area**: Auth
- **Status**: `partial`
- **Severity**: Blocker
- **Gap**: Provider choices exist in app, but end-to-end production IdP wiring still requires live environment validation.
- **Evidence**: `lib/features/auth/application/oauth2_service.dart`, `lib/features/auth/presentation/auth_choice_screen.dart`, `functions/src/auth/service/authorizeService.ts:210`
- **Acceptance**: Real-device sign-up/sign-in succeeds for Google/Apple/World/Email and returns JWT usable for authenticated APIs.

### G-002
- **Area**: Mobile UI, Backend API
- **Status**: `partial`
- **Severity**: High
- **Gap**: Guest entry is implemented in app, but server-side write-route auth enforcement is not guarded by a single inventory gate.
- **Evidence**: `lib/features/auth/presentation/auth_gate.dart:56`, `lib/ui/screens/app_shell.dart:82`, `functions/src/feed/routes/feed_discover_get.function.ts:33`
- **Acceptance**: CI route scan blocks any write route without auth guard; unauthenticated writes return `401/403`.

### G-003
- **Area**: Data
- **Status**: `closed`
- **Severity**: Medium
- **Gap**: UUIDv7 consistency was previously mixed.
- **Evidence**: `functions/src/posts/posts_create.function.ts`, `functions/src/custom-feeds/customFeedsService.ts`, `functions/src/appeals/appealsService.ts`
- **Acceptance**: New canonical entities use UUIDv7 create paths.

### G-004
- **Area**: Moderation
- **Status**: `closed`
- **Severity**: Medium
- **Gap**: Prior `flags` vs `content_flags` mismatch.
- **Evidence**: `functions/src/moderation/service/reviewQueueService.ts:101`, `functions/src/shared/clients/cosmos.ts:52`, `infra/terraform/envs/dev/main.tf`
- **Acceptance**: Runtime and Terraform container naming aligned.

### G-005
- **Area**: Data
- **Status**: `closed`
- **Severity**: Medium
- **Gap**: `privacy_audit` container provisioning mismatch.
- **Evidence**: `functions/src/privacy/service/exportService.ts`, `infra/terraform/envs/dev/main.tf`, `infra/terraform/envs/staging/main.tf`, `infra/terraform/envs/prod/main.tf`
- **Acceptance**: Export/delete audit writes succeed against provisioned container.

### G-006
- **Area**: Data
- **Status**: `closed`
- **Severity**: Medium
- **Gap**: `reputation_audit` container provisioning mismatch.
- **Evidence**: `functions/src/shared/services/reputationService.ts:116`, `infra/terraform/envs/dev/main.tf`, `infra/terraform/envs/staging/main.tf`, `infra/terraform/envs/prod/main.tf`
- **Acceptance**: Reputation adjustments are audit-persisted in provisioned container.

### G-007
- **Area**: Mobile UI
- **Status**: `partial`
- **Severity**: Medium
- **Gap**: News feed is a distinct surface inside home, but not a separate navigation destination unless product signs off that this satisfies baseline.
- **Evidence**: `lib/ui/screens/home/home_feed_navigator.dart`, `lib/ui/screens/home/news_feed.dart`, `lib/state/providers/feed_providers.dart`
- **Acceptance**: Product sign-off on chip-switched News, or dedicated route/deeplink implemented.

### G-008
- **Area**: AI authenticity, Moderation
- **Status**: `partial`
- **Severity**: High
- **Gap**: Publish-time AI block and label-required behavior exists, but policy behavior depends on live Hive configuration and fail-mode decisions.
- **Evidence**: `functions/src/feed/routes/createPost.ts:155`, `functions/src/feed/routes/createPost.ts:225`, `functions/src/posts/service/moderationUtil.ts`
- **Acceptance**: Staging drill confirms intended behavior with vendor available and unavailable.

### G-009
- **Area**: Moderation, Auditability
- **Status**: `closed`
- **Severity**: Medium
- **Gap**: Override-to-audit persistence proof.
- **Evidence**: `functions/src/admin/routes/appeals_override.function.ts`, `functions/src/admin/auditLogger.ts`
- **Acceptance**: Override actions persist immutable audit entries and are retrievable.

### G-010
- **Area**: Backend API, Security
- **Status**: `partial`
- **Severity**: High
- **Gap**: Rate limiting exists on many critical routes, but no full write-surface enforcement inventory gate.
- **Evidence**: `functions/src/media/media_upload_url.function.ts`, `functions/src/users/users_me_update.function.ts`, `functions/src/moderation/routes/moderation_cases_decide.function.ts`
- **Acceptance**: CI enumerates write routes and fails if policy/wrapper missing.

### G-011
- **Area**: DevOps, Edge, Security
- **Status**: `partial`
- **Severity**: High
- **Gap**: Code-level cache controls are in place, but deployed Cloudflare route/rule state must be verified externally.
- **Evidence**: `cloudflare/worker.ts:10`, `workers/feed-cache/src/index.js:8`, `functions/src/feed/routes/feed_discover_get.function.ts:81`, `functions/src/feed/routes/feed_news_get.function.ts:83`, `functions/src/feed/routes/feed_user_get.function.ts:70`
- **Acceptance**: Staging/prod header captures + Cloudflare analytics confirm only anonymous discover/news are cached.

### G-012
- **Area**: Backend API
- **Status**: `closed`
- **Severity**: High
- **Gap**: Media URL ownership/integrity binding.
- **Evidence**: `functions/src/media/mediaStorageClient.ts:210`, `functions/src/media/mediaStorageClient.ts:291`, `functions/src/posts/posts_create.function.ts:163`, `functions/src/posts/posts_update.function.ts:123`, `functions/src/feed/routes/createPost.ts:144`
- **Acceptance**: Cross-user media attach attempts are rejected.

### G-013
- **Area**: Store Release
- **Status**: `external`
- **Severity**: Blocker
- **Gap**: Play/App Store console artifacts and approvals remain external, but repo now enforces evidence capture and signing validation workflow.
- **Evidence**: `docs/runbooks/mobile-store-checklist.md`, `docs/compliance/google-play-data-safety.md`, `docs/runbooks/store-submission-evidence.md`, `.github/workflows/launch-readiness-gate.yml`
- **Acceptance**: Store records, forms, screenshots, tracks, reviewer notes completed.

### G-014
- **Area**: Auth
- **Status**: `partial`
- **Severity**: High
- **Gap**: `sub == internal user.id` contract requires live IdP verification; refresh-path behavior is split between `/auth/token` and `/auth/refresh`.
- **Evidence**: `functions/src/shared/http/authContext.ts:36`, `functions/src/auth/service/tokenService.ts:334`, `functions/src/auth/routes/auth_token_refresh.function.ts:31`
- **Acceptance**: Single authoritative refresh behavior and production validation that `sub` maps to canonical user id.

### G-015
- **Area**: Privacy
- **Status**: `partial`
- **Severity**: High
- **Gap**: DSR routes exist and client/server confirmation mechanics are implemented, but end-to-end staging/prod drill evidence is still required.
- **Evidence**: `functions/src/privacy/routes/exportUser.ts`, `functions/src/privacy/routes/deleteUser.ts`, `functions/src/privacy/service/deleteService.ts:69`, `lib/features/privacy/services/privacy_api.dart:131`
- **Acceptance**: Export and delete drills executed with evidence packet.

### G-016
- **Area**: Security, DevOps
- **Status**: `partial`
- **Severity**: High
- **Gap**: Secret scanning and fail-fast validation exist, but historical rotation evidence remains external.
- **Evidence**: `.github/workflows/ci.yml:204`, `scripts/secret-scan.sh:45`, `functions/src/shared/startup-validation.ts`, `functions/src/auth/service/jwtService.ts`
- **Note**: Current scan command runs `gitleaks detect` over repository source; a full-history evidence artifact still needs explicit operational capture.
- **Acceptance**: Full-history scan evidence and rotation logs available for audit.

### G-017
- **Area**: Release Engineering
- **Status**: `closed`
- **Severity**: Low
- **Gap**: Coverage gate authority ambiguity.
- **Evidence**: `.github/workflows/ci.yml`, `scripts/check_coverage_gates.sh`, `coverage/coverage_baseline.json`
- **Acceptance**: CI blocks PRs below baseline thresholds for configured scopes.

### G-018
- **Area**: Backend API, Data
- **Status**: `partial`
- **Severity**: Medium
- **Gap**: Curated news ingestion code exists, but live source config/schedule activation must be proven per env.
- **Evidence**: `functions/src/feed/service/newsIngestionService.ts`, `functions/src/feed/routes/feed_news_get.function.ts`
- **Acceptance**: Staging/prod ingestion cadence and attribution verified.

### G-019
- **Area**: Marketing Ops
- **Status**: `external`
- **Severity**: Medium
- **Gap**: Editorial workflow/staffing/calendar is operational, not repo-closed.
- **Evidence**: `functions/src/feed/routes/feed_news_get.function.ts`, `docs/runbooks/release-milestones-m0-m5.md`
- **Acceptance**: Published workflow, owners, and content calendar for launch window.

### G-020
- **Area**: Store Release, Mobile UI
- **Status**: `partial`
- **Severity**: Blocker
- **Gap**: In-repo manifest and CI contracts are now present; remaining blocker is external store submission and approval.
- **Evidence**: `android/app/src/main/AndroidManifest.xml`, `ios/Runner/Info.plist`, `ios/Runner/PrivacyInfo.xcprivacy`, `.github/workflows/ci.yml`, `.github/workflows/launch-readiness-gate.yml`
- **Acceptance**: Release manifest checks stay green and store submissions pass with no policy rejection.

### G-021
- **Area**: DevOps, Observability
- **Status**: `partial`
- **Severity**: Blocker
- **Gap**: Recipient wiring and tfvars validation are in-repo; outstanding work is live alert drill and on-call confirmation.
- **Evidence**: `infra/terraform/modules/observability/main.tf`, `infra/terraform/envs/staging/staging.tfvars`, `infra/terraform/envs/prod/prod.tfvars`, `infra/terraform/envs/staging/variables.tf`, `infra/terraform/envs/prod/variables.tf`, `scripts/validate-alert-routing-config.sh`, `.github/workflows/ci.yml`
- **Acceptance**: Synthetic alert drill confirms human routing and runbook execution.

### G-022
- **Area**: DevOps, Infra
- **Status**: `partial`
- **Severity**: High
- **Gap**: Env stacks and tfvars indicate separation, but deployed isolation and secret-scope governance need external verification.
- **Evidence**: `infra/terraform/envs/dev/main.tf`, `infra/terraform/envs/staging/main.tf`, `infra/terraform/envs/prod/main.tf`, `infra/terraform/envs/staging/staging.tfvars`, `infra/terraform/envs/prod/prod.tfvars`
- **Acceptance**: Distinct live RGs/subscriptions/Key Vault scopes with restricted production access.

### G-023
- **Area**: Analytics, Growth Ops
- **Status**: `partial`
- **Severity**: Medium
- **Gap**: Taxonomy exists, but production funnel validation is external.
- **Evidence**: `lib/core/analytics/analytics_events.dart`, `docs/analytics/PRODUCT_DASHBOARD.md`
- **Acceptance**: Dashboard shows expected funnel counts for staged cohort.

### G-024
- **Area**: Legal, Business
- **Status**: `external`
- **Severity**: Blocker
- **Gap**: Entity formation and account ownership are external actions.
- **Evidence**: `docs/runbooks/business-entity-decision-tree.md`
- **Acceptance**: Legal entity owns store accounts, cloud subscriptions, domain, and contract authority.

### G-025
- **Area**: Infra, Release Safety
- **Status**: `partial`
- **Severity**: High
- **Gap**: Safe apply/smoke tooling exists, but production-safe execution depends on resolving provisioning divergence first.
- **Evidence**: `scripts/tf-no-destroy-check.sh`, `scripts/smoke-trust-endpoints.sh`, `docs/runbooks/terraform-safe-apply-and-smoke.md`
- **Acceptance**: No-destroy plans and smoke checks pass on canonical IaC path.

### G-026
- **Area**: Data, Infra
- **Status**: `open`
- **Severity**: Blocker
- **Gap**: Cosmos contract divergence between runtime expectations and provisioning tracks remains unresolved.
- **Evidence**: `functions/src/shared/clients/cosmos.ts:45`, `infra/terraform/envs/dev/main.tf`, `docs/runbooks/cosmos-container-contract.md:79`
- **Acceptance**: Single canonical provisioning path covers all runtime containers with matching partition keys/indexes; staging fresh deploy smoke passes.

## Immediate priority order

1. G-026 (canonical Cosmos contract + migration plan)
2. G-001 and G-014 (auth E2E and refresh-path unification)
3. G-020 and G-013 (store readiness blockers)
4. G-021 and G-022 (operational alerting + verified env separation)
5. G-010 and G-011 (policy enforcement and edge cache assurance)

# Lythaus (formerly Asora) Completion Audit v2

Last updated: 2026-02-16  
Scope: Repo-verified status only (`true`, `partial`, `external verification required`).

## Status legend

- `true`: Implemented and evidenced in-repo.
- `partial`: Implemented in part, but has a material gap or mismatch.
- `external verification required`: Cannot be closed from repo code/config alone.

## Completion matrix

| Area | Status | Evidence | Notes |
|---|---|---|---|
| Repo structure and CI presence | `true` | `.github/workflows/ci.yml:96`, `.github/workflows/ci.yml:204`, `.github/workflows/ci.yml:277`, `.github/workflows/ci.yml:379` | CI gates for workflow lint, secret scan, Flutter coverage, and Functions tests are present. |
| OpenAPI and extension-bundle gates | `true` | `.github/workflows/ci.yml:96`, `.github/workflows/ci.yml:113` | Extension bundle v4 and OpenAPI lint/bundle are enforced in CI. |
| Flutter dependency versions claimed in prior audit | `partial` | `pubspec.yaml:36`, `pubspec.yaml:37`, `pubspec.yaml:38`, `pubspec.yaml:39`, `pubspec.yaml:42` | Prior write-up used stale version numbers. Current pinned values differ. |
| Android release signing hard-fail | `true` | `android/app/build.gradle.kts:67`, `android/app/build.gradle.kts:68`, `.github/workflows/mobile-release-build.yml:59` | Release signing preconditions are enforced in Gradle and workflow. |
| Android crash + messaging plugin wiring | `true` | `android/app/build.gradle.kts:10`, `android/app/build.gradle.kts:12` | Firebase Google Services and Crashlytics plugins are enabled. |
| iOS project presence | `true` | `ios/Runner/Info.plist:1` | iOS project exists in repo. |
| iOS store-readiness permissions metadata | `true` | `pubspec.yaml:50`, `pubspec.yaml:52`, `ios/Runner/Info.plist:48`, `ios/Runner/Info.plist:50`, `ios/Runner/Info.plist:52` | Usage description keys for camera/photo library/Face ID are now present for shipped capabilities. |
| Auth provider picker in app UI | `true` | `lib/features/auth/presentation/auth_choice_screen.dart:130`, `lib/features/auth/presentation/auth_choice_screen.dart:213` | Google/Apple/World ID/Email options are present in provider picker. |
| OAuth PKCE client flow | `true` | `lib/features/auth/application/oauth2_service.dart:180` | AppAuth `authorizeAndExchangeCode` is used with PKCE flow. |
| Token refresh and rotation | `true` | `functions/src/auth/service/tokenService.ts:107`, `functions/src/auth/service/tokenService.ts:285`, `functions/src/auth/service/tokenService.ts:393`, `lib/features/auth/application/oauth2_service.dart:245` | Backend and mobile refresh paths are implemented. |
| Backend OAuth authorize production readiness | `partial` | `functions/src/auth/service/authorizeService.ts:87`, `functions/src/auth/service/authorizeService.ts:261` | Simulated fallback removed; endpoint now requires upstream authenticated subject (or explicit test-only override). Full IdP sign-up/sign-in still requires environment/provider configuration and real-device validation. |
| Guest browse entrypoint behavior | `true` | `lib/features/auth/presentation/auth_gate.dart:56`, `lib/features/auth/presentation/auth_choice_screen.dart:179`, `lib/features/auth/application/auth_providers.dart:164`, `lib/ui/screens/app_shell.dart:63` | Guest mode is explicit and routes into app shell read paths while create is blocked for guests. |
| Anonymous discover/news endpoints | `true` | `functions/src/feed/routes/feed_discover_get.function.ts:86`, `functions/src/feed/routes/feed_news_get.function.ts:88` | Discover and news endpoints are anonymous-capable. |
| Tier-based custom feed limits | `true` | `functions/src/custom-feeds/customFeedsService.ts:16` | Limits are `free=1`, `premium=2`, `black=5` (plus admin tier). |
| Daily post limit enforcement | `true` | `functions/src/posts/posts_create.function.ts:79` | Server enforces daily limits and returns throttling response when exceeded. |
| AI label + media moderation gate | `true` | `functions/src/posts/posts_create.function.ts:170`, `functions/src/posts/posts_create.function.ts:197` | Post create enforces media moderation and AI label requirement path. |
| Media upload tier size controls | `true` | `functions/src/media/media_upload_url.function.ts:83` | Tier-normalized upload size limits are enforced. |
| Post deletion behavior | `true` | `functions/src/posts/service/postsService.ts:263` | Soft-delete path is implemented (`status: 'deleted'`). |
| Moderation queue and console presence | `true` | `functions/src/moderation/routes/reviewQueue.ts:1`, `lib/features/moderation/presentation/moderation_console/moderation_console_screen.dart:1` | Backend route and Flutter moderation console are present. |
| Cosmos container naming parity (app vs Terraform) | `true` | `functions/src/shared/clients/cosmos.ts:50`, `functions/src/moderation/service/reviewQueueService.ts:101`, `infra/terraform/envs/dev/main.tf:31`, `infra/terraform/envs/prod/main.tf:36` | Container names are now aligned to `content_flags` and `custom_feeds` defaults (env-overridable via `COSMOS_*_CONTAINER`). |
| Legacy vs env Terraform path convergence | `partial` | `infra/main.tf:218`, `infra/terraform/envs/dev/main.tf:1`, `infra/terraform/envs/prod/main.tf:1` | Two IaC layouts coexist; operational source-of-truth must be explicitly enforced in release process. |
| Prod/dev Cosmos scaling posture | `true` | `infra/terraform/envs/dev/main.tf:16`, `infra/terraform/envs/prod/main.tf:16` | Dev/staging use serverless; prod uses autoscale mode. |
| Notifications pipeline completeness | `partial` | `android/app/build.gradle.kts:10`, `android/app/build.gradle.kts:12`, `functions/tests/notifications/authenticated.test.ts:1` | Client/infra wiring and backend tests exist; end-to-end live credential validation is external. |
| Subscription purchase implementation | `partial` | `lib/services/subscription/subscription_service.dart:176`, `functions/src/payments/subscription_status.function.ts:10` | Purchase and restore are placeholders; tier status endpoint is intentionally scaffolded. |
| Cloudflare personalized-feed cache safety | `partial` | `cloudflare/worker.ts:10`, `cloudflare/worker.ts:25`, `workers/feed-cache/src/index.js:7`, `functions/src/feed/routes/feed_discover_get.function.ts:81`, `functions/src/feed/routes/feed_news_get.function.ts:83`, `functions/src/feed/routes/feed_user_get.function.ts:70` | Anonymous cache is now explicitly allowlisted to discover/news; authenticated and user-feed responses are `private, no-store`. Deployed route/rule state still requires external verification. |
| Docs/runbooks trust artifacts | `true` | `docs/trust/RECEIPTS_NOT_SCORES.md:1`, `docs/security/DEVICE_INTEGRITY_ENFORCEMENT.md:1`, `docs/runbooks/release-milestones-m0-m5.md:1` | Trust/security/runbook documentation exists in repo. |

## Gap register verification (G-001..G-010)

| Gap | Status | Summary evidence |
|---|---|---|
| G-001 Auth providers end-to-end | `partial` | `functions/src/auth/service/authorizeService.ts:87` removes simulated user and requires authenticated subject; real provider sign-up/sign-in completion still depends on production IdP setup and callback wiring. |
| G-002 Guest mode entrypoint | `true` | Guest mode state and entry are implemented in `lib/features/auth/application/auth_providers.dart:164`, `lib/features/auth/presentation/auth_gate.dart:56`, and guest write gating in `lib/ui/screens/app_shell.dart:63`. |
| G-003 UUIDv7 canonical IDs | `true` | UUIDv7 is now used on create paths for posts/feeds/appeals/votes/comments/flags/sessions in `functions/src/posts/posts_create.function.ts:146`, `functions/src/custom-feeds/customFeedsService.ts:134`, `functions/src/appeals/appealsService.ts:20`, `functions/src/feed/routes/createPost.ts:161`, `functions/src/feed/routes/comments.ts:161`, `functions/src/moderation/service/flagService.ts:155`, `functions/src/auth/service/authorizeService.ts:112`. |
| G-004 Moderation flags container mismatch | `true` | Review queue and shared Cosmos target `content_flags` (`functions/src/moderation/service/reviewQueueService.ts:101`, `functions/src/shared/clients/cosmos.ts:52`) aligned with Terraform env stacks (`infra/terraform/envs/dev/main.tf:31`). |
| G-005 Missing `privacy_audit` container | `true` | Terraform env stacks now provision `privacy_audit` (`infra/terraform/envs/dev/main.tf:91`, `infra/terraform/envs/staging/main.tf:92`, `infra/terraform/envs/prod/main.tf:107`) and service writes target it (`functions/src/privacy/service/exportService.ts:492`). |
| G-006 Missing `reputation_audit` container | `true` | Terraform env stacks now provision `reputation_audit` (`infra/terraform/envs/dev/main.tf:96`, `infra/terraform/envs/staging/main.tf:97`, `infra/terraform/envs/prod/main.tf:113`) and service writes target it (`functions/src/shared/services/reputationService.ts:116`). |
| G-007 News board dedicated UI | `true` | Dedicated news feed surface exists and is reachable in home feed navigator (`lib/ui/screens/home/news_feed.dart:10`, `lib/ui/screens/home/home_feed_navigator.dart:307`). |
| G-008 AI block UX + appeal path | `true` | Backend returns appeal metadata (`functions/src/posts/posts_create.function.ts:170`, `functions/src/posts/posts_update.function.ts:105`) and mobile blocked banner exposes appeal CTA (`lib/features/feed/presentation/create_post_screen.dart:953`, `lib/services/appeal_provider.dart:11`). |
| G-009 Moderator override immutable audit | `true` | Override flow records audit entries in `audit_logs` (`functions/src/admin/routes/appeals_override.function.ts:273`, `functions/src/admin/auditLogger.ts:39`), retrievable by audit endpoint (`functions/src/admin/routes/audit_get.function.ts:27`). |
| G-010 Rate limiting coverage for critical writes | `partial` | Explicit write policies now applied to create/update/delete post, media upload, appeals create/vote, moderation flag/vote (`functions/src/posts/posts_create.function.ts:350`, `functions/src/posts/posts_update.function.ts:272`, `functions/src/posts/posts_delete.function.ts:62`, `functions/src/media/media_upload_url.function.ts:142`, `functions/src/appeals/appeals_create.function.ts:72`, `functions/src/appeals/appeals_vote.function.ts:64`). A full route-by-route inventory gate is still pending for non-critical write surfaces. |

## Gap register verification (G-011..G-020)

| Gap | Status | Summary evidence |
|---|---|---|
| G-011 Cloudflare cache scope | `partial` | Endpoint headers now enforce anonymous-vs-auth cache semantics (`functions/src/feed/routes/feed_discover_get.function.ts:81`, `functions/src/feed/routes/feed_news_get.function.ts:83`, `functions/src/feed/routes/feed_user_get.function.ts:70`) and workers now allowlist anonymous cache paths (`cloudflare/worker.ts:10`, `workers/feed-cache/src/index.js:7`). External deployment/rule verification remains required; runbook added at `docs/runbooks/cloudflare-cache-validation.md:1`. |
| G-012 Media ownership/integrity binding | `true` | Media URL ownership validation is now enforced on create/update routes and legacy create route (`functions/src/posts/posts_create.function.ts:163`, `functions/src/posts/posts_update.function.ts:123`, `functions/src/feed/routes/createPost.ts:144`). Unit/route tests added (`functions/tests/media/mediaStorageClient.ownership.test.ts:1`, `functions/tests/posts/posts.route.test.ts:174`, `functions/tests/feed/createPost.route.test.ts:252`). |
| G-013 Store console artifacts | `external verification required` | Play/App Store account records, listing assets, form completion, and rollout tracks remain external to repo workflows. |
| G-014 JWT `sub == user.id` contract | `partial` | Token issuance path uses internal user id as `sub` (`functions/src/auth/service/tokenService.ts:230`) and test coverage now asserts decoded `sub` (`functions/tests/auth/token.validation.test.ts:367`). Full end-to-end guarantee still depends on production IdP/provisioning config validation. |
| G-015 DSR export/delete end-to-end | `partial` | Client + backend wiring remains in place (`lib/features/privacy/services/privacy_api.dart:74`, `functions/src/privacy/service/exportService.ts:492`, `functions/src/privacy/service/deleteService.ts:281`) and container mismatches were previously fixed. Staging/live DSR drill execution is still external verification. |
| G-016 Secrets hardening and fail-fast | `partial` | Unsafe JWT fallback removed (`functions/src/auth/service/jwtService.ts:25`) and strict startup fail-fast added for production/strict mode (`functions/src/shared/startup-validation.ts:69`), with tests (`functions/tests/shared/startup-validation.test.ts:147`). Historical secret scan/rotation evidence remains external operational proof. |
| G-017 Coverage workflow contradiction | `true` | Auxiliary coverage workflows were moved to manual dispatch (`.github/workflows/coverage-gate.yml:4`, `.github/workflows/tests-and-coverage.yml:4`, `.github/workflows/coverage.yml:10`), leaving `.github/workflows/ci.yml` as the authoritative PR gate. |
| G-018 Curated news operational activation | `partial` | Ingestion and source attribution are implemented in code (`functions/src/feed/service/newsIngestionService.ts:263`, `functions/src/posts/service/postsService.ts:490`), but live cadence/source env activation must be verified per environment. |
| G-019 Editorial/journalist operations | `external verification required` | Editorial governance, staffing cadence, and content calendar are operational artifacts not fully represented as executable repo code. |
| G-020 Store release compliance for image scope | `partial` | iOS runtime permission metadata for image + biometric flows is now present (`ios/Runner/Info.plist:48`, `ios/Runner/Info.plist:50`, `ios/Runner/Info.plist:52`). Console-side privacy forms/testing tracks remain external completion tasks. |

## Remaining high-priority in-repo items

1. Complete full backend authorize-to-provider sign-up/sign-in flow (G-001) beyond upstream-subject validation.
2. Add a route inventory check that enforces explicit rate-limit policy on every write route (G-010 closure gate).
3. Add an automated endpoint-class cache contract test matrix for all feed endpoints (discover/news/user + any future feed routes).

## External verification required before production signoff

1. Staging/prod cloud health and latest deployment run outcomes.
2. Cloudflare deployed route/rule state for authenticated cache bypass and WAF/access behavior.
3. Play Console/App Store Connect account state, listing artifacts, and review form completion.
4. Live push notification credentials and real-device deep-link validation.
5. Operations routing: alert action groups, on-call ownership, and incident escalation wiring.


What remains to fully close

G-001: complete real production IdP authorize/session flow end-to-end (not just subject guard).
G-010: add and enforce a strict repo-wide write-route rate-limit inventory gate.

Gap status after this pass

Closed in-repo: G-012, G-017.
Partial (code improved, external verification still needed): G-011, G-014, G-015, G-016, G-018, G-020.
External-only: G-013, G-019.
External tasks remaining (for G-011..G-020)

Verify deployed Cloudflare routes/rules and cache behavior in staging/prod using the new checklist in cloudflare-cache-validation.md.
Complete Play Console and App Store Connect artifacts/forms/tracks (G-013, G-020).
Run live DSR export/delete drills in staging/prod and archive evidence (G-015).
Run historical secret scan + rotation evidence packet (G-016).
Validate real IdP provisioning contract that JWT sub always maps to canonical internal user ID in production flows (G-014).
Activate/monitor curated news ingestion with real env/source configs (G-018).
Finalize editorial workflow, staffing, and 30-day content calendar artifacts (G-019).

Summary
Completed the same pass for G-021..G-025: closed what is code-addressable, added tests/runbooks/workflow safety gates, and updated the audit.

Gap Status

G-021 Monitoring + alerting: partial
Wired observability module support into env stacks: main.tf (line 114), main.tf (line 115), main.tf (line 132).
Added drill runbook with owners/escalation flow: observability-alerting-drill.md (line 1).
External proof still needed: live alert delivery + on-call routing in Azure.
G-022 Staging/prod separation: partial
Removed hardcoded prod TODO RG and moved to validated prod vars: main.tf (line 12), variables.tf (line 11).
Added prod validation to block shared RG reuse: variables.tf (line 17).
Env tfvars now explicit per env: staging.tfvars (line 1), prod.tfvars (line 1).
External proof still needed: actual RG/account provisioning + secret isolation.
G-023 Analytics taxonomy + funnel coverage: partial
Added missing funnel events: analytics_events.dart (line 44), analytics_events.dart (line 93), analytics_events.dart (line 111).
Emission wired at required steps:
auth choice selection: auth_choice_screen.dart (line 52)
first feed load: home_feed_navigator.dart (line 388)
first post attempt: create_post_screen.dart (line 424)
Dashboard doc updated with core funnel + KQL: PRODUCT_DASHBOARD.md (line 7).
Test coverage added: auth_choice_screen_test.dart (line 114), home_feed_navigator_test.dart (line 148), create_post_screen_test.dart (line 281), analytics_events_test.dart (line 7).
G-024 Legal/business checklist: partial
Added decision tree + minimum viable checklist artifact: business-entity-decision-tree.md (line 1).
External execution still required (entity formation, banking, store ownership).
G-025 Terraform safety + receipt/trust smoke: partial
Added no-destroy plan guard: tf-no-destroy-check.sh (line 1).
Added safe apply + Key Vault + smoke runbook: terraform-safe-apply-and-smoke.md (line 1).
Added trust smoke script: smoke-trust-endpoints.sh (line 1).
Wired smoke into E2E workflow: e2e-integration.yml (line 291).

External Tasks Still Required

Configure real alert recipients/action groups and run synthetic alert drill in Azure (G-021).
Provision real staging/prod resource groups/accounts and confirm no shared infra/secrets (G-022).
Validate post-deploy funnel volumes/conversions in live analytics dashboard (G-023).
Complete legal entity formation + ownership of Apple/Google/cloud/domain assets (G-024).
Execute staged terraform plan/apply with no-destroy checks and verify Key Vault references in live app settings (G-025).

Open Questions Status

Auth token endpoint and refresh behavior: POST /api/auth/token is implemented with refresh-token store validation and rotation. Evidence: token.ts (line 17), tokenService.ts (line 305), tokenService.ts (line 334), tokenService.ts (line 393), refreshTokenStore.ts (line 46), refreshTokenStore.ts (line 136).

Auth refresh mismatch: A second endpoint POST /api/auth/refresh currently does signature verification and re-issue without store-backed rotation/revocation checks. Evidence: auth_token_refresh.function.ts (line 31), auth_token_refresh.function.ts (line 34).

Verdict: Partially closed. Core token flow is strong, but dual refresh behavior is inconsistent and should be unified/deprecated.

Guest mode product decision: Guest mode is implemented and reachable from app entry. Evidence: auth_choice_screen.dart (line 225), auth_choice_screen.dart (line 191), auth_gate.dart (line 56), auth_gate.dart (line 60).

Guest write gating: Create is blocked for guests in shell. Evidence: app_shell.dart (line 82).

Decision artifact: Guest/authed capability matrix is documented. Evidence: screen-inventory.md (line 104).

Verdict: Closed for baseline anonymous browsing.

Cosmos container single source of truth: I added a contract inventory doc mapping runtime names to Terraform names, partition keys, and indexes, with confirmed mismatches. Evidence: cosmos-container-contract.md (line 1), cosmos-container-contract.md (line 79).

Verdict: Closed as an evidence artifact; remediation decisions still needed for mismatched contracts.

Cloudflare caching compliance: Code-level controls are present. Feed endpoints use private, no-store for authenticated/personalized responses and cacheable headers only for anonymous discover/news. Evidence: feed_discover_get.function.ts (line 81), feed_news_get.function.ts (line 83), feed_user_get.function.ts (line 70). Workers enforce allowlist and auth bypass. Evidence: worker.ts (line 10), worker.ts (line 28), worker.ts (line 33), index.js (line 8), index.js (line 22), index.js (line 26).

Verdict: Partially closed. Runtime Cloudflare dashboard/routes deployment still needs external validation.

Media ownership enforcement: Implemented server-side. URL must match configured storage account/container and authenticated owner path; optional blob existence/freshness checks are supported. Evidence: mediaStorageClient.ts (line 210), mediaStorageClient.ts (line 291), mediaStorageClient.ts (line 316). Enforcement on create/update and legacy path exists. Evidence: posts_create.function.ts (line 163), posts_update.function.ts (line 123), createPost.ts (line 144).

Verdict: Closed in code.

Reputation rewards gating: Not server-enforced end-to-end yet. Current subscription status is explicitly placeholder and purchase flows are unimplemented. Evidence: subscription_status.function.ts (line 10), subscription_status.function.ts (line 38), subscription_service.dart (line 175). Backend search does not show reward redemption endpoints.

Verdict: Open.

Store readiness artifacts: In-repo checklists exist, but console artifacts are external. Evidence: mobile-store-checklist.md (line 46), google-play-data-safety.md (line 1).

Verdict: Open externally (Play/App Store records, forms, tracks, screenshots, reviewer notes).

Operational readiness: Observability module exists, but env tfvars currently show empty alert recipients and empty function app resource ID, so alert routing is not fully wired. Evidence: main.tf (line 88), main.tf (line 108), staging.tfvars (line 13), staging.tfvars (line 14), prod.tfvars (line 12), prod.tfvars (line 13).

Verdict: Open externally (wire action groups/on-call and run drills).

What I Added

New evidence doc: cosmos-container-contract.md.
Still Required Outside Repo

Cloudflare runtime proof: export active routes/worker bindings + staging/prod header captures.
Store console proof: Play/App Store records, Data Safety/privacy forms, testing tracks, screenshots, reviewer notes.
Ops proof: configured action groups/on-call targets and completed synthetic alert drill evidence.
Business decision: canonical Cosmos provisioning path and migration plan for mismatched container contracts.
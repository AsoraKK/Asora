# Release Milestones M0-M5 (Android-first)

Last updated: 2026-02-19
Scope: In-repo execution paths and external handoffs.

## M0: Internal CI and staging readiness

In-repo automation:
- CI gates: `.github/workflows/ci.yml`
- OpenAPI gates: `.github/workflows/openapi.yml`
- Function deploy workflow with environment dispatch:
  - `.github/workflows/deploy-asora-function-dev.yml`
  - `.github/workflows/deploy-asora-function-staging.yml`
  - `workflow_dispatch` inputs:
    - `target_environment`: `dev` or `staging`
    - `function_app_name`: optional override
    - `resource_group`: optional override
- Dedicated staging entrypoint:
  - Run `deploy-asora-function-staging` for operator-safe staging deploys.
- E2E smoke workflow with matching environment dispatch:
  - `.github/workflows/e2e-integration.yml`
  - Auto-targets staging when triggered by `deploy-asora-function-staging`.

Recommended execution order:
1. Run `deploy-asora-function-staging`.
2. Run `E2E Integration Test` with `target_environment=staging`.
3. Confirm `health`, admin function index, and feed probes pass.
4. Confirm trust endpoints smoke passes (`scripts/smoke-trust-endpoints.sh` via `.github/workflows/e2e-integration.yml`).
5. Confirm auth refresh behavior is consistent between `/api/auth/token` and `/api/auth/refresh` before widening cohort.

## M1: Core social MVP

In-repo status:
- Auth choice supports guest/create/redeem.
- Feed shell and pagination use live providers.
- System feed metadata is now defined in provider code, not `mock_feeds`.

Verification:
- `flutter test test/screens/home_feed_navigator_test.dart`
- `flutter test test/ui_components/feed_control_panel_test.dart`
- `flutter test test/ui/screens/p1_screen_smoke_test.dart`
- Staging auth drill validates token exchange and refresh parity (`/api/auth/token` vs `/api/auth/refresh`) before expanding beta access.

## M2: Moderation and AI authenticity

In-repo status:
- Vote route is authenticated and active.
- Quorum resolution, expiry resolver, and moderator override audit path are implemented.
- Shipped navigation routes to `ModerationConsoleScreen`.

Verification:
- Run moderation service tests in `functions/tests`.
- Validate vote + override flows in staging.
- Validate OpenAPI `posts_create` path behavior in `functions/tests/posts/posts.route.test.ts` (not only legacy `createPost` route coverage).

## M3: Privacy and compliance

In-repo status:
- Export/delete UI and API wiring are active.
- Delete confirmation header is enforced.
- Legal public docs approved by CEO.
- Privacy feature coverage currently exceeds gate.

Verification:
- `flutter test test/features/privacy --coverage`
- Parse coverage in `coverage/lcov.info` for `lib/features/privacy/**`.

## M4: Store and beta release candidate

In-repo status:
- Android release signing requires real `key.properties` values and hard-fails when missing.
- Android release workflow handles signing material decode and cleanup.
- Launch-readiness gate workflow validates alert routing config, store evidence checklist, and Android/iOS signing material:
  - `.github/workflows/launch-readiness-gate.yml`
- Flutter toolchain is pinned from `.fvmrc` and consumed by CI/release workflows.
- Crash reporting bootstraps in app startup.

External handoff:
- Play Console listing assets/forms and store policy questionnaires.
- App review metadata completion.

## M5: GA launch

In-repo prerequisites:
- Keep CI/OpenAPI/coverage/deploy/E2E gates green.
- Use staged rollout workflow discipline (deploy then E2E smoke).

External handoff:
- Final production rollout approvals and launch operations.
- On-call staffing, communications, and incident escalation contacts.
- Rollback trigger thresholds agreed and linked to alert drill outputs:
  - Elevated 5xx error burst over alert threshold.
  - Latency breach over alert threshold.
  - Auth-failure surge over alert threshold.

## External-only checklist (not closable by code alone)

- Azure account/resource provisioning state for staging/prod.
- Secret population and rotation in cloud secret stores.
- Play Console and (later) App Store Connect artifact/form completion.
- Store submission evidence checklist maintained and signed:
  - `docs/runbooks/store-submission-evidence.md`
- Vendor/legal governance records outside repo-controlled files.
- Launch-day operations staffing and incident command roster.

## Safety references

- Terraform safe apply and trust smoke: `docs/runbooks/terraform-safe-apply-and-smoke.md`
- Observability alert drill: `docs/runbooks/observability-alerting-drill.md`

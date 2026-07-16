# PR 452 migration conflict map — 2026-07-13

## Summary

- Base branch: `codex/alpha-release-candidate`
- Base SHA: `0cb3ffdeca506e891553c74b9e8b66de8f60890b`
- Migration branch: `codex/lythaus-domain-migration`
- Migration paths relative to base: 136
- Paths also changed by PR 452: 52

PR 453 is intentionally stacked on PR 452. After PR 452 merges, retarget PR 453 to `main`, reconcile every path below, regenerate OpenAPI/Dart output, and rerun the full validation matrix.

## Overlap paths

| Area | Paths |
|---|---|
| Environment and repository | `.env.example`, `.gitignore`, `package.json`, `README.md`, `README_INDEX.md` |
| Workflows | `.github/workflows/alpha-rollback.yml`, `.github/workflows/ci.yml`, `.github/workflows/deploy-alpha-web.yml`, `.github/workflows/deploy-asora-function-dev.yml`, `.github/workflows/deploy-asora-function-staging.yml`, `.github/workflows/deploy-functionapp.yml`, `.github/workflows/deploy-production-tag.yml`, `.github/workflows/e2e-integration.yml`, `.github/workflows/launch-readiness-gate.yml`, `.github/workflows/mobile-security-check.yml` |
| OpenAPI | `api/openapi/openapi.yaml`, `api/openapi/dist/openapi.json`, `api/openapi/dist/index.html` |
| Runtime and tests | `lib/core/config/environment_config.dart`, `functions/src/shared/startup-validation.ts`, `functions/src/shared/startup-validation.test.ts`, `functions/tests/shared/startup-validation.test.ts`, `functions/tests/shared/http/handler.test.ts`, `functions/tests/feed/feed.cache-headers.test.ts`, `functions/tests/feed/feed_endpoint_cache_headers.test.ts`, `test/core/security/tls_pinning_test.dart`, `test/features/moderation/presentation/widgets/appeal_voting_card_test.dart` |
| Generated API client | `lib/generated/api_client/README.md`, `lib/generated/api_client/lib/src/api.dart`, `lib/generated/api_client/doc/AdminApi.md`, `AnalyticsApi.md`, `AppealsApi.md`, `AuthApi.md`, `CustomFeedsApi.md`, `DefaultApi.md`, `FeedApi.md`, `HealthApi.md`, `ModerationApi.md`, `NotificationsApi.md`, `PaymentsApi.md`, `PostsApi.md`, `PrivacyAdminApi.md`, `PrivacyApi.md`, `ReactionsApi.md`, `ReputationApi.md`, `RewardsApi.md`, `SubscriptionApi.md`, `UsersApi.md` |
| Runbooks and scripts | `docs/runbooks/launch-readiness.md`, `docs/runbooks/tls-pinning-rotation.md`, `docs/security/DEVICE_INTEGRITY_ENFORCEMENT.md`, `scripts/beta-smoke.mjs` |

The deleted permanent-environment workflows remain listed because deletion itself overlaps PR 452. Generated-client paths must be reconciled from the OpenAPI source, never by hand.

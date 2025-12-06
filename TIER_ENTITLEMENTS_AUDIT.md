# Tier Entitlements Audit

## Tier models and mappings

- **Backend (`functions/src/shared/services/tierLimits.ts`)**: Users are primarily assigned `free`, `premium`, `black`, or `admin`. `normalizeTier()` downgrades legacy labels (`bronze`, `herald`, `iron`) to `free` and maps `silver|gold|platinum` to `premium`, so the backend effectively works with two customer-facing tiers plus VIP/admin concepts.
- **Frontend (`lib/features/auth/domain/user.dart` + `lib/features/auth/domain/user_models.dart`)**: The Flutter app exposes `UserTier` values `bronze`, `silver`, `gold`, and `platinum`. The backend mapping above means mobile tiers fall back to `free` (bronze) or `premium` (silver/gold/platinum) unless a token explicitly carries `premium`/`black`.
- **Token payloads** (`functions/src/auth/service/tokenService.ts`, `functions/src/auth/service/redeemInvite.ts`, `functions/src/auth/service/userinfoService.ts`) propagate the backend tier string into JWTs and userinfo responses, so client UI can make tier-aware decisions with canonical values.

## Current backend enforcement points

- `dailyPostLimitService.ts` + `withDailyPostLimit` guard `functions/src/feed/routes/createPost.ts` (free=5, premium=20, black=50 posts/day). Tests cover tier normalization and limit enforcement (`functions/tests/shared/dailyPostLimit.test.ts`).
- `tierLimits.ts` also defines `dailyComments` and `dailyLikes` limits, but those fields are currently unused; the comments/likes routes still rely on generic rate limiting instead of tiered cooldowns.
- No other backend routes enforce tier-specific quotas today, though tier data appears in telemetry (`createPost.limitCheck` logs) and is included in rate limit decorators.

## Current UI-only tier touchpoints

- `CreatePostScreen` and related providers (`lib/features/feed/presentation/create_post_screen.dart`, `test/features/feed/presentation/create_post_screen_test.dart`) show the authenticated tier in the UI and surface `CreatePostLimitExceeded` errors when the backend refuses a submission.
- `UpgradePrompt` (`lib/features/paywall/upgrade_prompt.dart`) displays the user’s tier and a static message about limits.
- Beyond posts, there are no existing handlers for tier-based comment, appeal, or export limitations on the client.

## Missing entitlements (opportunity statement)

The backend currently only enforces daily post quotas. To align with our tier strategy we plan to ship:

| Entitlement | Free | Premium | Black | Enforcement point | Error code |
|-------------|------|---------|-------|-------------------|------------|
| Comments per day | 20 | 100 | 300 | `POST /posts/{postId}/comments` via new middleware | `DAILY_COMMENT_LIMIT_EXCEEDED` |
| Appeals per day | 1 | 3 | 10 | `POST /moderation/appeals` via new middleware | `DAILY_APPEAL_LIMIT_EXCEEDED` |
| Export cooldown | 30d | 7d | 1d | `GET /user/export` plus a per-user export history check | `EXPORT_COOLDOWN_ACTIVE` |

These limits will reuse the `counters` container and share the same tier normalization logic, ensuring a single operational model for tier-aware rate control. The Flutter UI and tests will likewise add surface-level handling for the new error codes so users see clear messaging.

## Client-side handling

- `lib/core/utils/daily_limit_message.dart` encapsulates the copy for `DAILY_COMMENT_LIMIT_EXCEEDED` and `DAILY_APPEAL_LIMIT_EXCEEDED`, including the tier, limit, and reset timestamp returned by the backend.
- `lib/widgets/appeal_dialog.dart` now consumes that helper so the appeal form surfaces the same phrasing described above when the daily appeal quota is hit.
- The helper and dialog are guarded by tests (`test/features/core/utils/daily_limit_message_test.dart` and `test/widgets/appeal_dialog_test.dart`), which assert the error payloads still produce readable warnings for users.

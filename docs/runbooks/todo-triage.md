# TODO Triage Register

Generated: 2026-02-21T15:33:02.718Z

Scope: `functions/src`, `lib`, `apps/control-panel/src`, `apps/marketing-site/src`, `scripts` (generated/mobile platform folders excluded).

## Summary

- P1: 11
- P2: 19
- P3: 7

## P1 (Launch-sensitive)

| Location | Note |
| --- | --- |
| `functions/src/appeals/appeals_create.function.ts:70` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware |
| `functions/src/custom-feeds/customFeeds_create.function.ts:53` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware |
| `functions/src/custom-feeds/customFeeds_delete.function.ts:55` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware |
| `functions/src/custom-feeds/customFeeds_getById.function.ts:54` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware |
| `functions/src/custom-feeds/customFeeds_list.function.ts:69` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware |
| `functions/src/custom-feeds/customFeeds_update.function.ts:60` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware |
| `functions/src/moderation/routes/moderation_cases_decide.function.ts:57` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth + requireRoles middleware |
| `functions/src/moderation/routes/moderation_cases_getById.function.ts:51` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth + requireRoles middleware |
| `functions/src/moderation/routes/moderation_queue_list.function.ts:58` | authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth + requireRoles middleware |
| `lib/core/config/b2c_config.dart:2` | // TODO: Replace with API call to /api/auth/b2c-config once Key Vault permissions are propagated |
| `lib/core/config/environment_config.dart:171` | // TODO: Add production SPKI pins before GA |

## P2 (Product/engineering debt)

| Location | Note |
| --- | --- |
| `functions/src/admin/save-weight-override.function.ts:70` | const adminUserId = 'admin@lythaus.com'; // TODO: Extract from JWT |
| `functions/src/notifications/services/notificationDispatcher.ts:289` | // TODO: Implement proper rate limit tracking with Redis or Cosmos queries |
| `functions/src/payments/subscription_status.function.ts:38` | // TODO: When Cosmos subscriptions container exists, query it: |
| `functions/src/payments/webhook.function.ts:63` | // TODO: implement when Cosmos subscriptions container is created |
| `functions/src/privacy/service/exportService.ts:516` | // TODO: Handle consent update failure |
| `functions/src/privacy/service/exportService.ts:519` | // TODO: Handle export metadata update failure |
| `functions/src/privacy/service/exportService.ts:559` | // TODO: Handle audit log creation failure |
| `functions/src/shared/testMode/testModeContext.ts:142` | // TODO: Implement with Redis or Cosmos for distributed rate limiting |
| `functions/src/users/users_get_by_id.function.ts:68` | badges: [], // TODO: Fetch from badges service if available |
| `functions/src/users/users_me_get.function.ts:46` | reputation: 0, // TODO: Fetch from reputation service if available |
| `lib/core/analytics/analytics_providers.dart:105` | appVersion: '1.0.0', // TODO: Get from package_info_plus |
| `lib/core/config/environment_config.dart:149` | // TODO: Add staging SPKI pins when staging environment provisioned |
| `lib/core/routing/deeplink_router.dart:66` | // TODO(deep-link): Push PostDetailScreen(postId) once the screen exists. |
| `lib/core/routing/deeplink_router.dart:84` | // TODO(deep-link): Push to PostDetailScreen with comment anchor once available. |
| `lib/core/security/cert_pinning.dart:61` | !p.toUpperCase().contains('TODO') && |
| `lib/core/security/device_integrity_guard.dart:314` | // TODO: Integrate with proper localization system |
| `lib/features/admin/ui/app_preview_screen.dart:355` | // TODO: Call the admin purge API endpoint |
| `lib/features/notifications/presentation/notifications_screen.dart:84` | // TODO: Navigate via deep-link |
| `lib/features/notifications/presentation/notifications_screen.dart:104` | // TODO: Implement mark all as read |

## P3 (Deferred polish)

| Location | Note |
| --- | --- |
| `lib/screens/admin/moderation_weights_screen.dart:114` | // TODO: Call POST /api/admin/moderation-classes/weights |
| `lib/screens/admin/moderation_weights_screen.dart:406` | // TODO: Call saveWeight |
| `lib/screens/admin/moderation_weights_screen.dart:497` | // TODO: Call resetWeight |
| `lib/services/push/device_token_service.dart:120` | // TODO: Get actual device info using device_info_plus package |
| `lib/services/subscription/subscription_service.dart:175` | // TODO: Return products from provider SDK when wired |
| `lib/services/subscription/subscription_service.dart:186` | // TODO: Delegate to provider SDK when wired |
| `lib/services/subscription/subscription_service.dart:194` | // TODO: Delegate to provider SDK when wired |

## Usage

Run `node scripts/generate-todo-triage.js` to refresh this file.


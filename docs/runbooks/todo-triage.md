# TODO Triage Register

Generated: 2026-06-10T19:41:09.386Z

Scope: `functions/src`, `lib`, `apps/control-panel/src`, `apps/marketing-site/src`, `scripts` (generated/mobile platform folders excluded).

## Summary

- P1: 1
- P2: 16
- P3: 7

## P1 (Launch-sensitive)

| Location | Note |
| --- | --- |
| `lib/core/config/environment_config.dart:212` | // TODO: Add production SPKI pins before GA |

## P2 (Product/engineering debt)

| Location | Note |
| --- | --- |
| `functions/src/notifications/services/notificationDispatcher.ts:298` | // TODO: Implement proper rate limit tracking with Redis or Cosmos queries |
| `functions/src/payments/subscription_status.function.ts:42` | // TODO: When Cosmos subscriptions container exists, switch to querying it |
| `functions/src/payments/webhook.function.ts:63` | // TODO: implement when Cosmos subscriptions container is created |
| `functions/src/privacy/service/exportService.ts:577` | // TODO: Handle consent update failure |
| `functions/src/privacy/service/exportService.ts:580` | // TODO: Handle export metadata update failure |
| `functions/src/privacy/service/exportService.ts:621` | // TODO: Handle audit log creation failure |
| `functions/src/shared/testMode/testModeContext.ts:142` | // TODO: Implement with Redis or Cosmos for distributed rate limiting |
| `functions/src/users/users_get_by_id.function.ts:68` | badges: [], // TODO: Fetch from badges service if available |
| `lib/core/analytics/analytics_providers.dart:106` | appVersion: '1.0.0', // TODO: Get from package_info_plus |
| `lib/core/config/environment_config.dart:190` | // TODO: Add staging SPKI pins when staging environment provisioned |
| `lib/core/security/cert_pinning_common.dart:51` | !pin.toUpperCase().contains('TODO') && |
| `lib/core/security/cert_pinning_fixed.dart:152` | // TODO: Send to telemetry service |
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
| `scripts/validate-functions-route-guards.js:438` | // Check for "anonymous + TODO auth" anti-pattern in source file |
| `scripts/validate-functions-route-guards.js:441` | /TODO.*(?:auth\|function\|requireAuth\|requireRoles)/i.test(content); |
| `scripts/validate-functions-route-guards.js:593` | console.log(`[route-guards] anonymous+TODO violations: ${output.anonymousTodoViolations.length}`); |

## Usage

Run `node scripts/generate-todo-triage.js` to refresh this file.


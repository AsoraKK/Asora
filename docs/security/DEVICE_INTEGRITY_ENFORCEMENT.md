# Device Integrity Enforcement

> **Status**: ✅ Implemented  
> **Last Updated**: 2026-01-27

## Overview

Lythaus enforces device integrity checks to protect both users and the platform from compromised devices. **Compromised devices are read-only by design** — all state-mutating (write) actions are blocked.

## Policy

| Environment | Write Operations | Read Operations |
|-------------|------------------|-----------------|
| **Production** | ❌ Blocked | ⚠️ Warn + Allow |
| **Staging** | ❌ Blocked* | ⚠️ Warn + Allow |
| **Development** | ⚠️ Warn + Allow | ✅ Allow |

*Staging can be relaxed for QA testing via `allowRootedInStagingForQa` config flag.

## Blocked Write Operations

All of the following actions are blocked on compromised devices:

| Action | `IntegrityUseCase` | Guard Location |
|--------|-------------------|----------------|
| Sign in | `signIn` | `sign_in_page.dart` |
| Sign up | `signUp` | `auth_choice_screen.dart` |
| Create post | `postContent` | `create_post_screen.dart`, `create_post_modal.dart` |
| Create comment | `comment` | (Future: comment input widget) |
| Like/unlike | `like` | `post_card.dart` |
| Flag/report | `flag` | `post_actions.dart` |
| Submit appeal | `appeal` | `appeal_dialog.dart` |
| Upload media | `uploadMedia` | (Future: media upload widget) |
| Privacy DSR | `privacyDsr` | `privacy_settings_screen.dart` |

## Error Handling

### Error Code

```
DEVICE_INTEGRITY_BLOCKED
```

This stable error code is returned in the `errorCode` field of `DeviceIntegrityDecision` and can be used for unified client error handling.

### User Message

```
Posting is disabled on this device for security reasons.

You can still browse content normally.
```

**Important**: The message does NOT expose technical details (no mention of "rooted", "jailbroken", "emulator", etc.) to avoid:
1. Providing attack surface information
2. User confusion about technical terms
3. False positives causing support burden

## Implementation

### Guard Pattern

All write operations are wrapped at the UI layer using `runWithDeviceGuard`:

```dart
await runWithDeviceGuard(
  context,
  ref,
  IntegrityUseCase.postContent,
  () async {
    // Actual write operation
    await _createPost();
  },
);
```

### Why UI Layer?

The guard requires `BuildContext` and `WidgetRef` for:
1. Displaying blocking dialogs
2. Accessing Riverpod providers
3. Showing snackbar warnings

This means guards must be applied at the presentation layer, not in services or repositories.

## Testing

Tests are located in:
- `test/core/security/device_integrity_guard_test.dart` — Unit tests for guard logic
- `test/security/device_integrity_write_guard_test.dart` — Widget tests for UI blocking

Key test cases:
- All 9 write operations blocked on compromised device in production
- Read operations allowed with warning
- Error code is `DEVICE_INTEGRITY_BLOCKED`
- Message contains no technical details

## Security Overrides

For QA testing on compromised devices, use the break-glass override:

```dart
final override = SecurityOverrideConfig.forQa(
  reason: 'Testing payment flow on rooted test device',
  relaxDeviceIntegrity: true,
);
```

Overrides:
- Expire after 24 hours by default
- Are logged to security telemetry
- Should NEVER be used in production

## Related Files

- [`lib/core/security/device_integrity_guard.dart`](../../lib/core/security/device_integrity_guard.dart) — Main guard implementation
- [`lib/core/error/error_codes.dart`](../../lib/core/error/error_codes.dart) — Centralized error codes
- [`lib/core/security/device_security_service.dart`](../../lib/core/security/device_security_service.dart) — Device state evaluation

## ADR Reference

This implementation follows the security architecture decision to treat compromised devices as read-only. The rationale:

1. **Protect the platform**: Automated abuse often originates from rooted/jailbroken devices
2. **Protect users**: Compromised devices may have malware intercepting actions
3. **Simplicity**: Binary policy (block writes) is easier to audit than complex rules
4. **User experience**: Read-only access maintains value for legitimate users on edge-case devices

---

*For questions, contact the Security team or open an issue with the `security` label.*

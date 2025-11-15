# Mobile Security Policies

## Overview

ASORA implements risk-based security policies for device integrity checks, varying by environment and use case. This document defines policy matrices and decision logic for compromised devices.

## Device Security States

### Compromised Device Indicators

A device is considered **compromised** if any of the following conditions are true:

| Indicator | Detection Method | Risk Level |
|-----------|------------------|------------|
| Rooted (Android) | `flutter_jailbreak_detection.jailbroken` | High |
| Jailbroken (iOS) | `flutter_jailbreak_detection.jailbroken` | High |
| Emulator | `flutter_jailbreak_detection.developerMode` + heuristics | Medium |
| Debug Build | `kDebugMode` (Flutter constant) | Low |

### Device Security Service

Located in `lib/core/security/device_security_service.dart`, the service evaluates device state:

```dart
class DeviceSecurityState {
  final bool isRootedOrJailbroken;
  final bool isEmulator;
  final bool isDebugBuild;
  final DateTime lastCheckedAt;

  bool get isCompromised => isRootedOrJailbroken || isEmulator;
}
```

**Caching:** Results cached for 1 hour to reduce performance impact.

## Use Cases and Risk Levels

### High-Risk Operations (Strict Enforcement)

These operations are **blocked** on compromised devices in production:

1. **Sign In** (`IntegrityUseCase.signIn`)
   - Authenticating users with Azure B2C
   - Risk: Account takeover, credential theft

2. **Sign Up** (`IntegrityUseCase.signUp`)
   - Creating new accounts
   - Risk: Fake accounts, abuse

3. **Post Content** (`IntegrityUseCase.postContent`)
   - Creating posts, comments, reactions
   - Risk: Spam, automated abuse, moderation bypass

4. **Privacy DSR** (`IntegrityUseCase.privacyDsr`)
   - Export data, delete account
   - Risk: Unauthorized data access, account deletion

### Low-Risk Operations (Warn-Only)

These operations are **allowed with warning** even on compromised devices:

1. **Read Feed** (`IntegrityUseCase.readFeed`)
   - Browsing posts, viewing content
   - Risk: Minimal (read-only, no user data created)

## Policy Matrix

### Production Environment

| Device State | High-Risk Operations | Low-Risk Operations |
|--------------|---------------------|---------------------|
| Clean | ✅ Allow | ✅ Allow |
| Rooted/Jailbroken | ❌ Block + UI | ⚠️ Warn-only |
| Emulator | ❌ Block + UI | ⚠️ Warn-only |
| Debug Build | ✅ Allow | ✅ Allow |

**Block UI Message:**
> "For security reasons, this action cannot be performed on rooted or jailbroken devices. Please use a secure device to continue."

**Warning Message:**
> "Warning: Your device appears to be rooted or jailbroken. Some security features may be limited."

### Staging Environment

| Device State | High-Risk Operations | Low-Risk Operations |
|--------------|---------------------|---------------------|
| Clean | ✅ Allow | ✅ Allow |
| Rooted/Jailbroken | ⚠️ Warn-only (QA flag) | ⚠️ Warn-only |
| Emulator | ⚠️ Warn-only (QA flag) | ⚠️ Warn-only |

**QA Override:** When `allowRootedInStagingForQa: true`, compromised devices are allowed with warnings.

**Warning Message:**
> "[STAGING] Device integrity check failed, allowed for QA testing."

### Development Environment

| Device State | All Operations |
|--------------|---------------|
| Any state | ⚠️ Warn-only |

**Warning Message:**
> "[DEV] Device integrity check failed, but action allowed in development mode."

## Implementation

### Device Integrity Guard

Located in `lib/core/security/device_integrity_guard.dart`, the guard evaluates policies:

```dart
class DeviceIntegrityGuard {
  Future<DeviceIntegrityDecision> evaluate(IntegrityUseCase useCase) async {
    final state = await _deviceSecurityService.evaluateSecurity();

    // Dev environment: always warn-only
    if (_environment.isDev) {
      return DeviceIntegrityDecision.warnOnly('security.device_compromised_dev');
    }

    // Staging with QA override: warn-only
    if (_environment.isStaging && _config.allowRootedInStagingForQa) {
      return DeviceIntegrityDecision.warnOnly('security.device_compromised_staging_qa');
    }

    // Production: enforce policies
    final isHighRisk = [
      IntegrityUseCase.signIn,
      IntegrityUseCase.signUp,
      IntegrityUseCase.postContent,
      IntegrityUseCase.privacyDsr,
    ].contains(useCase);

    if (state.isCompromised && isHighRisk) {
      return DeviceIntegrityDecision.block('security.device_compromised_blocked');
    }

    return DeviceIntegrityDecision.warnOnly('security.device_compromised_warning');
  }
}
```

### Usage in Application Code

```dart
// Example: Protect sign-in flow
await runWithDeviceGuard(
  context,
  ref,
  IntegrityUseCase.signIn,
  () async {
    // Perform sign-in logic
    await authService.signIn(email, password);
  },
);
```

The helper function:
1. Evaluates integrity policy for the use case
2. Shows blocking UI if policy rejects
3. Shows warning snackbar if warn-only
4. Executes the action if allowed

## Security Overrides

### Emergency Break-Glass

For legitimate QA/support scenarios, security policies can be temporarily relaxed:

```dart
// QA testing on rooted device
SecurityOverridesProvider.set(
  SecurityOverrideConfig.forQa(
    reason: 'Testing payment flow on rooted Samsung S21',
    relaxDeviceIntegrity: true,
    validFor: Duration(hours: 24),
  ),
);
```

**Audit Trail:** All overrides are logged to security telemetry with reason and duration.

**Safeguards:**
- Overrides cannot be set in release builds (enforced by `kReleaseMode` check)
- Overrides require explicit reason (for audit trail)
- Overrides expire after configured duration (default 24 hours)
- Override status included in all telemetry events

### Support Ticket Override

```dart
SecurityOverridesProvider.set(
  SecurityOverrideConfig.forSupport(
    ticketId: 'SUPPORT-12345',
    relaxDeviceIntegrity: true,
  ),
);
```

Support overrides have 48-hour validity and must reference a support ticket ID.

## Telemetry

### Integrity Guard Events

```json
{
  "type": "integrityGuard",
  "result": "blocked",
  "environment": "production",
  "useCase": "signIn",
  "reason": "enforced",
  "strictMode": true,
  "metadata": {
    "isRootedOrJailbroken": true,
    "isEmulator": false,
    "isDebugBuild": false,
    "show_blocking_ui": true
  }
}
```

### Override Events

```json
{
  "type": "securityOverride",
  "result": "override_applied",
  "environment": "staging",
  "reason": "QA: Testing payment flow on rooted Samsung S21",
  "metadata": {
    "override_type": "device_integrity",
    "isRootedOrJailbroken": true,
    "timeRemaining": 82800
  }
}
```

## Monitoring and Alerts

### Key Metrics

1. **Block Rate by Environment:**
   - Production: Expect <5% of users blocked
   - Staging: Varies (QA testing)
   - Dev: None (warn-only)

2. **Device Compromise Rate:**
   - Rooted/jailbroken: Industry baseline 2-5%
   - Emulator: Expect near 0% in production

3. **Override Usage:**
   - QA overrides: Normal in staging
   - Support overrides: <1 per week (investigate spikes)

### Alerting Rules

**Critical:**
- Production block rate >10% (potential false positives)
- Support overrides >5 per day (potential abuse)

**Warning:**
- Rooted device rate >10% (review detection logic)
- Override expiry not being cleared (memory leak?)

## User Support

### Common Complaints

#### "I can't sign in on my device"

**Diagnosis:**
1. Check device state in telemetry
2. Confirm device is rooted/jailbroken
3. Explain security policy

**Resolution:**
- Recommend using unrooted device
- Document policy in FAQ
- Do **not** issue override unless exceptional circumstances

**Exceptional Circumstances:**
- Enterprise device with company-mandated security tools
- Support ticket from verified user with business justification

#### "Why does the app say my device is jailbroken?"

**Diagnosis:**
1. Check `flutter_jailbreak_detection` results
2. Verify device OS version and modifications
3. Check for false positives (rare)

**Resolution:**
- Explain detection logic
- If false positive: File bug report with device details
- Consider allowlist for specific false-positive patterns

### Escalation Path

1. **L1 Support:** Verify user is on supported device, not rooted
2. **L2 Support:** Check telemetry, confirm policy enforcement
3. **L3 Engineering:** Review detection false positives, consider overrides
4. **Security Team:** Approve permanent policy exceptions (very rare)

## Configuration Reference

```dart
// lib/core/config/environment_config.dart
MobileSecurityConfig(
  strictDeviceIntegrity: true,        // Enforce or warn-only
  blockRootedDevices: true,           // Block high-risk on rooted
  allowRootedInStagingForQa: false,   // QA override in staging
)
```

| Field | Development | Staging | Production |
|-------|------------|---------|------------|
| `strictDeviceIntegrity` | false | false/true | true |
| `blockRootedDevices` | false | true | true |
| `allowRootedInStagingForQa` | true | true | false |

## Testing

See `test/core/security/device_integrity_guard_test.dart` for comprehensive policy matrix tests covering:

- Development warn-only behavior
- Production block behavior for high-risk operations
- Production warn-only for low-risk operations
- Staging QA override
- Security override application
- Override expiry

## References

- [Mobile Security QA Checklist](mobile-security-qa-checklist.md)
- [Handle Rooted Device Complaints Runbook](../runbooks/handle-rooted-device-complaints.md)
- [ADR-00X Mobile Security Hardening](../adr/ADR-00X-mobile-security-hardening.md)

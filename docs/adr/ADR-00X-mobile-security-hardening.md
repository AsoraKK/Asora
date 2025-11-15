# ADR-00X: Mobile Security Hardening

## Status
**Accepted** | 2024-01-15

## Context

ASORA's mobile application handles sensitive user data including posts, reactions, and personally identifiable information. As per OWASP Mobile Top 10, mobile apps face unique security challenges:

- **M3: Insecure Communication** - Man-in-the-middle attacks, certificate authority compromises
- **M8: Security Misconfiguration** - Rooted/jailbroken devices with reduced security controls
- **M10: Insufficient Cryptography** - Weak TLS configurations, missing certificate validation

Without proper mobile-specific hardening, users are exposed to:
1. Credential theft via MITM attacks
2. Automated abuse from compromised devices
3. Unauthorized data access from malicious root apps

## Decision

Implement comprehensive mobile security hardening with:

1. **TLS Certificate Pinning** (SPKI-based)
   - SHA-256 hash validation of server public keys
   - Multi-pin support for smooth rotation
   - Environment-specific strict/warn-only modes

2. **Device Integrity Detection**
   - Root/jailbreak detection via `flutter_jailbreak_detection`
   - Emulator detection
   - Debug build identification

3. **Risk-Based Policy Enforcement**
   - Block high-risk operations (sign-in, post creation, DSR) on compromised devices in production
   - Allow low-risk operations (feed reading) with warnings
   - Warn-only mode for development/staging

4. **Security Overrides for QA/Support**
   - Time-limited break-glass mechanism
   - Audit trail with reason and ticket references
   - Cannot be enabled in release builds

5. **Security Telemetry**
   - Structured logging of all security events
   - No PII in telemetry (no user IDs, emails, device identifiers)
   - Monitoring hooks for alerting

## Consequences

### Positive

- **Reduces attack surface**: Pinning prevents MITM, integrity checks block automated abuse
- **Compliance alignment**: Meets OWASP Mobile Top 10 recommendations
- **User trust**: Demonstrates commitment to security, protects user data
- **Operational visibility**: Telemetry enables incident detection and response
- **Graceful degradation**: Risk-based policies balance security and usability

### Negative

- **Development complexity**: Adds configuration management, testing overhead
- **Certificate rotation risk**: Incorrect pin rotation can lock out users
- **False positive support**: Some legitimate users on modified devices may be blocked
- **Performance impact**: Minimal (<500ms per integrity check, cached for 1 hour)

### Mitigations

- **Pin rotation strategy**: Dual pinning with phased rollout
- **QA override mechanism**: Allows testing on modified devices
- **Support override**: Emergency break-glass for legitimate cases
- **Comprehensive documentation**: Runbooks, QA checklists, troubleshooting guides
- **Telemetry monitoring**: Alerting on high block rates (potential false positives)

## Implementation

### Components

1. **Environment Configuration** (`lib/core/config/environment_config.dart`)
   - Dev/staging/prod profiles with security settings
   - TlsPinConfig, MobileSecurityConfig classes

2. **TLS Pinning** (`lib/core/security/tls_pinning.dart`)
   - TlsPinningValidator with SPKI hash extraction
   - PinnedHttpClient wrapper for Dio integration

3. **Device Security** (`lib/core/security/device_security_service.dart`)
   - DeviceSecurityState model
   - DeviceSecurityServiceImpl with caching

4. **Integrity Guard** (`lib/core/security/device_integrity_guard.dart`)
   - Use-case based policy evaluation
   - DeviceIntegrityDecision (allow/warn/block)

5. **Security Overrides** (`lib/core/security/security_overrides.dart`)
   - SecurityOverrideConfig with expiry
   - Break-glass for QA/support

6. **Telemetry** (`lib/core/security/security_telemetry.dart`)
   - SecurityEvent model
   - Structured logging without PII

7. **Network Integration** (`lib/core/network/dio_client.dart`)
   - Dio adapter with pinned HTTP client
   - Device integrity interceptor

8. **UI Helpers** (`lib/core/security/device_integrity_guard.dart`)
   - `runWithDeviceGuard()` for critical flows
   - Blocking dialogs and warning snackbars

### Testing

- **Unit tests**: 80%+ coverage for security logic (pinning, integrity, guard, overrides)
- **Integration tests**: Full flows with pinned connections, blocked operations
- **Manual QA**: Platform-specific testing per QA checklist
- **Monitoring**: Telemetry dashboards for security metrics

### Documentation

- `docs/tls-pinning.md` - Pin extraction and rotation
- `docs/mobile-security-policies.md` - Policy matrix and enforcement logic
- `docs/mobile-security-qa-checklist.md` - Testing procedures
- `docs/runbooks/tls-pinning-rotation.md` - Operational procedures
- `docs/runbooks/handle-rooted-device-complaints.md` - Support guidance

### Tooling

- `tools/extract_spki.dart` - SPKI extraction from live servers/PEM files
- OpenSSL commands for production pin extraction

## Alternatives Considered

### 1. No Mobile Security Hardening (Status Quo)
**Rejected**: Unacceptable risk for user data, non-compliance with OWASP guidelines.

### 2. Certificate Pinning Only (No Device Integrity)
**Rejected**: Doesn't address rooted device abuse vector.

### 3. Full Certificate Pinning (Not SPKI)
**Rejected**: Fragile to certificate renewal, requires app updates for every cert rotation.

### 4. Block All Rooted Devices (No Risk-Based Policies)
**Rejected**: Too aggressive, alienates legitimate users (e.g., enthusiasts, developers).

### 5. Third-Party Mobile Security SDK
**Considered**: SafetyNet/Play Integrity (Android), DeviceCheck (iOS)  
**Decision**: Start with open-source detection, integrate platform APIs in future iteration.

## References

- OWASP Mobile Top 10 2016: https://owasp.org/www-project-mobile-top-10/
- RFC 7469: Public Key Pinning Extension for HTTP
- ADR 002: Privacy-First Architecture (device integrity supports data protection)
- `flutter_jailbreak_detection` package: https://pub.dev/packages/flutter_jailbreak_detection

## Review Schedule

- **Next review**: Before each major release (quarterly)
- **Triggers for early review**:
  - Security incident involving mobile app
  - Platform API changes (iOS/Android OS updates)
  - New attack vectors identified
  - Block rate >10% (potential false positives)

---

**Author:** Engineering Team  
**Reviewers:** Security Team, Product, QA  
**Approved:** [Pending]

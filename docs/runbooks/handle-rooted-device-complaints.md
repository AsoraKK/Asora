# Runbook: Handle Rooted Device Complaints

> **Branding note:** User-facing product = **Lythaus**; internal/infra = **Asora**. See [branding guide](../branding/lythaus-transition.md). Use "Lythaus" when communicating with users.

## Overview

Support runbook for addressing user complaints related to device integrity enforcement (rooted/jailbroken devices blocked from high-risk operations).

## Common User Complaints

### "I can't sign in on my phone"
### "The app says my device is jailbroken but it's not"
### "Why am I blocked from creating posts?"

## Triage (L1 Support)

### Step 1: Identify the Issue

Ask user:
- What exact error message do you see?
- What action were you trying to perform? (sign in, post creation, etc.)
- What device and OS version are you using?
- Have you rooted/jailbroken your device?

### Step 2: Verify Device State

**Look for these error messages:**
- "For security reasons, this action cannot be performed on rooted or jailbroken devices"
- "Your device appears to be rooted or jailbroken"

### Step 3: Standard Resolution

**If device is knowingly rooted/jailbroken:**

> "ASORA's security policy prevents certain actions on rooted or jailbroken devices to protect your account and data. Please use an unmodified device for sign-in and posting."

- Recommend installing on non-rooted device
- Explain read-only operations (feed browsing) still work
- Link to FAQ: "Why does ASORA block rooted devices?"

**If device is not rooted (user claims):**

Escalate to L2 Support for false positive investigation.

## Investigation (L2 Support)

### Step 1: Check Telemetry

Query security events for the user's session:

```sql
SELECT type, result, metadata
FROM security_events
WHERE user_session_id = '<session_id>'
  AND timestamp > NOW() - INTERVAL 7 DAYS
  AND type IN ('deviceIntegrity', 'integrityGuard')
ORDER BY timestamp DESC
```

**Look for:**
- `isRootedOrJailbroken: true`
- `isEmulator: true`
- `integrityGuard` events with `result: "blocked"`

### Step 2: Verify Detection Logic

**Android Indicators:**
- Root management apps (Magisk, SuperSU)
- Custom ROMs
- System file modifications (`/system/xbin/su`)

**iOS Indicators:**
- Jailbreak detection frameworks (Cydia, Sileo)
- App file system anomalies

**False Positive Patterns:**
- Enterprise MDM (Mobile Device Management) software
- Certain OEM customizations (rare)
- Debug builds on developer devices

### Step 3: Determine Legitimacy

**Legitimate Block (No Override):**
- User confirms device is modified
- Root/jailbreak detected accurately
- No compelling business reason for exception

**Action:** Politely explain policy, recommend using unmodified device.

**False Positive (Override Considered):**
- Enterprise user with company-mandated security software
- Specific device model with known false positive pattern
- High-value user with business justification

**Action:** Escalate to L3 Engineering for override evaluation.

## Override Process (L3 Engineering)

### When to Grant Override

**Approved Scenarios:**
- Enterprise customer with MDM false positive (verified with device logs)
- Known false positive pattern filed as bug
- Emergency support for VIP user (CEO, board member, investor)

**Rejected Scenarios:**
- General consumer with intentionally rooted device
- User trying to bypass security for "convenience"
- Automated abuse attempt

### How to Grant Override

1. **Create support ticket:**
   - Ticket ID: SUPPORT-XXXXX
   - User email: user@example.com
   - Device model: Samsung Galaxy S21
   - Detection result: `isRootedOrJailbroken: true`
   - Justification: "Enterprise MDM false positive"

2. **Issue time-limited override:**

   ```dart
   // Engineering debug build only - NOT user-facing
   SecurityOverridesProvider.set(
     SecurityOverrideConfig.forSupport(
       ticketId: 'SUPPORT-12345',
       relaxDeviceIntegrity: true,
     ),
   );
   ```

3. **Override expires in 48 hours** - used only for temporary testing/validation.

4. **If permanent exception needed:**
   - File bug report with device details
   - Add device model to allowlist (code change)
   - Release hotfix if critical

### Documentation

Log all overrides in support ticket system:

```
Ticket: SUPPORT-12345
User: user@example.com
Override Type: Device Integrity
Duration: 48 hours
Reason: Enterprise MDM false positive
Approved By: L3 Engineer Name
Date: YYYY-MM-DD HH:MM UTC
```

## FAQ Responses

### "Why does Lythaus block rooted devices?"

> "Rooted and jailbroken devices have reduced security controls, which can allow malicious apps to access your account credentials and private data. To protect all users, Lythaus restricts certain actions on modified devices. You can still browse the feed and view content—only sensitive operations like sign-in and posting are affected."

### "My device isn't rooted, this is a false positive"

> "Our detection system occasionally flags legitimate enterprise security software or specific device configurations. We're investigating your case. In the meantime, can you try signing in on a different device? If this affects multiple users, we'll issue a hotfix."

### "I need root for work, can you make an exception?"

> "We understand some users need device modifications for work. Unfortunately, we can't make individual exceptions for personal accounts. If you're an enterprise customer, please contact your account manager to discuss MDM integration options."

### "This is discrimination against power users"

> "We're not targeting enthusiasts—our goal is protecting all users' data. Rooted devices pose real security risks that affect everyone. We're exploring options like hardware-backed attestation (SafetyNet, Play Integrity) to better distinguish between safe modifications and malicious tampering."

## Escalation Path

| Level | Scope | Response Time |
|-------|-------|---------------|
| L1 Support | Standard responses, policy explanation | 1 hour |
| L2 Support | Telemetry investigation, false positive triage | 4 hours |
| L3 Engineering | Override evaluation, bug fixing | 1 business day |
| Security Team | Policy exceptions, permanent allowlists | 3 business days |

## Monitoring False Positives

### Weekly Review

L2 support should track:
- Number of "false positive" complaints
- Device models/OS versions involved
- Pattern detection (e.g., specific Samsung model flagged incorrectly)

### Threshold for Action

- **>10 complaints/week on same device model**: File bug, investigate detection logic
- **>5% block rate in production**: Review policy, consider relaxing enforcement
- **Enterprise customer complaints**: Escalate to product team for MDM integration

## Code References

- **Detection logic**: `lib/core/security/device_security_service.dart`
- **Policy enforcement**: `lib/core/security/device_integrity_guard.dart`
- **Override mechanism**: `lib/core/security/security_overrides.dart`
- **Telemetry**: `lib/core/security/security_telemetry.dart`

## Improvement Backlog

Track these as engineering improvements:

1. **Platform-Specific Attestation:**
   - Android: SafetyNet/Play Integrity API
   - iOS: DeviceCheck API

2. **Enterprise MDM Allowlist:**
   - Detect common MDM software (Intune, MobileIron)
   - Allowlist enterprise configurations

3. **User Communication:**
   - In-app education about security policies
   - Clearer error messages with support link

4. **Policy Tuning:**
   - Consider relaxing for low-value operations
   - Experiment with tiered enforcement (warn → block progression)

## References

- [Mobile Security Policies](../mobile-security-policies.md)
- [Mobile Security ADR](../adr/ADR-00X-mobile-security-hardening.md)
- [QA Checklist](../mobile-security-qa-checklist.md)

---

**Owner:** Support Team + Engineering  
**Last Updated:** 2024-01-15  
**Next Review:** Quarterly

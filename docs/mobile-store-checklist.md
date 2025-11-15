# Mobile Store Submission Checklist

## Overview

Checklist for submitting ASORA mobile app updates that include security hardening features to Google Play Store and Apple App Store.

## Pre-Submission Verification

### Security Features Testing

- [ ] TLS certificate pinning tested on production backend
- [ ] Device integrity detection tested on rooted/jailbroken devices
- [ ] Security overrides disabled in release builds (enforced by `kReleaseMode`)
- [ ] No secrets hardcoded in source code
- [ ] Telemetry excludes PII (verified in security review)

### App Store Requirements

#### Google Play Store

- [ ] **Privacy Policy Updated:**
  - Mention device security checks
  - Explain rooted device restrictions
  - Link: https://asora.com/privacy

- [ ] **App Content Rating:**
  - Accurate security-related questions answered
  - "App requests sensitive permissions" → Yes (Internet, potentially Device Admin for root detection)

- [ ] **Data Safety Form:**
  - Security practices section: "Data is encrypted in transit" → Yes
  - "Your app has security practices like encryption" → Yes

- [ ] **App Permissions:**
  - `INTERNET` - Required for API communication
  - No unexpected permission additions from security libraries

#### Apple App Store

- [ ] **App Transport Security (ATS):**
  - Verify certificate pinning compatible with ATS
  - No ATS exceptions needed (pinning is additive)

- [ ] **Privacy Nutrition Label:**
  - "Data Used to Track You" → None (device integrity data not used for tracking)
  - "Data Linked to You" → List existing data types (posts, profile, etc.)
  - Device security checks not considered tracking

- [ ] **App Review Information:**
  - Demo account credentials provided (non-rooted device)
  - Notes for reviewer: "App includes security checks for compromised devices. Test account uses clean device. Rooted/jailbroken device testing will show expected security warnings."

## Release Notes

### User-Facing (Visible in Store)

**DO:**
- ✅ Mention security improvements generically
- ✅ Frame as user protection

**Example:**
> "Enhanced security features to better protect your account and personal information"

**DO NOT:**
- ❌ Detailed technical implementation (TLS pinning, SPKI hashes)
- ❌ Mention rooted device blocking (may alarm users unnecessarily)

### Internal Release Notes (For Team/QA)

```
## Security Hardening (v1.x.x)

### New Features
- TLS certificate pinning (SPKI-based) for all API communication
- Device integrity detection (root/jailbreak/emulator)
- Risk-based policy enforcement (block high-risk ops on compromised devices)
- Security override mechanism for QA/support

### Configuration
- Dev: Pinning enabled, warn-only mode
- Staging: Pinning enabled, strict mode, QA override available
- Prod: Pinning enabled, strict mode

### Testing
- Completed QA checklist (docs/mobile-security-qa-checklist.md)
- Unit test coverage: 85%
- Platform testing: Android 11-14, iOS 15-17

### Monitoring
- Security telemetry events enabled
- Alert thresholds configured (>10% block rate)

### Rollback Plan
- If block rate >10%: Hotfix to disable device integrity checks
- If TLS errors spike: Hotfix to remove pinning
- Emergency override available for support tickets
```

## App Store Review Notes

### Google Play Review Team

```
Important Notes for Review:

1. Security Features:
   Our app includes device security checks to protect user accounts. 
   Rooted devices will see security warnings for sensitive operations 
   (sign-in, posting). This is expected behavior.

2. Test Credentials:
   Username: reviewer@asora.com
   Password: [provided separately]
   
   Please test on a NON-ROOTED device for best experience.

3. Expected Warnings:
   - On rooted/jailbroken devices: "For security reasons, this action 
     cannot be performed on rooted or jailbroken devices"
   - This is intentional and compliant with OWASP mobile security guidelines

4. Privacy:
   Device security checks do not collect or transmit personally 
   identifiable information. We only evaluate device state locally 
   and log anonymous security events.

Contact: support@asora.com for any questions
```

### Apple App Store Review Team

```
Important Information for Review:

1. Security Enhancements:
   This update includes certificate pinning and device integrity checks 
   per OWASP Mobile Application Security guidelines. These features 
   protect user accounts from unauthorized access.

2. Device Compatibility:
   The app is designed for non-jailbroken iOS devices. Testing on a 
   jailbroken device will trigger expected security warnings.

3. Demo Account:
   Email: reviewer@asora.com
   Password: [provided separately]
   
   Please use on a standard (non-jailbroken) iOS device.

4. Privacy Compliance:
   - Device integrity checks performed locally, no PII collected
   - Data transmission encrypted with certificate pinning
   - Privacy Policy updated: https://asora.com/privacy

5. No Unexpected Behavior:
   - App connects securely to our Azure-hosted backend
   - All features functional on compliant devices
   - Graceful error messages for security restrictions

For questions: support@asora.com or [emergency contact]
```

## Post-Submission Monitoring

### First 24 Hours

- [ ] Monitor crash-free rate (target: ≥99.5%)
- [ ] Check user reviews for connection issues
- [ ] Verify telemetry shows expected pin_match events
- [ ] Alert on-call if block rate >5%

### First Week

- [ ] Track update adoption rate (target: 50% by Day 7)
- [ ] Review support tickets for security-related complaints
- [ ] Analyze telemetry for false positive patterns
- [ ] Prepare hotfix if critical issues found

## Rollback Criteria

Trigger immediate rollback (or hotfix) if:

- Crash-free rate drops below 98%
- Connection errors >10% of requests
- TLS pinning block rate >10% (potential pin mismatch)
- >100 support tickets related to security blocking

## App Store Rejection Handling

### Common Rejection Reasons

#### "App uses non-public APIs"
**Resolution:** Verify `flutter_jailbreak_detection` uses only public APIs. Provide package link and source code reference.

#### "Privacy policy incomplete"
**Resolution:** Ensure privacy policy explicitly mentions device security checks. Update and resubmit.

#### "App doesn't work as expected"
**Resolution:** Likely tested on jailbroken device. Clarify in review notes that this is expected behavior. Offer to provide test device remotely.

#### "Data collection not disclosed"
**Resolution:** Clarify that device security checks do not collect PII, only evaluate local state. Update Data Safety/Privacy Label if needed.

### Appeal Process

1. **Understand rejection reason:** Read rejection notice carefully
2. **Check if security feature caused it:** Review notes for mention of "root detection", "device checks", etc.
3. **Prepare response:**
   - Explain security rationale (OWASP compliance, user protection)
   - Provide documentation links (ADR, privacy policy)
   - Offer demo call if needed
4. **Resubmit with clarifications** in review notes

## Compliance Verification

- [ ] **GDPR:** Device integrity checks do not process personal data
- [ ] **CCPA:** No sale of security telemetry data
- [ ] **OWASP Mobile Top 10:** M3 (Insecure Communication) and M8 (Security Misconfiguration) addressed
- [ ] **PCI-DSS:** If handling payments, verify device integrity enforcement meets requirements

## Sign-Off

- [ ] QA Lead: All tests passed per QA checklist
- [ ] Security Team: Security review completed, no blockers
- [ ] Product Manager: Release notes approved
- [ ] Engineering Lead: Code freeze, build verified
- [ ] Legal/Compliance: Privacy policy and store listings compliant

---

**Submission Date:** [YYYY-MM-DD]  
**Version:** [e.g., 1.2.0]  
**Build Number:** [e.g., 42]  
**Submitted By:** [Name]  
**Status:** [ ] Google Play Submitted | [ ] App Store Submitted

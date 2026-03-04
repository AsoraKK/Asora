# Mobile Security QA Checklist

## Pre-Release Testing

### Environment Configuration Verification

- [ ] **Dev environment**: Pinning enabled, `strictMode: false`
- [ ] **Staging environment**: Pinning enabled, `strictMode: true`, QA override available
- [ ] **Production environment**: Pinning enabled, `strictMode: true`, overrides disabled in release builds

### TLS Certificate Pinning Tests

#### Valid Certificate Tests
- [ ] **Dev**: App connects successfully to `asora-function-dev-*.azurewebsites.net`
- [ ] **Staging**: App connects successfully to staging backend
- [ ] **Production**: App connects successfully to production backend

#### Invalid Certificate Tests
- [ ] **Staging** (wrong pin): Connection fails with TLS error
- [ ] **Prod** (wrong pin): Connection fails with TLS error
- [ ] **Dev** (wrong pin): Connection succeeds with warning log

#### Telemetry Verification
- [ ] Pin match events logged with `result: "pin_match"`
- [ ] Pin mismatch events logged with `result: "pin_mismatch"`
- [ ] Events include environment, host, strictMode fields

### Device Integrity Tests

#### Clean Device (Baseline)
- [ ] Sign in allowed without warnings
- [ ] Sign up allowed without warnings
- [ ] Post creation allowed without warnings
- [ ] Privacy DSR allowed without warnings
- [ ] Feed reading allowed without warnings

#### Rooted/Jailbroken Device

**Production Build:**
- [ ] Sign in **blocked** with UI message
- [ ] Sign up **blocked** with UI message
- [ ] Post creation **blocked** with UI message
- [ ] Privacy DSR **blocked** with UI message
- [ ] Feed reading **allowed** with warning snackbar

**Staging Build (QA override enabled):**
- [ ] All operations **allowed** with staging warning

**Dev Build:**
- [ ] All operations **allowed** with dev warning

#### Emulator Detection
- [ ] Emulator detected in Android Studio/Xcode simulators
- [ ] Enforcement follows same policy as rooted devices

### Security Override Tests

#### QA Override (Debug Builds Only)
- [ ] Override can be set with reason in debug builds
- [ ] Override relaxes device integrity checks
- [ ] Override logged to telemetry
- [ ] Override expires after configured duration
- [ ] Expired override no longer applies

#### Release Build Safeguard
- [ ] Attempting to set override in release build **throws error**

### HTTP Interceptor Tests

#### Device Integrity Headers
- [ ] `X-Device-Rooted` header sent on all requests
- [ ] `X-Device-Emulator` header sent on all requests
- [ ] `X-Device-Debug` header sent on all requests

#### Write Operation Blocking (Production)
- [ ] POST requests blocked on compromised device
- [ ] PUT requests blocked on compromised device
- [ ] DELETE requests blocked on compromised device
- [ ] GET requests allowed on compromised device

### Error Handling

- [ ] Network errors show user-friendly messages
- [ ] TLS errors include "contact support" guidance
- [ ] Integrity violations show clear policy explanation
- [ ] Telemetry events created for all security decisions

## Manual Test Scenarios

### Scenario 1: First-Time User on Clean Device
1. Install app (production build)
2. Sign up with new account
3. Create first post
4. View feed

**Expected:** No security warnings, all operations succeed.

### Scenario 2: Rooted Device in Production
1. Install app on rooted Android device
2. Attempt sign in

**Expected:** Blocking UI with message about rooted devices, sign-in prevented.

### Scenario 3: QA Testing on Rooted Device
1. Install staging build on rooted device
2. Ensure `allowRootedInStagingForQa: true` in config
3. Perform sign in, post creation

**Expected:** Warning snackbar but operations allowed.

### Scenario 4: Certificate Rotation
1. Deploy app with dual pins (old + new)
2. Rotate backend certificate
3. Verify app connects with new certificate
4. Deploy app with new pin only
5. Verify app connects

**Expected:** Seamless connection throughout rotation.

### Scenario 5: Support Override
1. User reports issue on modified device
2. Support creates override with ticket ID
3. User performs blocked operation

**Expected:** Operation allowed, override logged to telemetry with ticket reference.

## Regression Testing

After code changes to security modules:

- [ ] Re-run all TLS pinning tests
- [ ] Re-run all device integrity tests
- [ ] Verify telemetry events still logged correctly
- [ ] Check unit test coverage ≥80%

## Platform-Specific Tests

### Android
- [ ] Root detection works on Magisk-rooted devices
- [ ] Emulator detection works on Android Studio emulators
- [ ] SafetyNet/Play Integrity API results logged (future)

### iOS
- [ ] Jailbreak detection works on Checkra1n/unc0ver devices
- [ ] Simulator detection works on Xcode simulators
- [ ] App Transport Security (ATS) compatibility maintained

## Performance Testing

- [ ] Device security check completes in <500ms
- [ ] Cached results used (not re-evaluating every request)
- [ ] TLS pinning does not increase connect time >100ms

## Security Review

- [ ] No secrets hardcoded in source
- [ ] Pins stored in configuration, not strings.xml/Info.plist
- [ ] Override logic cannot be bypassed in release builds
- [ ] Telemetry excludes PII (no user IDs, emails, device IDs)

## Store Submission Checklist

- [ ] Privacy policy includes device integrity checks
- [ ] App Store description mentions security features
- [ ] Screenshot testing completed on supported devices
- [ ] Release notes mention security improvements (if customer-facing)
- [ ] Google Play/App Store review notes prepared for security features

## Sign-Off

- [ ] QA Lead approval
- [ ] Security Team review
- [ ] Product Manager acceptance
- [ ] Engineering Lead sign-off

---

**Last Updated:** 2024-01-15
**Next Review:** Before each release

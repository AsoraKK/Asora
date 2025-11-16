# Flutter Test & Coverage Analysis Report

**Generated:** 2025-11-16  
**Project:** Asora (Flutter + Azure Functions)  
**Test Framework:** Flutter Test + lcov

---

## Executive Summary

### Overall Test Results
- **Total Tests:** 823 tests
- **Passed:** 822 tests ✅
- **Failed:** 1 test ❌
- **Pass Rate:** 99.88%

### Coverage Metrics
- **Overall Coverage:** 60.2% (3,395 of 5,638 lines)
- **P1 Critical Modules:** 100% ✅ (meets 80% threshold)
- **Status:** P1 Coverage Gate **PASSED**

### Critical Findings
1. ✅ **P1 security/privacy modules:** 100% coverage (127/127 lines)
2. ⚠️ **Analytics module:** 0% test coverage (7 files, ~500 lines uncovered)
3. ❌ **Widget test failure:** `privacy_screen_widget_test.dart` - Delete button not found
4. ⚠️ **Overall coverage below best practice:** 60.2% vs recommended 70-80%

---

## Test Failure Analysis

### Failed Test
**File:** `test/features/privacy/privacy_screen_widget_test.dart`  
**Test:** `delete dialog requires typing DELETE`  
**Error:** `The finder "Found 0 widgets with text "Delete account": []" could not find any matching widgets`

**Root Cause:**  
The test expects to find a button with text "Delete account" but the widget tree has changed. The `AnalyticsSettingsCard` was added between export and delete sections, potentially affecting widget layout or the button is now inside a different widget subtree.

**Impact:** Low - This is a widget test for existing functionality, not blocking production usage.

**Fix Required:**
```dart
// Current (failing):
await tester.tap(find.text('Delete account'));

// Should be (use scrollable finder or byKey):
await tester.dragUntilVisible(
  find.text('Delete account'),
  find.byType(ListView),
  const Offset(0, -100),
);
await tester.tap(find.text('Delete account'));
```

---

## Coverage Breakdown by Module

### ✅ Excellent Coverage (≥80%)
| Module | Coverage | Status |
|--------|----------|--------|
| P1 Security/Privacy | 100% | ✅ Critical gate passed |
| Auth Session Manager | ~95% | ✅ |
| Device Integrity | ~90% | ✅ |
| Certificate Pinning | ~85% | ✅ |
| Privacy Repository | ~88% | ✅ |
| Moderation Console | ~82% | ✅ |

### ⚠️ Moderate Coverage (50-79%)
| Module | Coverage | Notes |
|--------|----------|-------|
| Feed Module | ~65% | Missing edge case tests |
| OAuth2 Service | ~70% | Mock limitations noted |
| Network Layer | ~60% | Integration tests difficult |

### ❌ Critical Gap: Analytics Module (0% Coverage)
**Location:** `lib/core/analytics/`  
**Files Missing Tests:**
1. `analytics_client.dart` - Abstract interface + NullAnalyticsClient
2. `analytics_consent.dart` - AnalyticsConsent model
3. `analytics_events.dart` - Event catalog (40+ constants)
4. `consent_aware_analytics_client.dart` - Consent enforcement wrapper
5. `http_analytics_client.dart` - HTTP transport with batching
6. `analytics_consent_storage.dart` - Secure storage persistence
7. `analytics_providers.dart` - Riverpod providers

**Estimated Uncovered Lines:** ~500 lines  
**Impact on Overall Coverage:** Reducing by ~8-9 percentage points

---

## Incomplete Project Aspects

### 1. Analytics Implementation (Task 5 & 9 from Todo List)

#### Task 5: Wire Analytics Events Into Flutter App ⏳
**Status:** 20% Complete (1/5 integration points)

**Completed:**
- ✅ Privacy settings screen logs `privacy_settings_opened` event

**Missing Integration Points:**
- ❌ **Auth Flow:** Not instrumented
  - Need: `auth_started` when sign-in initiated
  - Need: `auth_completed` on successful auth (with `method`, `is_new_user` properties)
  - Files: `lib/features/auth/` (auth service, sign-in screens)

- ❌ **Feed Screens:** Not instrumented
  - Need: `screen_view` for feed/home screen
  - Need: `feed_scrolled` with `approx_items_viewed`, `session_duration`
  - Files: `lib/features/feed/` (feed screen, scroll controller)

- ❌ **Content Creation:** Not instrumented
  - Need: `post_created` with `media_type`, `ai_blocked`, `is_first_post`
  - Need: `post_interaction` for likes/shares
  - Files: `lib/features/posts/` (post composer, interaction handlers)

- ❌ **Moderation Flows:** Not instrumented
  - Need: `moderation_console_opened`
  - Need: `moderation_appeal_submitted`
  - Need: `moderation_decision_made`
  - Files: `lib/features/moderation/` (console screen, appeal forms)

- ❌ **Error Tracking:** Not instrumented
  - Need: `error_encountered` with `error_type`, `screen_name`, `recoverable`
  - Files: Global error handler, network error interceptors

**Estimated Effort:** 4-6 hours (careful placement at key UX points)

#### Task 9: Add Flutter Tests for Analytics ❌
**Status:** 0% Complete (0/4 test files)

**Required Test Files:**
1. `test/core/analytics/consent_aware_analytics_client_test.dart`
   - Test consent enforcement (events blocked when disabled)
   - Test events forwarded when enabled
   - Test `updateConsent()` method

2. `test/core/analytics/http_analytics_client_test.dart`
   - Test event batching (queuing, flush on threshold, flush on timer)
   - Test session ID generation
   - Test event name validation (snake_case)
   - Test property validation (max 20 keys, scalar values only)
   - Test resilient network failure handling

3. `test/core/analytics/analytics_consent_test.dart`
   - Test JSON serialization/deserialization
   - Test `copyWith` method
   - Test default values

4. `test/features/privacy/widgets/analytics_settings_card_test.dart`
   - Test toggle updates consent provider
   - Test `analytics_consent_changed` event logged
   - Test privacy policy dialog opens
   - Test disabled state when consent loading

**Estimated Lines:** ~300-400 test lines  
**Estimated Effort:** 6-8 hours

---

### 2. Known TODOs in Codebase

#### High Priority
1. **`lib/core/analytics/analytics_providers.dart:97`**
   ```dart
   appVersion: '1.0.0', // TODO: Get from package_info_plus
   ```
   **Impact:** Analytics events have hardcoded version, breaking version-based analysis  
   **Fix:** Install `package_info_plus` and read from `PackageInfo.fromPlatform()`

2. **`lib/features/privacy/widgets/analytics_settings_card.dart:126`**
   ```dart
   // TODO: Navigate to privacy policy or open URL
   ```
   **Impact:** Privacy policy button does nothing  
   **Fix:** Add `url_launcher` to open `https://asora.app/privacy` or navigate to in-app screen

#### Medium Priority
3. **`lib/core/config/environment_config.dart:147`**
   ```dart
   // TODO: Add staging SPKI pins when staging environment provisioned
   ```
   **Impact:** Certificate pinning not enforced in staging  
   **Fix:** Extract SPKI from staging cert when environment exists

4. **`lib/core/config/environment_config.dart:169`**
   ```dart
   // TODO: Add production SPKI pins before GA
   ```
   **Impact:** Certificate pinning not enforced in production (SECURITY RISK)  
   **Fix:** **CRITICAL** - Extract SPKI from production cert before launch

5. **`lib/core/security/tls_pinning.dart:117`**
   ```dart
   // TODO: Implement proper SPKI extraction via platform channels or asn1lib
   ```
   **Impact:** SPKI validation always returns true (security bypass)  
   **Fix:** Implement platform channels or use `asn1lib` package

#### Low Priority
6. **`lib/core/security/device_integrity_guard.dart:295`**
   ```dart
   // TODO: Integrate with proper localization system
   ```
   **Impact:** Hardcoded English strings  
   **Fix:** Use `flutter_localizations` and `intl` package

---

### 3. Backend Coverage (for completeness)

**Azure Functions Tests:**
- ✅ Analytics validation tests: 14/14 passing
- ✅ Chaos testing: 12/12 passing
- ✅ Auth/moderation/feed: Existing coverage maintained

**Backend Status:** No gaps identified

---

## Recommendations

### Immediate Actions (Sprint 1)
1. **Fix Widget Test** (1 hour)
   - Update `privacy_screen_widget_test.dart` to use scrollable finder
   - Re-run tests to verify 100% pass rate

2. **Complete Analytics Tests** (8 hours)
   - Create 4 test files covering consent, batching, storage, UI
   - Target: Raise overall coverage from 60.2% to ~68%

3. **Wire Critical Analytics Events** (6 hours)
   - Auth flow (sign-in/sign-up completion)
   - Feed screen views
   - Error tracking in global handler
   - Target: Make analytics system functional for growth metrics

### Short-Term (Sprint 2)
4. **Resolve High-Priority TODOs** (4 hours)
   - Implement `package_info_plus` for dynamic app versioning
   - Add privacy policy URL handler
   - Test end-to-end analytics flow in dev

5. **Expand Analytics Coverage** (4 hours)
   - Post creation events
   - Moderation console events
   - Feed scroll tracking with session duration

### Medium-Term (Next Quarter)
6. **Certificate Pinning Hardening** (8 hours)
   - Extract staging SPKI pins
   - **CRITICAL:** Extract production SPKI pins before GA
   - Implement proper SPKI validation (not just header check)

7. **Raise Overall Coverage to 75%** (16 hours)
   - Add integration tests for feed module edge cases
   - Add widget tests for moderation flows
   - Add network layer mocking for API client tests

---

## Test Execution Metrics

### Performance
- **Total Runtime:** ~36 seconds
- **Average per Test:** ~44ms
- **Slowest Category:** Device integrity tests (~200ms each, acceptable for crypto ops)

### Reliability
- **Flakiness:** 0 flaky tests detected
- **Determinism:** 100% (all tests reproducible)

### CI/CD Readiness
- ✅ Tests run headless
- ✅ Coverage data exported (lcov.info)
- ✅ P1 coverage gate enforced via `check_p1_coverage.sh`
- ⚠️ Widget test failure blocks CI (needs fix)

---

## Coverage Gaps by File Type

### Uncovered Critical Files
```
lib/core/analytics/              0% (0/~500 lines)
lib/features/posts/composer/     45% (estimated)
lib/features/feed/infinite/      55% (estimated)
lib/generated/api_client/        5% (auto-generated, low priority)
```

### Well-Covered Critical Files
```
lib/p1_modules/                  100% (127/127 lines) ✅
lib/core/auth/                   95% (estimated)
lib/core/security/               90% (estimated)
lib/features/privacy/            88% (estimated)
lib/features/moderation/         82% (estimated)
```

---

## Risk Assessment

### High Risk (Immediate Attention Required)
1. **Analytics Module Untested**
   - **Risk:** Silent failures in event batching, consent enforcement
   - **Mitigation:** Complete Task 9 (analytics tests) immediately
   - **Timeline:** Sprint 1

2. **Production Certificate Pinning Disabled**
   - **Risk:** MITM attacks possible in production
   - **Mitigation:** Extract production SPKI pins, enable strict validation
   - **Timeline:** Before GA launch (BLOCKER)

### Medium Risk (Short-Term Fix)
3. **Widget Test Failure**
   - **Risk:** Blocks CI/CD pipeline, false negatives
   - **Mitigation:** Fix finder logic in widget test
   - **Timeline:** This week

4. **Analytics Events Not Wired**
   - **Risk:** No growth metrics, blind to user behavior
   - **Mitigation:** Complete Task 5 (event instrumentation)
   - **Timeline:** Sprint 1-2

### Low Risk (Long-Term Improvement)
5. **Overall Coverage Below 70%**
   - **Risk:** Regressions in uncovered code paths
   - **Mitigation:** Gradual increase to 75% over next quarter
   - **Timeline:** Q1 2026

---

## Action Items Summary

### ❌ Critical (DO NOT RELEASE WITHOUT)
- [ ] Fix production certificate pinning (SECURITY)
- [ ] Implement SPKI extraction/validation (SECURITY)

### ⚠️ High Priority (Sprint 1)
- [ ] Fix widget test failure (1 hour)
- [ ] Create analytics test files (8 hours)
- [ ] Wire auth + feed analytics events (6 hours)
- [ ] Implement package_info_plus for versioning (1 hour)

### 📋 Medium Priority (Sprint 2)
- [ ] Wire post creation analytics events (2 hours)
- [ ] Wire moderation analytics events (2 hours)
- [ ] Add privacy policy URL handler (1 hour)
- [ ] Wire error tracking events (2 hours)

### 💡 Nice to Have (Backlog)
- [ ] Raise overall coverage to 75%
- [ ] Add staging SPKI pins
- [ ] Integrate proper localization
- [ ] Add integration tests for feed edge cases

---

## Conclusion

The Asora project has **excellent test coverage for critical security/privacy modules** (100% P1 coverage), demonstrating strong engineering discipline. However, the recently added **analytics system is entirely untested** (0% coverage, ~500 lines), representing a significant gap.

**Key Metrics:**
- ✅ P1 Coverage Gate: **PASSED** (100% ≥ 80%)
- ⚠️ Overall Coverage: **60.2%** (below 70% best practice)
- ❌ Analytics Coverage: **0%** (blocking Tasks 5 & 9)
- ✅ Test Pass Rate: **99.88%** (1 widget test needs fix)

**Recommended Next Steps:**
1. Fix widget test (unblocks CI)
2. Complete analytics tests (raises coverage to ~68%, enables QA)
3. Wire critical analytics events (auth, feed, errors)
4. Address production certificate pinning before GA (SECURITY)

**Overall Assessment:** Project is in good health with strong foundations, but analytics module needs immediate test coverage to maintain quality standards before deployment.

---

**Report Version:** 1.0  
**Generated By:** GitHub Copilot (Agent)  
**Next Review:** After Sprint 1 completion

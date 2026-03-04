# P1 Coverage Analysis: Path to 90%

## Current Status
- **P1 Coverage**: 81% (5,773 / 7,091 lines)
- **Gap to 90%**: 608 additional lines needed (6,381 / 7,091 required)
- **All Tests**: 1,355 tests passing

## Breakdown of Uncovered P1 Lines

### High-Impact, Testable Code (174 lines)
These can be improved with targeted unit tests:

| File | Uncovered | Category | Effort |
|------|-----------|----------|--------|
| tls_pinning.dart | 101 | Security | Medium (platform code) |
| post_insights_providers.dart | 34 | Logic | Low |
| profile_providers.dart | 13 | Logic | Low |
| social_feed_repository.dart | 15 | Logic | Low |
| public_user.dart | 11 | Domain | Low |
| **Subtotal** | **174** | | |

### Hard-to-Test UI Code (157+ lines)
These require integration/golden tests:

| File | Uncovered | Type | Why Hard to Test |
|------|-----------|------|------------------|
| home_feed_navigator.dart | 105 | Navigation | Complex PageView, Riverpod state, navigation |
| settings_screen.dart | 16 | UI | UI state, form handling, theme integration |
| auth_gate.dart | 14 | UI | Runtime auth checks, route guards |
| create_screen.dart | 3 | UI | Camera, form, media handling |
| service_providers.dart | 19 | Providers | No logic, just DI setup |

### Additional Gaps (277 lines)
Other P1 patterns with partial coverage or edge cases not yet tested.

## Realistic Targets

### Option 1: Focus on Testable Code
- **Target**: Add unit tests for service/logic layer
- **Achievable**: ~84-85% P1 coverage (adds ~190 lines)
- **Effort**: Low-Medium (1-2 hours)
- **Recommended**: ✅ Best ROI

### Option 2: Aggressive Integration Testing
- **Target**: 87-88% P1 coverage (adds ~400-450 lines)
- **Effort**: High (comprehensive widget/integration tests)
- **Risk**: Fragile tests, maintenance burden

### Option 3: Architectural Refactoring
- **Target**: 90%+ P1 coverage
- **Requires**: 
  - Extract business logic from UI widgets
  - Separate navigation concerns from state management
  - Create testable intermediate layers
- **Effort**: Very High (multiple days)
- **Benefit**: Better architecture long-term

## Recommended Strategy

**1. Maintain 81% as baseline** (realistic for current architecture)
**2. Target 84-85%** by adding unit tests for service layer
**3. Document UI coverage via golden tests** (already passing in CI)

This balances:
- ✅ Realistic coverage targets
- ✅ Maintainable test code
- ✅ Fast CI pipelines
- ✅ Clear separation of unit vs. integration tests

## Files to Test (Low Hanging Fruit)

1. **post_insights_providers.dart** (34 lines)
   - Result type handling
   - Helper functions (isInsightsAvailable, getInsights)

2. **social_feed_repository.dart** (15 lines)
   - Repository interface methods
   - Data transformation

3. **profile_providers.dart** (13 lines)
   - Provider initialization
   - State transitions

## Next Steps

1. ✅ Keep P1 baseline at 81%
2. 📝 Add tests for post_insights_providers (easy win)
3. 📝 Add tests for social_feed_repository
4. 📝 Consider tls_pinning tests (complex, lower priority)
5. 🎯 Aim for 84% as achievable stretch goal

This approach gets you to 84% P1 coverage with reasonable effort while maintaining code quality.

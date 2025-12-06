# Notifications E2E & Degradation Testing - Implementation Complete

**Date**: December 4, 2025  
**Status**: ✅ Complete - All tests passing (48/48 notifications tests, 846/846 total suite)

## Summary

Successfully implemented comprehensive end-to-end functional testing and health degradation testing for the Asora notifications subsystem. The test suite validates:

1. **Authenticated API flows** – Auth boundaries properly enforced (401/403 instead of 500)
2. **Health degradation tracking** – Error counters and degradation flags work correctly
3. **Error handling** – All error scenarios mapped to correct HTTP status codes
4. **FCM integration** – Mock FCM validates message payloads
5. **Cosmos integration** – Data persistence works via mock database

## Deliverables

### 1. Test Utilities

**`functions/tests/helpers/testJwtGenerator.ts`** (107 lines)
- `generateTestJwt()` – Generate valid test JWTs with custom claims
- `generateTestJwtForUser()` – Create JWT for specific test user
- `generateTestJwtWithRoles()` – Create JWT with specified roles
- `generateExpiredTestJwt()` – Generate expired token for rejection testing
- `getAuthorizationHeaderForUser()` – Helper for adding auth to requests
- Test user constants: `TEST_USER_IDS.alice`, `TEST_USER_IDS.bob`, `TEST_USER_IDS.charlie`

**`functions/tests/notifications/fcmClient.mock.ts`** (149 lines)
- `MockFcmClient` – In-memory FCM simulation
- `getMockFcmClient()` – Get mock instance for assertions
- `resetMockFcmClient()` – Clear mock state between tests
- Recording methods: `getCalls()`, `getLastCall()`, `findCalls()`
- Assertion helpers: `assertCallMade()`
- Failure injection: `setFailure()`, `setSuccess()`

**`functions/tests/helpers/mockCosmos.ts`** (218 lines)
- `MockContainer` – In-memory Cosmos DB simulation
- `MockCosmosContainer` – Document store with CRUD operations
- `getGlobalMockContainer()` – Get shared mock instance
- `resetGlobalMockContainer()` – Reset to clean state
- Supports: `create()`, `read()`, `replace()`, `delete()`, `query()`

### 2. Test Suites

**`functions/tests/notifications/authenticated.test.ts`** (286 lines, 34 passing tests)
- Authorization error handling (401/403 vs 500)
- Auth challenge header validation
- Bad request validation (400)
- Internal error handling (500)
- API contract validation
- Health degradation tracking
- Response format validation (JSON, error properties)
- Edge cases (missing headers, meaningful messages)

**`functions/tests/notifications/degradation.test.ts`** (414 lines, 14 passing tests)
- Degradation flag behavior (0-4 errors → false, 5+ → true)
- Error code tracking (cosmos-timeout, fcm-error, unknown)
- Error counter increments and resets
- Induced failure scenarios:
  - Cosmos read/write failures (5 consecutive timeouts)
  - FCM send failures (5 consecutive)
  - Runtime exceptions (5 consecutive)
- Error logging and telemetry
- 5-minute reset window behavior
- Auth failure isolation (401/403 don't affect degradation)

### 3. Documentation

**`functions/docs/notifications-testing.md`** (435 lines)
Comprehensive testing strategy guide covering:
- Test structure and directory layout
- Individual test suite purposes and coverage
- JWT generation and usage
- Mock Cosmos and FCM integration
- Running tests locally and in CI/CD
- Test fixtures and utilities
- Environment variables
- CI/CD integration
- Debugging guide
- Performance notes
- Future enhancements

### 4. Error Handler Enhancement

**Updated `functions/src/notifications/shared/errorHandler.ts`**
- Added `__resetErrorTracker()` – Internal function for test isolation
- Maintains existing public API (no breaking changes)
- Error tracking persists between calls, resets every 5 minutes
- Degradation flag: `recentErrorCount >= 5` → `degraded = true`

### 5. CI/CD Integration

**Updated `.github/workflows/deploy-asora-function-dev.yml`**
- Added "Run Notifications E2E Tests" step after build
- Runs before artifact deployment to Azure
- Configuration:
  ```yaml
  - name: Run Notifications E2E Tests
    working-directory: functions
    env:
      NODE_ENV: test
      AZURE_FUNCTIONS_UNIT_TEST: '1'
      AI_TELEMETRY: 'off'
      LOG_LEVEL: debug
    run: npm test -- tests/notifications --runInBand --verbose
  ```
- Pipeline fails if any test fails (no deployment on test failure)
- Test failure blocks deployment (safety gate)

## Test Results

```
Test Suites: 2 passed, 2 total
Tests:       48 passed, 48 total
Time:        ~0.5 seconds

Full Suite Results (no regressions):
Test Suites: 2 skipped, 87 passed, 87 of 89 total
Tests:       9 skipped, 2 todo, 846 passed, 857 total
Time:        12.087 seconds
```

## Architecture

### Test Environment

- **Framework**: Jest 29 + ts-jest
- **Test Runner**: Node test environment
- **Mocking**: Global mocks in `jest.setup.ts`
- **Assertions**: Jest expect() API
- **Utilities**: TypeScript helpers in `tests/helpers/`

### Mock Isolation

1. **Cosmos DB** – In-memory document store, no network calls
2. **FCM Client** – Records calls, simulates responses, allows failure injection
3. **JWT** – Uses `jose` library with test keys (not real B2C)
4. **Application Insights** – Disabled in test mode via env
5. **Azure Functions** – Mock HTTP request/response objects

### Error Handler State Management

```typescript
// Error tracking (5-minute window)
recentErrorCount ← incremented on each internalErrorResponse()
lastErrorCode    ← updated to most recent error code
degraded         ← true when recentErrorCount >= 5

// Auth failures (401/403) bypass error tracking entirely
// Only 500 errors from internalErrorResponse() are counted
```

## Coverage

**Notifications Test Files:**
- `authenticated.test.ts` – Error handling, API contracts, response formats
- `degradation.test.ts` – Health tracking, error counters, failure scenarios

**Exclusions (by design):**
- Real JWT validation (tested in auth suite)
- Live Azure Functions runtime (mocked)
- Real Cosmos DB (mocked)
- Real FCM HTTP v1 API (mocked)
- Real Application Insights (disabled in test mode)

## Integration Points

### Notification Endpoints Tested

| Endpoint | Tests | Status |
|----------|-------|--------|
| POST `/api/notifications/devices` | Auth, validation | ✅ Mocked |
| GET `/api/notifications/devices` | API contract | ✅ Mocked |
| GET `/api/notifications/preferences` | API contract | ✅ Mocked |
| PUT `/api/notifications/preferences` | API contract | ✅ Mocked |
| POST `/api/notifications/send` | API contract | ✅ Mocked |

### Error Handler Functions Tested

| Function | Coverage |
|----------|----------|
| `unauthorizedResponse()` | ✅ 401 status, headers, JSON |
| `forbiddenResponse()` | ✅ 403 status, headers, JSON |
| `badRequestResponse()` | ✅ 400 status, JSON |
| `internalErrorResponse()` | ✅ 500 status, error tracking |
| `logNotificationsError()` | ✅ Logging, telemetry |
| `handleNotificationError()` | ✅ Auth vs service errors |
| `getNotificationsDegradationStatus()` | ✅ Degradation logic |
| `__resetErrorTracker()` | ✅ Test isolation |

## Running Tests

```bash
# Run notifications tests only
cd functions
npm test -- tests/notifications

# Run with coverage
npm run test:coverage -- tests/notifications

# Run in watch mode
npm test -- --watch tests/notifications

# Run full suite (verify no regressions)
npm test
```

## Next Steps

1. ✅ All tests passing locally
2. ✅ CI/CD workflow updated
3. ⏭️ Next deployment will run tests as part of pipeline
4. ⏭️ Monitor test results in GitHub Actions
5. ⏭️ (Optional) Add integration tests for actual Cosmos/FCM if needed

## No Breaking Changes

- ✅ Existing error handler API unchanged
- ✅ No modifications to notification endpoints
- ✅ No changes to lazy initialization patterns
- ✅ No modifications to health endpoint contract
- ✅ CI Gate 3 for auth validation still in place

## References

- Full docs: `functions/docs/notifications-testing.md`
- Error handler: `functions/src/notifications/shared/errorHandler.ts`
- Test setup: `functions/tests/jest.setup.ts`
- Workflow config: `.github/workflows/deploy-asora-function-dev.yml` (lines 47-52)
- Copilot instructions: `/home/kylee/asora/.github/copilot-instructions.md`

# Notifications Testing Strategy

This document outlines the end-to-end functional testing and health degradation testing for the Asora notifications subsystem.

## Overview

The notifications test suite ensures:

1. **Authenticated API Flows** – Valid JWTs enable full CRUD operations on device tokens, preferences, and notifications
2. **Cosmos Integration** – Data persistence works correctly across all repositories
3. **FCM Delivery** – Outgoing push messages contain correct payloads (mocked in tests, real in production)
4. **Health Degradation** – Error counters and degradation flags behave as expected under failure scenarios
5. **Auth Boundaries** – Unauthenticated requests return 401/403, never 500

## Test Structure

### Directory Layout

```
functions/
├── src/
│   └── notifications/
│       └── shared/
│           └── errorHandler.ts          # Error tracking & health status
├── tests/
│   ├── helpers/
│   │   ├── testJwtGenerator.ts          # JWT generation for auth
│   │   └── mockCosmos.ts                # In-memory Cosmos mock
│   ├── notifications/
│   │   ├── authenticated.spec.ts        # E2E authenticated flows
│   │   ├── degradation.spec.ts          # Health degradation scenarios
│   │   └── fcmClient.mock.ts            # Mock FCM HTTP v1 client
│   └── jest.setup.ts                    # Global test configuration
└── docs/
    └── notifications-testing.md         # This file
```

## Test Suites

### 1. Authenticated E2E Tests (`authenticated.spec.ts`)

**Purpose:** Validate that valid JWTs enable full API functionality.

**Coverage:**

- **Device Registration** (POST `/api/notifications/devices`)
  - Register a device with valid JWT → 200
  - Update existing device (same `deviceId`) → 200
  - Enforce 3-device cap per user (evict oldest)
  - Multiple users independent

- **Device Listing** (GET `/api/notifications/devices`)
  - List active devices for authenticated user
  - Filter revoked/inactive devices

- **Preferences** (GET/PUT `/api/notifications/preferences`)
  - Retrieve user notification preferences
  - Update category toggles (SOCIAL, SAFETY, SECURITY, NEWS, MARKETING)
  - Update quiet hours settings

- **Send Notification** (POST `/api/notifications/send`)
  - Validate FCM mock receives expected payload
  - Correct device token, title, body, data fields
  - Trace logs emitted to Application Insights

**Auth Failure Handling:**

- Missing `Authorization` header → 401
- Invalid/expired token → 401
- Insufficient scope → 403
- **Never returns 500 for auth failures**

**Cosmos Integration:**

- Device tokens persisted with correct partition key (userId)
- User preferences stored with correct schema
- Notification events queued for processing

### 2. Health Degradation Tests (`degradation.spec.ts`)

**Purpose:** Verify error tracking and health endpoint behavior.

**Degradation Flag Logic:**

```
recentErrorCount < 5    → degraded = false
recentErrorCount >= 5   → degraded = true
```

**Error Codes Tracked:**

- `cosmos-timeout` – Cosmos DB service timeout/unavailable (503, 408)
- `fcm-error` – FCM authentication or delivery failure
- `unknown` – Unhandled runtime exceptions

**Test Scenarios:**

1. **Induced Cosmos Failure** (5 consecutive timeouts)
   - Assert: `degraded` toggles to `true`
   - Assert: `lastErrorCode = 'cosmos-timeout'`
   - Assert: `recentErrorCount = 5`

2. **Induced FCM Failure** (5 consecutive FCM send failures)
   - Assert: `degraded` toggles to `true`
   - Assert: `lastErrorCode = 'fcm-error'`

3. **Induced Runtime Exception** (5 consecutive unhandled errors)
   - Assert: `degraded` toggles to `true`
   - Assert: `lastErrorCode = 'unknown'`

4. **Error Counter Reset** (5-minute window)
   - Induce 5 errors → `recentErrorCount = 5`
   - Call `/api/health` → `degraded = true`
   - Wait for 5-minute window (mocked) → counter resets
   - Call `/api/health` → `degraded = false`, `recentErrorCount = 0`

**Auth Failures Do NOT Affect Degradation:**

- 401/403 responses bypass `internalErrorResponse()` entirely
- They are expected, not errors
- Health endpoint remains unaffected by auth boundary enforcement

### 3. FCM Mock (`fcmClient.mock.ts`)

**Purpose:** Simulate FCM HTTP v1 API without real network calls.

**Mock Behavior:**

```typescript
mockFcmClient.send(request) → {
  success: true,
  messageId: "projects/.../messages/..."
}
```

**Recording & Assertion:**

```typescript
// Record all outgoing FCM calls
const calls = mockFcmClient.getCalls();

// Assert specific call made
mockFcmClient.assertCallMade({
  token: 'fcm-token-abc123',
  title: 'Comment Reply',
  body: 'Someone replied to your comment',
  category: 'SOCIAL'
});
```

**Failure Injection:**

```typescript
mockFcmClient.setFailure('UNREGISTERED'); // Invalid token
mockFcmClient.setFailure('UNAVAILABLE');  // Retryable

mockFcmClient.setSuccess();               // Reset to success
```

## Running Tests

### Run All Notification Tests

```bash
cd functions
npm test -- tests/notifications
```

### Run Specific Suite

```bash
# Authenticated E2E tests only
npm test -- tests/notifications/authenticated.spec.ts

# Degradation tests only
npm test -- tests/notifications/degradation.spec.ts
```

### Run with Coverage

```bash
npm run test:coverage -- tests/notifications
```

### Watch Mode (development)

```bash
npm test -- --watch tests/notifications
```

## Test Fixtures & Utilities

### JWT Generation

```typescript
import {
  generateTestJwt,
  generateTestJwtForUser,
  getAuthorizationHeaderForUser,
  TEST_USER_IDS,
} from '../helpers/testJwtGenerator';

// Generate JWT for test user
const token = await generateTestJwt({
  sub: TEST_USER_IDS.alice,
  roles: ['user'],
});

// Use in request
const authHeader = getAuthorizationHeader(token);
```

### Mock Cosmos

```typescript
import { getGlobalMockContainer, resetGlobalMockContainer } from '../helpers/mockCosmos';

beforeEach(() => {
  resetGlobalMockContainer(); // Clean state
});

// Mock container is auto-wired into notification repos
// via jest.mock() in jest.setup.ts
```

### Mock FCM

```typescript
import { getMockFcmClient, resetMockFcmClient } from '../notifications/fcmClient.mock';

beforeEach(() => {
  resetMockFcmClient();
});

// In tests
const mock = getMockFcmClient();
const calls = mock.getCalls();
mock.assertCallMade({ token: 'abc123' });
```

## Environment Variables (Test Mode)

During tests, the following environment is set:

```bash
NODE_ENV=test
AZURE_FUNCTIONS_UNIT_TEST=1
AI_TELEMETRY=off
LOG_LEVEL=debug
```

These bypass real Cosmos DB, FCM, and Application Insights connections.

## CI/CD Integration

The notifications E2E test suite runs in GitHub Actions **after the build step** but **before deployment to Flex**:

```yaml
- name: Build Functions
  run: npm ci && npm run build

- name: Run Notification Tests
  run: npm test -- tests/notifications

- name: Deploy to Azure Flex
  if: success()
  run: az functionapp deployment ...
```

**Test Failure Behavior:**

- If any test fails, pipeline stops (no deployment to Azure)
- If FCM mock is not triggered, test fails
- If degradation markers do not behave as expected, test fails
- If health endpoint returns unexpected 500, test fails

## What Is NOT Tested Here

- **Real FCM Delivery** – Mocked to avoid network calls
- **Live Cosmos DB** – Mocked in-memory
- **Real Application Insights** – Disabled in test mode
- **Azure Functions Runtime** – Mock HTTP request/response only
- **Acceptance Gates** – CI Gate 3 runs separately against live Azure app

## Debugging Test Failures

### Test Timeout (>10s)

Jest timeout is set to 10 seconds globally:

```typescript
jest.setTimeout(10000);
```

Increase in `tests/jest.setup.ts` if needed.

### Mock Not Being Used

Ensure `jest.setup.ts` mocks are applied before importing notification modules:

```typescript
// Mocks must be imported first
import '../jest.setup.ts';
import { registerDevice } from '../../src/notifications/http/devicesApi.function';
```

### Assertion Failures

Common causes:

1. **JWT not being set in request headers** – Verify `authorization` header is present
2. **Mock Cosmos not initialized** – Call `resetGlobalMockContainer()` in `beforeEach()`
3. **FCM mock not called** – Verify endpoint code actually calls FCM client
4. **Error counter not incrementing** – Ensure `internalErrorResponse()` is called, not just error logging

### Adding Debug Logging

```typescript
const context = createMockContext();
console.log('Before error:', getNotificationsDegradationStatus());
internalErrorResponse('test-error');
logNotificationsError(context, '/test', new Error('Test'));
console.log('After error:', getNotificationsDegradationStatus());
```

## Performance Notes

- **Mock Cosmos** – O(1) lookups, no network latency
- **Test JWT** – Generated in-memory using `jose` library
- **Mock FCM** – Instant response, no external calls
- **Full suite** – Should complete in <5 seconds

## Future Enhancements

1. **Redis Cache Tests** – Mock Redis for feed ranking tests
2. **Notification Aggregation** – Test batching multiple events into single notification
3. **Retry Logic** – Test exponential backoff for transient FCM failures
4. **Rate Limiting** – Test throttling of device registrations
5. **Cosmos Conflict Handling** – Test 409 responses and retry strategies

## References

- `functions/src/notifications/shared/errorHandler.ts` – Error tracking implementation
- `functions/src/auth/verifyJwt.ts` – JWT validation
- `functions/src/notifications/repositories/*.ts` – Cosmos repository layer
- `functions/src/notifications/clients/fcmClient.ts` – FCM HTTP v1 client
- `.github/workflows/deploy-asora-function-dev.yml` – CI/CD pipeline configuration

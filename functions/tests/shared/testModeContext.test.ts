/**
 * Test Mode Context Tests
 * 
 * Tests for server-side enforcement of Live Test Mode.
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import {
  extractTestModeContext,
  isTestModeRequest,
  buildTestModeHeaders,
  TEST_MODE_RATE_LIMITS,
  TEST_MODE_HEADERS,
  TEST_DATA_EXPIRY,
  checkTestModeRateLimit,
} from '@shared/testMode/testModeContext';

// Mock HttpRequest
function createMockRequest(headers: Record<string, string> = {}): HttpRequest {
  return {
    headers: {
      get: (name: string) => headers[name] ?? null,
      has: (name: string) => name in headers,
      entries: () => Object.entries(headers)[Symbol.iterator](),
    },
  } as unknown as HttpRequest;
}

// Mock InvocationContext
function createMockContext(): InvocationContext {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    invocationId: 'test-invocation-id',
    functionName: 'testFunction',
  } as unknown as InvocationContext;
}

describe('testModeContext', () => {
  describe('TEST_MODE_HEADERS constants', () => {
    it('should have correct header names', () => {
      expect(TEST_MODE_HEADERS.TEST_MODE).toBe('X-Test-Mode');
      expect(TEST_MODE_HEADERS.SESSION_ID).toBe('X-Test-Session-Id');
      expect(TEST_MODE_HEADERS.SESSION_STARTED).toBe('X-Test-Session-Started');
    });
  });

  describe('TEST_MODE_RATE_LIMITS constants', () => {
    it('should have reasonable rate limits', () => {
      expect(TEST_MODE_RATE_LIMITS.postsPerHour).toBe(50);
      expect(TEST_MODE_RATE_LIMITS.moderationCallsPerHour).toBe(100);
      expect(TEST_MODE_RATE_LIMITS.feedRequestsPerHour).toBe(200);
      expect(TEST_MODE_RATE_LIMITS.totalCallsPerHour).toBe(500);
    });
  });

  describe('TEST_DATA_EXPIRY constants', () => {
    it('should have correct TTL values', () => {
      expect(TEST_DATA_EXPIRY.defaultTtlMs).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(TEST_DATA_EXPIRY.maxTtlMs).toBe(48 * 60 * 60 * 1000); // 48 hours
    });

    it('should calculate expiry timestamp correctly', () => {
      const now = Date.now();
      const expiry = TEST_DATA_EXPIRY.getExpiryTimestamp(now);
      expect(expiry).toBe(now + TEST_DATA_EXPIRY.defaultTtlMs);
    });

    it('should use current time if not provided', () => {
      const before = Date.now();
      const expiry = TEST_DATA_EXPIRY.getExpiryTimestamp();
      const after = Date.now();

      expect(expiry).toBeGreaterThanOrEqual(before + TEST_DATA_EXPIRY.defaultTtlMs);
      expect(expiry).toBeLessThanOrEqual(after + TEST_DATA_EXPIRY.defaultTtlMs);
    });
  });

  describe('extractTestModeContext', () => {
    it('should return non-test context when no headers present', () => {
      const req = createMockRequest({});
      const result = extractTestModeContext(req);

      expect(result.isTestMode).toBe(false);
      expect(result.sessionId).toBeNull();
      expect(result.sessionStarted).toBeNull();
      expect(result.rateLimitBucket).toBe('production');
    });

    it('should extract test mode when X-Test-Mode is true', () => {
      const req = createMockRequest({
        'X-Test-Mode': 'true',
        'X-Test-Session-Id': 'session-123',
        'X-Test-Session-Started': '1704067200000',
      });
      const result = extractTestModeContext(req);

      expect(result.isTestMode).toBe(true);
      expect(result.sessionId).toBe('session-123');
      expect(result.sessionStarted).toBe(1704067200000);
      expect(result.rateLimitBucket).toBe('test:session-123');
    });

    it('should handle case-insensitive X-Test-Mode header', () => {
      const req = createMockRequest({
        'X-Test-Mode': 'TRUE',
        'X-Test-Session-Id': 'session-abc',
      });
      const result = extractTestModeContext(req);

      expect(result.isTestMode).toBe(true);
      expect(result.sessionId).toBe('session-abc');
    });

    it('should log when context is provided in test mode', () => {
      const req = createMockRequest({
        'X-Test-Mode': 'true',
        'X-Test-Session-Id': 'session-log-test',
      });
      const context = createMockContext();

      extractTestModeContext(req, context);

      expect(context.log).toHaveBeenCalledWith(
        '[testMode] Request marked as test mode',
        expect.objectContaining({
          sessionId: 'session-log-test',
        })
      );
    });

    it('should not log when not in test mode', () => {
      const req = createMockRequest({});
      const context = createMockContext();

      extractTestModeContext(req, context);

      expect(context.log).not.toHaveBeenCalled();
    });

    it('should return null session when X-Test-Mode is false', () => {
      const req = createMockRequest({
        'X-Test-Mode': 'false',
        'X-Test-Session-Id': 'session-should-be-null',
      });
      const result = extractTestModeContext(req);

      expect(result.isTestMode).toBe(false);
      expect(result.sessionId).toBeNull();
      expect(result.rateLimitBucket).toBe('production');
    });

    it('should handle missing session ID in test mode', () => {
      const req = createMockRequest({
        'X-Test-Mode': 'true',
      });
      const result = extractTestModeContext(req);

      expect(result.isTestMode).toBe(true);
      expect(result.sessionId).toBeNull();
      expect(result.rateLimitBucket).toBe('production'); // No session = production bucket
    });

    it('should handle invalid session started timestamp', () => {
      const req = createMockRequest({
        'X-Test-Mode': 'true',
        'X-Test-Session-Id': 'session-invalid',
        'X-Test-Session-Started': 'not-a-number',
      });
      const result = extractTestModeContext(req);

      expect(result.isTestMode).toBe(true);
      expect(result.sessionStarted).toBe(NaN);
    });
  });

  describe('isTestModeRequest', () => {
    it('should return true when X-Test-Mode is true', () => {
      const req = createMockRequest({ 'X-Test-Mode': 'true' });
      expect(isTestModeRequest(req)).toBe(true);
    });

    it('should return true when X-Test-Mode is TRUE (case insensitive)', () => {
      const req = createMockRequest({ 'X-Test-Mode': 'TRUE' });
      expect(isTestModeRequest(req)).toBe(true);
    });

    it('should return false when X-Test-Mode is false', () => {
      const req = createMockRequest({ 'X-Test-Mode': 'false' });
      expect(isTestModeRequest(req)).toBe(false);
    });

    it('should return false when X-Test-Mode is not present', () => {
      const req = createMockRequest({});
      expect(isTestModeRequest(req)).toBe(false);
    });

    it('should return false for invalid values', () => {
      const req = createMockRequest({ 'X-Test-Mode': 'yes' });
      expect(isTestModeRequest(req)).toBe(false);
    });
  });

  describe('buildTestModeHeaders', () => {
    it('should return empty object when not in test mode', () => {
      const context = {
        isTestMode: false,
        sessionId: null,
        sessionStarted: null,
        rateLimitBucket: 'production',
      };
      const headers = buildTestModeHeaders(context);
      expect(headers).toEqual({});
    });

    it('should return test mode header when in test mode', () => {
      const context = {
        isTestMode: true,
        sessionId: null,
        sessionStarted: null,
        rateLimitBucket: 'test:unknown',
      };
      const headers = buildTestModeHeaders(context);
      expect(headers).toEqual({ 'X-Test-Mode': 'true' });
    });

    it('should include session ID when present', () => {
      const context = {
        isTestMode: true,
        sessionId: 'my-session',
        sessionStarted: Date.now(),
        rateLimitBucket: 'test:my-session',
      };
      const headers = buildTestModeHeaders(context);
      expect(headers).toEqual({
        'X-Test-Mode': 'true',
        'X-Test-Session-Id': 'my-session',
      });
    });
  });

  describe('checkTestModeRateLimit', () => {
    it('should allow requests and return remaining quota', async () => {
      const context = createMockContext();
      const result = await checkTestModeRateLimit('session-123', 'postsPerHour', context);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(TEST_MODE_RATE_LIMITS.postsPerHour);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should log rate limit check', async () => {
      const context = createMockContext();
      await checkTestModeRateLimit('session-abc', 'moderationCallsPerHour', context);

      expect(context.log).toHaveBeenCalledWith(
        '[testMode.rateLimit] Checking rate limit',
        expect.objectContaining({
          sessionId: 'session-abc',
          operation: 'moderationCallsPerHour',
          limit: TEST_MODE_RATE_LIMITS.moderationCallsPerHour,
        })
      );
    });

    it('should work for all operation types', async () => {
      const context = createMockContext();
      const operations: (keyof typeof TEST_MODE_RATE_LIMITS)[] = [
        'postsPerHour',
        'moderationCallsPerHour',
        'feedRequestsPerHour',
        'totalCallsPerHour',
      ];

      for (const op of operations) {
        const result = await checkTestModeRateLimit('session-test', op, context);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(TEST_MODE_RATE_LIMITS[op]);
      }
    });

    it('should return reset time approximately 1 hour in future', async () => {
      const context = createMockContext();
      const before = Date.now();
      const result = await checkTestModeRateLimit('session-time', 'postsPerHour', context);
      const after = Date.now();

      // Reset should be ~1 hour (3600000ms) in the future
      expect(result.resetAt).toBeGreaterThanOrEqual(before + 3600000);
      expect(result.resetAt).toBeLessThanOrEqual(after + 3600000);
    });
  });
});

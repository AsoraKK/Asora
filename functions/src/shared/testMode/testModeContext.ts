/**
 * Test Mode Context
 * 
 * Server-side enforcement for Live Test Mode.
 * Ensures test data is isolated from production feeds and analytics.
 * 
 * CRITICAL: This is NOT optional. Test data must NEVER pollute:
 * - Public feeds
 * - Ranking/recommendation signals
 * - Analytics funnels
 * - Moderation training data
 */

import type { HttpRequest, InvocationContext } from '@azure/functions';

/**
 * Test mode context extracted from request headers
 */
export interface TestModeContext {
  /** Whether this is a test mode request */
  isTestMode: boolean;
  
  /** Unique session ID for grouping test data */
  sessionId: string | null;
  
  /** When the test session started */
  sessionStarted: number | null;
  
  /** Rate limit bucket for test mode */
  rateLimitBucket: string;
}

/**
 * Rate limits for test mode (per session per hour)
 */
export const TEST_MODE_RATE_LIMITS = {
  /** Max posts per test session per hour */
  postsPerHour: 50,
  
  /** Max moderation API calls per test session per hour */
  moderationCallsPerHour: 100,
  
  /** Max feed requests per test session per hour */
  feedRequestsPerHour: 200,
  
  /** Max total API calls per test session per hour */
  totalCallsPerHour: 500,
} as const;

/**
 * Headers for test mode requests
 */
export const TEST_MODE_HEADERS = {
  /** Primary test mode indicator */
  TEST_MODE: 'X-Test-Mode',
  
  /** Test session ID for grouping */
  SESSION_ID: 'X-Test-Session-Id',
  
  /** Session start timestamp */
  SESSION_STARTED: 'X-Test-Session-Started',
} as const;

/**
 * Extract test mode context from request headers
 * 
 * @param req - Azure Functions HTTP request
 * @param context - Invocation context for logging
 * @returns Test mode context
 */
export function extractTestModeContext(
  req: HttpRequest,
  context?: InvocationContext
): TestModeContext {
  const testModeHeader = req.headers.get(TEST_MODE_HEADERS.TEST_MODE);
  const sessionId = req.headers.get(TEST_MODE_HEADERS.SESSION_ID);
  const sessionStarted = req.headers.get(TEST_MODE_HEADERS.SESSION_STARTED);

  const isTestMode = testModeHeader?.toLowerCase() === 'true';

  if (isTestMode && context) {
    context.log('[testMode] Request marked as test mode', {
      sessionId,
      sessionStarted,
    });
  }

  return {
    isTestMode,
    sessionId: isTestMode ? sessionId : null,
    sessionStarted: isTestMode && sessionStarted ? parseInt(sessionStarted, 10) : null,
    rateLimitBucket: isTestMode && sessionId ? `test:${sessionId}` : 'production',
  };
}

/**
 * Check if request is in test mode
 */
export function isTestModeRequest(req: HttpRequest): boolean {
  return req.headers.get(TEST_MODE_HEADERS.TEST_MODE)?.toLowerCase() === 'true';
}

/**
 * Build headers to pass test mode context to downstream services (e.g., Hive AI)
 */
export function buildTestModeHeaders(testContext: TestModeContext): Record<string, string> {
  if (!testContext.isTestMode) {
    return {};
  }

  return {
    'X-Test-Mode': 'true',
    ...(testContext.sessionId && { 'X-Test-Session-Id': testContext.sessionId }),
  };
}

/**
 * Auto-expiry configuration for test data
 */
export const TEST_DATA_EXPIRY = {
  /** Default TTL for test posts in milliseconds (24 hours) */
  defaultTtlMs: 24 * 60 * 60 * 1000,
  
  /** Maximum TTL for test posts in milliseconds (48 hours) */
  maxTtlMs: 48 * 60 * 60 * 1000,
  
  /** Calculate expiry timestamp */
  getExpiryTimestamp: (createdAt: number = Date.now()): number => {
    return createdAt + TEST_DATA_EXPIRY.defaultTtlMs;
  },
} as const;

/**
 * Validate test session hasn't exceeded rate limits
 * Returns remaining quota or throws if exceeded
 */
export async function checkTestModeRateLimit(
  sessionId: string,
  operation: keyof typeof TEST_MODE_RATE_LIMITS,
  context: InvocationContext
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  // TODO: Implement with Redis or Cosmos for distributed rate limiting
  // For now, log and allow (will be enforced in phase 2)
  context.log('[testMode.rateLimit] Checking rate limit', {
    sessionId,
    operation,
    limit: TEST_MODE_RATE_LIMITS[operation],
  });

  return {
    allowed: true,
    remaining: TEST_MODE_RATE_LIMITS[operation],
    resetAt: Date.now() + 3600000, // 1 hour
  };
}

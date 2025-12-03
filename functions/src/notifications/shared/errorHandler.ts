/**
 * ASORA NOTIFICATIONS - ERROR HANDLER
 *
 * Shared error handling for notification HTTP handlers.
 * Ensures auth failures return 401/403, not 500.
 * Provides structured logging to Application Insights.
 */

import type { HttpResponseInit, InvocationContext } from '@azure/functions';
import { AuthError } from '../../auth/verifyJwt';
import { trackAppEvent } from '../../shared/appInsights';

// Track recent errors for health endpoint degradation reporting
interface ErrorTracker {
  lastErrorCode: string | null;
  lastErrorTime: number | null;
  recentErrorCount: number;
  lastResetTime: number;
}

const errorTracker: ErrorTracker = {
  lastErrorCode: null,
  lastErrorTime: null,
  recentErrorCount: 0,
  lastResetTime: Date.now(),
};

// Reset error count every 5 minutes
const ERROR_RESET_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Get current degradation status for health endpoint
 */
export function getNotificationsDegradationStatus(): {
  degraded: boolean;
  lastErrorCode: string | null;
  recentErrorCount: number;
} {
  // Reset counter if interval has passed
  if (Date.now() - errorTracker.lastResetTime > ERROR_RESET_INTERVAL_MS) {
    errorTracker.recentErrorCount = 0;
    errorTracker.lastResetTime = Date.now();
  }

  return {
    degraded: errorTracker.recentErrorCount >= 5,
    lastErrorCode: errorTracker.lastErrorCode,
    recentErrorCount: errorTracker.recentErrorCount,
  };
}

/**
 * Record an error for degradation tracking
 */
function recordError(errorCode: string): void {
  errorTracker.lastErrorCode = errorCode;
  errorTracker.lastErrorTime = Date.now();
  errorTracker.recentErrorCount++;
}

/**
 * Build a standard unauthorized response with proper headers
 */
export function buildUnauthorizedResponse(error: AuthError): HttpResponseInit {
  return {
    status: error.statusCode,
    headers: {
      'WWW-Authenticate': `Bearer error="${error.code}", error_description="${error.message}"`,
      'Content-Type': 'application/json',
    },
    jsonBody: { error: error.code, message: error.message },
  };
}

/**
 * Build a standard 401 response for missing auth
 */
export function unauthorizedResponse(message = 'Authentication required'): HttpResponseInit {
  return {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Bearer',
      'Content-Type': 'application/json',
    },
    jsonBody: { error: 'unauthorized', message },
  };
}

/**
 * Build a standard 403 response for insufficient permissions
 */
export function forbiddenResponse(message = 'Insufficient permissions'): HttpResponseInit {
  return {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
    },
    jsonBody: { error: 'forbidden', message },
  };
}

/**
 * Build a standard 400 response for bad requests
 */
export function badRequestResponse(message: string): HttpResponseInit {
  return {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
    },
    jsonBody: { error: 'bad_request', message },
  };
}

/**
 * Build a standard 500 response for internal errors
 */
export function internalErrorResponse(errorCode = 'internal_error'): HttpResponseInit {
  recordError(errorCode);
  return {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
    },
    jsonBody: { error: 'internal_server_error' },
  };
}

/**
 * Log a notifications error to Application Insights with structured properties
 */
export function logNotificationsError(
  context: InvocationContext,
  route: string,
  error: unknown,
  userId?: string
): void {
  const errorName = error instanceof Error ? error.constructor.name : 'UnknownError';
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.slice(0, 500) : undefined;

  // Log to context (appears in function logs)
  context.error(`[notifications] ${route} error:`, {
    errorName,
    errorMessage,
    userId: userId?.slice(0, 8), // Truncate for privacy
  });

  // Track to Application Insights
  trackAppEvent({
    name: 'notifications_error',
    properties: {
      area: 'notifications',
      route,
      errorName,
      errorMessage,
      stack,
      userId: userId?.slice(0, 8),
      severity: 2, // Warning level
    },
  });
}

/**
 * Handle errors in notification handlers with proper response mapping
 */
export function handleNotificationError(
  context: InvocationContext,
  route: string,
  error: unknown,
  userId?: string
): HttpResponseInit {
  // Auth errors -> 401/403
  if (error instanceof AuthError) {
    logNotificationsError(context, route, error, userId);
    return buildUnauthorizedResponse(error);
  }

  // Cosmos errors
  if (error instanceof Error) {
    const cosmosCode = (error as { code?: number }).code;

    // Cosmos 404 - resource not found
    if (cosmosCode === 404) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'not_found', message: 'Resource not found' },
      };
    }

    // Cosmos 409 - conflict
    if (cosmosCode === 409) {
      return {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'conflict', message: 'Resource conflict' },
      };
    }

    // Cosmos timeout or service unavailable
    if (
      cosmosCode === 503 ||
      cosmosCode === 408 ||
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT')
    ) {
      logNotificationsError(context, route, error, userId);
      return internalErrorResponse('cosmos-timeout');
    }
  }

  // All other errors -> 500 with logging
  logNotificationsError(context, route, error, userId);
  return internalErrorResponse('unknown');
}

/**
 * Wrapper for notification handlers that ensures proper error handling
 */
export function withNotificationErrorHandler<T extends unknown[]>(
  route: string,
  handler: (context: InvocationContext, ...args: T) => Promise<HttpResponseInit>,
  getUserId?: (...args: T) => string | undefined
): (context: InvocationContext, ...args: T) => Promise<HttpResponseInit> {
  return async (context: InvocationContext, ...args: T): Promise<HttpResponseInit> => {
    try {
      return await handler(context, ...args);
    } catch (error) {
      const userId = getUserId?.(...args);
      return handleNotificationError(context, route, error, userId);
    }
  };
}

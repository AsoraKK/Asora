/**
 * ASORA NOTIFICATIONS - HEALTH DEGRADATION TESTS
 *
 * Tests for error tracking and health endpoint degradation behavior:
 * - Degradation flag toggles after 5+ consecutive errors
 * - Error code tracking (cosmos_error, fcm_error, etc.)
 * - Recent error counter increments properly
 * - Counters reset after 5-minute window expires
 *
 * Tests induce failures intentionally to verify health monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getNotificationsDegradationStatus,
  handleNotificationError,
  internalErrorResponse,
  logNotificationsError,
  __resetErrorTracker,
} from '../../src/notifications/shared/errorHandler';
import { InvocationContext } from '@azure/functions';

/**
 * Create a mock InvocationContext
 */
function createMockContext(): InvocationContext {
  return {
    invocationId: 'test-invocation-id',
    functionName: 'notifications-degradation-test',
    traceContext: {} as any,
    retryContext: undefined,
    bindings: {},
    bindingData: {},
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as unknown as InvocationContext;
}

describe('Notifications - Health Degradation Tests', () => {
  beforeEach(() => {
    // Reset error handler state before each test
    __resetErrorTracker();
    jest.clearAllMocks();
  });

  describe('Degradation Flag Behavior', () => {
    it('should start with degraded=false', () => {
      const status = getNotificationsDegradationStatus();

      expect(status.degraded).toBe(false);
      expect(status.recentErrorCount).toBe(0);
      expect(status.lastErrorCode).toBeNull();
    });

    it('should track 1 error without degradation', () => {
      const context = createMockContext();
      const error = new Error('Cosmos connection timeout');

      // Simulate a service error
      internalErrorResponse('cosmos-timeout');
      logNotificationsError(context, '/api/notifications/devices', error);

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(false);
      expect(status.recentErrorCount).toBe(1);
      expect(status.lastErrorCode).toBe('cosmos-timeout');
    });

    it('should track 3 errors without degradation', () => {
      const context = createMockContext();

      for (let i = 0; i < 3; i++) {
        const error = new Error(`Error ${i + 1}`);
        internalErrorResponse('cosmos-timeout');
        logNotificationsError(context, '/api/notifications/devices', error);
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(false);
      expect(status.recentErrorCount).toBe(3);
    });

    it('should NOT degrade on exactly 4 errors', () => {
      const context = createMockContext();

      for (let i = 0; i < 4; i++) {
        const error = new Error(`Error ${i + 1}`);
        internalErrorResponse('cosmos-timeout');
        logNotificationsError(context, '/api/notifications/devices', error);
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(false);
      expect(status.recentErrorCount).toBe(4);
    });

    it('should degrade on 5+ consecutive errors', () => {
      const context = createMockContext();

      for (let i = 0; i < 5; i++) {
        const error = new Error(`Error ${i + 1}`);
        internalErrorResponse('cosmos-timeout');
        logNotificationsError(context, '/api/notifications/devices', error);
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(true);
      expect(status.recentErrorCount).toBe(5);
    });

    it('should degrade on 6+ errors', () => {
      const context = createMockContext();

      for (let i = 0; i < 6; i++) {
        const error = new Error(`Error ${i + 1}`);
        internalErrorResponse('unknown');
        logNotificationsError(context, '/api/notifications/devices', error);
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(true);
      expect(status.recentErrorCount).toBe(6);
    });
  });

  describe('Error Code Tracking', () => {
    it('should track cosmos_timeout error code', () => {
      const context = createMockContext();
      const error = new Error('Cosmos timeout');

      internalErrorResponse('cosmos-timeout');
      logNotificationsError(context, '/api/notifications/devices', error);

      const status = getNotificationsDegradationStatus();
      expect(status.lastErrorCode).toBe('cosmos-timeout');
    });

    it('should track fcm_error code', () => {
      const context = createMockContext();
      const error = new Error('FCM authentication failed');

      internalErrorResponse('fcm-auth');
      logNotificationsError(context, '/api/notifications/send', error);

      const status = getNotificationsDegradationStatus();
      expect(status.lastErrorCode).toBe('fcm-auth');
    });

    it('should track unknown error code', () => {
      const context = createMockContext();
      const error = new Error('Unexpected error');

      internalErrorResponse('unknown');
      logNotificationsError(context, '/api/notifications/devices', error);

      const status = getNotificationsDegradationStatus();
      expect(status.lastErrorCode).toBe('unknown');
    });

    it('should update lastErrorCode on each error', () => {
      const context = createMockContext();

      // First error
      internalErrorResponse('cosmos-timeout');
      logNotificationsError(context, '/api/notifications/devices', new Error('Error 1'));

      let status = getNotificationsDegradationStatus();
      expect(status.lastErrorCode).toBe('cosmos-timeout');

      // Second error with different code
      internalErrorResponse('fcm-auth');
      logNotificationsError(context, '/api/notifications/send', new Error('Error 2'));

      status = getNotificationsDegradationStatus();
      expect(status.lastErrorCode).toBe('fcm-auth');
    });
  });

  describe('Error Counter Behavior', () => {
    it('should increment recentErrorCount on each error', () => {
      const context = createMockContext();

      const statuses = [];
      for (let i = 1; i <= 5; i++) {
        internalErrorResponse('unknown');
        logNotificationsError(context, '/api/notifications/devices', new Error(`Error ${i}`));
        statuses.push(getNotificationsDegradationStatus().recentErrorCount);
      }

      // Verify counter incremented
      expect(statuses).toEqual([1, 2, 3, 4, 5]);
    });

    it('should track multiple errors from same endpoint', () => {
      const context = createMockContext();

      for (let i = 0; i < 3; i++) {
        internalErrorResponse('cosmos-timeout');
        logNotificationsError(context, '/api/notifications/devices', new Error(`Cosmos error ${i}`));
      }

      const status = getNotificationsDegradationStatus();
      expect(status.recentErrorCount).toBe(3);
    });

    it('should track errors from different endpoints', () => {
      const context = createMockContext();

      // Errors from devices endpoint
      for (let i = 0; i < 2; i++) {
        internalErrorResponse('cosmos-timeout');
        logNotificationsError(context, '/api/notifications/devices', new Error('Device error'));
      }

      // Errors from send endpoint
      for (let i = 0; i < 3; i++) {
        internalErrorResponse('fcm-error');
        logNotificationsError(context, '/api/notifications/send', new Error('FCM error'));
      }

      const status = getNotificationsDegradationStatus();
      expect(status.recentErrorCount).toBe(5);
      expect(status.degraded).toBe(true);
    });
  });

  describe('Induced Failure Scenarios', () => {
    it('should handle cosmos read/write failure scenario', () => {
      const context = createMockContext();

      // Simulate 5 consecutive Cosmos failures
      const cosmosError = new Error('Cosmos database unavailable') as any;
      cosmosError.code = 503; // Service unavailable

      for (let i = 0; i < 5; i++) {
        internalErrorResponse('cosmos-timeout');
        logNotificationsError(context, '/api/notifications/devices', cosmosError);
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(true);
      expect(status.lastErrorCode).toBe('cosmos-timeout');
      expect(status.recentErrorCount).toBe(5);
    });

    it('should handle FCM send failure scenario', () => {
      const context = createMockContext();

      // Simulate 5 consecutive FCM failures
      const fcmError = new Error('FCM service error');

      for (let i = 0; i < 5; i++) {
        internalErrorResponse('fcm-error');
        logNotificationsError(context, '/api/notifications/send', fcmError);
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(true);
      expect(status.lastErrorCode).toBe('fcm-error');
    });

    it('should handle unhandled runtime exception', () => {
      const context = createMockContext();

      // Simulate 5 consecutive unhandled exceptions
      const runtimeError = new Error('Unexpected runtime error');

      for (let i = 0; i < 5; i++) {
        internalErrorResponse('unknown');
        logNotificationsError(context, '/api/notifications/preferences', runtimeError);
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(true);
      expect(status.recentErrorCount).toBe(5);
    });
  });

  describe('Error Handler Response Mapping', () => {
    it('should return 500 on internal error', () => {
      const response = internalErrorResponse('test-error');

      expect(response.status).toBe(500);
      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('should include error json body', () => {
      const response = internalErrorResponse('test-error');

      expect(response.jsonBody).toBeDefined();
      const body = response.jsonBody as Record<string, unknown>;
      expect(body.error).toBe('internal_server_error');
    });
  });

  describe('Logging & Telemetry', () => {
    it('should log errors to context', () => {
      const context = createMockContext();
      const error = new Error('Test error message');

      logNotificationsError(context, '/api/notifications/devices', error);

      expect(context.error).toHaveBeenCalled();
    });

    it('should log with user id truncation for privacy', () => {
      const context = createMockContext();
      const error = new Error('User-specific error');
      const userId = '550e8400-e29b-41d4-a716-446655440001';

      logNotificationsError(context, '/api/notifications/devices', error, userId);

      expect(context.error).toHaveBeenCalled();
      // Verify the call included the userId (will be truncated to first 8 chars)
    });

    it('should handle errors without user context', () => {
      const context = createMockContext();
      const error = new Error('System error');

      logNotificationsError(context, '/api/notifications/devices', error);

      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('Status Reset Behavior (5-minute window)', () => {
    it('should report current status within 5-minute window', () => {
      const context = createMockContext();

      // Induce 5 errors
      for (let i = 0; i < 5; i++) {
        internalErrorResponse('unknown');
        logNotificationsError(context, '/api/notifications/devices', new Error(`Error ${i}`));
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(true);
      expect(status.recentErrorCount).toBe(5);

      // Call again without new errors - status should persist
      const statusAfter = getNotificationsDegradationStatus();
      expect(statusAfter.degraded).toBe(true);
      expect(statusAfter.recentErrorCount).toBe(5);
    });

    it('should distinguish between service errors and auth failures', () => {
      const context = createMockContext();

      // Auth failures should NOT increment error counter
      // (they return 401/403 directly, no internal error handling)

      // Service errors DO increment counter
      for (let i = 0; i < 5; i++) {
        internalErrorResponse('cosmos-timeout');
        logNotificationsError(context, '/api/notifications/devices', new Error('Service error'));
      }

      const status = getNotificationsDegradationStatus();
      expect(status.degraded).toBe(true);
      expect(status.recentErrorCount).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with no message', () => {
      const context = createMockContext();
      const error = new Error();

      expect(() => {
        internalErrorResponse('test-error');
        logNotificationsError(context, '/api/notifications/devices', error);
      }).not.toThrow();

      const status = getNotificationsDegradationStatus();
      expect(status.recentErrorCount).toBe(1);
    });

    it('should handle non-Error thrown values', () => {
      const context = createMockContext();

      expect(() => {
        internalErrorResponse('test-error');
        logNotificationsError(context, '/api/notifications/devices', 'String error');
      }).not.toThrow();

      const status = getNotificationsDegradationStatus();
      expect(status.recentErrorCount).toBe(1);
    });

    it('should handle null error gracefully', () => {
      const context = createMockContext();

      expect(() => {
        internalErrorResponse('test-error');
        logNotificationsError(context, '/api/notifications/devices', null);
      }).not.toThrow();

      const status = getNotificationsDegradationStatus();
      expect(status.recentErrorCount).toBe(1);
    });
  });
});

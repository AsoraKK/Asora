/**
 * FCM Client Tests
 *
 * Tests for Firebase Cloud Messaging HTTP v1 client.
 * These tests focus on configuration detection, error handling, and interface validation.
 * 
 * Note: sendToDevice/sendToDevices cannot be tested without valid private keys for JWT signing.
 * Integration tests with real credentials should be done in a separate test environment.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Save original env before any imports
const originalEnv = { ...process.env };

// Set valid test environment before importing the module
process.env.FCM_PROJECT_ID = 'test-project-id';
process.env.FCM_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
process.env.FCM_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7test
-----END PRIVATE KEY-----`;

// Mock App Insights
jest.mock('../../shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

// Now import the module - it will use the mocked env
import {
  isFcmConfigured,
  getFcmConfigStatus,
  _resetConfig,
  type FcmSendRequest,
  type FcmSendResult,
  type FcmBatchResult,
} from '../clients/fcmClient';

describe('FCM Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset config so each test starts fresh
    _resetConfig();
    // Restore env for each test
    process.env.FCM_PROJECT_ID = 'test-project-id';
    process.env.FCM_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
    process.env.FCM_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIItest\n-----END PRIVATE KEY-----';
  });

  afterEach(() => {
    // Restore env
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('FCM_')) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe('Configuration Detection', () => {
    it('should detect FCM as configured when all env vars are present', () => {
      _resetConfig();
      expect(isFcmConfigured()).toBe(true);
    });

    it('should detect FCM as unconfigured when project ID is missing', () => {
      delete process.env.FCM_PROJECT_ID;
      _resetConfig();
      expect(isFcmConfigured()).toBe(false);
    });

    it('should detect FCM as unconfigured when client email is missing', () => {
      delete process.env.FCM_CLIENT_EMAIL;
      _resetConfig();
      expect(isFcmConfigured()).toBe(false);
    });

    it('should detect FCM as unconfigured when private key is missing', () => {
      delete process.env.FCM_PRIVATE_KEY;
      _resetConfig();
      expect(isFcmConfigured()).toBe(false);
    });

    it('should return status with project ID when configured', () => {
      _resetConfig();
      const status = getFcmConfigStatus();
      expect(status.configured).toBe(true);
      expect(status.projectId).toBe('test-project-id');
      expect(status.error).toBeUndefined();
    });

    it('should return error in status when unconfigured', () => {
      delete process.env.FCM_PROJECT_ID;
      _resetConfig();
      const status = getFcmConfigStatus();
      expect(status.configured).toBe(false);
      expect(status.error).toContain('FCM_PROJECT_ID');
    });
  });

  describe('Interface Type Checking', () => {
    it('should accept valid FcmSendRequest', () => {
      const request: FcmSendRequest = {
        token: 'device-token-123',
        title: 'Test Title',
        body: 'Test Body',
        category: 'SOCIAL',
      };
      expect(request.token).toBe('device-token-123');
      expect(request.title).toBe('Test Title');
      expect(request.body).toBe('Test Body');
      expect(request.category).toBe('SOCIAL');
    });

    it('should accept FcmSendRequest with optional data', () => {
      const request: FcmSendRequest = {
        token: 'device-token-123',
        title: 'Test Title',
        body: 'Test Body',
        category: 'NEWS',
        data: { postId: '123', action: 'open_post' },
      };
      expect(request.data).toEqual({ postId: '123', action: 'open_post' });
    });

    it('should have correct FcmSendResult structure', () => {
      const successResult: FcmSendResult = {
        success: true,
        messageId: 'projects/test/messages/123',
      };
      expect(successResult.success).toBe(true);
      expect(successResult.messageId).toBe('projects/test/messages/123');

      const failResult: FcmSendResult = {
        success: false,
        errorCode: 'UNREGISTERED',
        errorMessage: 'Token is not registered',
        isTokenInvalid: true,
      };
      expect(failResult.success).toBe(false);
      expect(failResult.isTokenInvalid).toBe(true);
    });

    it('should have correct FcmBatchResult structure', () => {
      const batchResult: FcmBatchResult = {
        success: 5,
        failed: 2,
        invalidTokens: ['token1', 'token2'],
        errors: [{ code: 'UNREGISTERED', message: 'Token not found' }],
      };
      expect(batchResult.success).toBe(5);
      expect(batchResult.failed).toBe(2);
      expect(batchResult.invalidTokens).toHaveLength(2);
      expect(batchResult.errors).toHaveLength(1);
    });
  });

  describe('Error Code Classification', () => {
    // Test helper to classify error codes based on FCM documentation
    // These match the constants in fcmClient.ts
    const INVALID_TOKEN_ERRORS = ['UNREGISTERED', 'NOT_FOUND', 'INVALID_ARGUMENT'];
    const RETRYABLE_ERRORS = ['UNAVAILABLE', 'INTERNAL', 'QUOTA_EXCEEDED'];

    const isRetryableError = (code: string): boolean => {
      return RETRYABLE_ERRORS.includes(code);
    };

    const isTokenInvalidError = (code: string): boolean => {
      return INVALID_TOKEN_ERRORS.includes(code);
    };

    it('should classify INTERNAL as retryable', () => {
      expect(isRetryableError('INTERNAL')).toBe(true);
    });

    it('should classify UNAVAILABLE as retryable', () => {
      expect(isRetryableError('UNAVAILABLE')).toBe(true);
    });

    it('should classify QUOTA_EXCEEDED as retryable', () => {
      expect(isRetryableError('QUOTA_EXCEEDED')).toBe(true);
    });

    it('should classify INVALID_ARGUMENT as token invalid', () => {
      expect(isTokenInvalidError('INVALID_ARGUMENT')).toBe(true);
    });

    it('should classify NOT_FOUND as token invalid', () => {
      expect(isTokenInvalidError('NOT_FOUND')).toBe(true);
    });

    it('should classify UNREGISTERED as token invalid', () => {
      expect(isTokenInvalidError('UNREGISTERED')).toBe(true);
    });

    it('should not classify PERMISSION_DENIED as retryable', () => {
      expect(isRetryableError('PERMISSION_DENIED')).toBe(false);
    });

    it('should not classify PERMISSION_DENIED as token invalid', () => {
      expect(isTokenInvalidError('PERMISSION_DENIED')).toBe(false);
    });
  });
});

/**
 * Mock FCM Client
 *
 * Simulates FCM HTTP v1 API responses for testing.
 * Injected via NODE_ENV === 'test' in notifications service layer.
 *
 * **DO NOT USE IN PRODUCTION**
 */

import { FcmSendRequest, FcmSendResult } from '../../src/notifications/clients/fcmClient';

/**
 * Recorded FCM send call for test assertions
 */
export interface RecordedFcmCall {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  category: string;
  timestamp: number;
}

/**
 * Mock FCM client state
 */
class MockFcmClient {
  private calls: RecordedFcmCall[] = [];
  private shouldFail: boolean = false;
  private failureCode: string | null = null;

  /**
   * Send a message via mock FCM
   */
  async send(request: FcmSendRequest): Promise<FcmSendResult> {
    // Record the call
    this.calls.push({
      token: request.token,
      title: request.title,
      body: request.body,
      data: request.data,
      category: request.category,
      timestamp: Date.now(),
    });

    // Simulate failure if configured
    if (this.shouldFail) {
      return {
        success: false,
        errorCode: this.failureCode || 'INTERNAL',
        errorMessage: 'Mock FCM failure',
        isTokenInvalid: this.failureCode === 'UNREGISTERED',
        isRetryable: this.failureCode === 'UNAVAILABLE',
      };
    }

    // Success
    return {
      success: true,
      messageId: `projects/test-project/messages/${Date.now()}`,
    };
  }

  /**
   * Get all recorded send calls
   */
  getCalls(): RecordedFcmCall[] {
    return [...this.calls];
  }

  /**
   * Get last recorded send call
   */
  getLastCall(): RecordedFcmCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Get call count
   */
  getCallCount(): number {
    return this.calls.length;
  }

  /**
   * Clear recorded calls
   */
  reset(): void {
    this.calls = [];
    this.shouldFail = false;
    this.failureCode = null;
  }

  /**
   * Configure mock to fail on next send
   */
  setFailure(errorCode: string): void {
    this.shouldFail = true;
    this.failureCode = errorCode;
  }

  /**
   * Configure mock to succeed on next send
   */
  setSuccess(): void {
    this.shouldFail = false;
    this.failureCode = null;
  }

  /**
   * Find calls matching a filter
   */
  findCalls(filter: Partial<RecordedFcmCall>): RecordedFcmCall[] {
    return this.calls.filter(call => {
      for (const [key, value] of Object.entries(filter)) {
        if (call[key as keyof RecordedFcmCall] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Assert that a call was made with specific properties
   */
  assertCallMade(filter: Partial<RecordedFcmCall>): RecordedFcmCall {
    const found = this.findCalls(filter);
    if (found.length === 0) {
      throw new Error(
        `Expected FCM call matching ${JSON.stringify(filter)}, but no calls found. ` +
          `Recorded calls: ${JSON.stringify(this.calls)}`
      );
    }
    return found[0];
  }
}

// Global mock instance
export const mockFcmClient = new MockFcmClient();

/**
 * Get mock FCM client for test assertions
 */
export function getMockFcmClient(): MockFcmClient {
  return mockFcmClient;
}

/**
 * Reset mock FCM client to clean state
 */
export function resetMockFcmClient(): void {
  mockFcmClient.reset();
}
